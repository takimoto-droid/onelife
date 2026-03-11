import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const event = await constructWebhookEvent(body, signature);

    if (!event) {
      // モックモードまたはWebhook設定なし
      return NextResponse.json({ received: true });
    }

    console.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      // サブスクリプション作成
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = subscription as any;

        const updateData: Record<string, unknown> = {
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status === 'trialing' ? 'trialing' : 'active',
          isPremium: ['active', 'trialing'].includes(subscription.status),
        };

        // トライアル情報
        if (sub.trial_start) {
          updateData.trialStartDate = new Date(sub.trial_start * 1000);
        }
        if (sub.trial_end) {
          updateData.trialEndsAt = new Date(sub.trial_end * 1000);
        }

        // 課金期間
        if (sub.current_period_start) {
          updateData.billingStartDate = new Date(sub.current_period_start * 1000);
        }
        if (sub.current_period_end) {
          updateData.nextBillingDate = new Date(sub.current_period_end * 1000);
        }

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: updateData,
        });

        console.log(`Subscription created for customer: ${customerId}`);
        break;
      }

      // サブスクリプション更新
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = subscription as any;

        const status = subscription.status;
        let subscriptionStatus = 'free';
        let isPremium = false;

        if (status === 'trialing') {
          subscriptionStatus = 'trialing';
          isPremium = true;
        } else if (status === 'active') {
          subscriptionStatus = 'active';
          isPremium = true;
        } else if (status === 'past_due') {
          subscriptionStatus = 'past_due';
          isPremium = true; // 猶予期間中はまだ利用可能
        } else if (status === 'canceled' || status === 'unpaid') {
          subscriptionStatus = 'canceled';
          isPremium = false;
        }

        const updateData: Record<string, unknown> = {
          subscriptionId: subscription.id,
          subscriptionStatus,
          isPremium,
        };

        // トライアル情報
        if (sub.trial_end) {
          updateData.trialEndsAt = new Date(sub.trial_end * 1000);
        }

        // 次回請求日
        if (sub.current_period_end) {
          updateData.nextBillingDate = new Date(sub.current_period_end * 1000);
        }

        // キャンセル予約
        if (sub.cancel_at_period_end) {
          updateData.subscriptionStatus = 'canceling';
        }

        // キャンセル日時
        if (sub.canceled_at) {
          updateData.canceledAt = new Date(sub.canceled_at * 1000);
        }

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: updateData,
        });

        console.log(`Subscription updated for customer: ${customerId}, status: ${subscriptionStatus}`);
        break;
      }

      // サブスクリプション削除
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: 'canceled',
            isPremium: false,
            canceledAt: new Date(),
          },
        });

        console.log(`Subscription deleted for customer: ${customerId}`);
        break;
      }

      // 支払い成功
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inv = invoice as any;

        // 請求書が支払われたらアクティブに
        const updateData: Record<string, unknown> = {
          subscriptionStatus: 'active',
          isPremium: true,
        };

        // サブスクリプション情報がある場合は期間も更新
        if (inv.lines?.data?.[0]?.period) {
          const period = inv.lines.data[0].period;
          if (period.start) {
            updateData.billingStartDate = new Date(period.start * 1000);
          }
          if (period.end) {
            updateData.nextBillingDate = new Date(period.end * 1000);
          }
        }

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: updateData,
        });

        console.log(`Payment succeeded for customer: ${customerId}, subscription: ${inv.subscription || 'N/A'}`);
        break;
      }

      // 支払い失敗
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attemptCount = (invoice as any).attempt_count || 0;

        // 複数回失敗した場合のみステータスを変更
        if (attemptCount >= 3) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              subscriptionStatus: 'past_due',
              // まだプレミアムは維持（猶予期間）
            },
          });
        }

        console.log(`Payment failed for customer: ${customerId}, attempt: ${attemptCount}`);
        break;
      }

      // チェックアウト完了
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const email = session.customer_email || session.metadata?.userEmail;

        // ユーザーにStripe Customer IDを関連付け
        if (email) {
          await prisma.user.updateMany({
            where: { email },
            data: {
              stripeCustomerId: customerId,
              subscriptionStatus: 'trialing',
              isPremium: true,
              trialStartDate: new Date(),
              trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
          console.log(`Checkout completed for email: ${email}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
