import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// 決済方法タイプ
export type PaymentMethodType = 'card' | 'paypay';

// サブスクリプションステータス
export type SubscriptionStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'canceling'
  | 'canceled'
  | 'past_due'
  | 'unpaid';

/**
 * Stripe Checkoutセッションを作成
 * カード決済とPayPay決済に対応
 */
export async function createCheckoutSession(
  customerId: string,
  userEmail: string,
  successUrl: string,
  cancelUrl: string,
  paymentMethod: PaymentMethodType = 'card'
): Promise<{ url: string; sessionId?: string } | null> {
  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    // モックモード: 決済をスキップしてダッシュボードへ
    console.log('Stripe mock mode: Skipping to success URL');
    return { url: successUrl + '?mock=true' };
  }

  try {
    // Stripeチェックアウトセッションの設定
    // PayPayはStripeの日本向け決済方法として利用可能（有効化が必要）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionConfig: any = {
      customer: customerId || undefined,
      customer_email: !customerId ? userEmail : undefined,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userEmail,
        },
      },
      locale: 'ja',
      metadata: {
        userEmail,
        paymentMethod,
      },
    };

    // 決済方法の設定
    // PayPayはStripeダッシュボードで有効化が必要
    if (paymentMethod === 'card') {
      sessionConfig.payment_method_types = ['card'];
    }
    // PayPayを使用する場合は、payment_method_typesを指定せず
    // Stripeの自動決済方法選択を使用（ダッシュボードで設定）

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return { url: session.url || successUrl, sessionId: session.id };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return null;
  }
}

/**
 * Stripeカスタマーを作成
 */
export async function createCustomer(email: string, name?: string): Promise<string | null> {
  if (!stripe) {
    // モックモード: ランダムなIDを返す
    return `mock_cus_${Date.now()}`;
  }

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'wanlife_app',
      },
    });
    return customer.id;
  } catch (error) {
    console.error('Stripe customer creation error:', error);
    return null;
  }
}

/**
 * サブスクリプションをキャンセル
 */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  if (!stripe) {
    // モックモード: 成功を返す
    return true;
  }

  try {
    // 即時キャンセルではなく、期間終了時にキャンセル
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return true;
  } catch (error) {
    console.error('Stripe subscription cancellation error:', error);
    return false;
  }
}

/**
 * サブスクリプションを即時キャンセル（返金あり）
 */
export async function cancelSubscriptionImmediately(subscriptionId: string): Promise<boolean> {
  if (!stripe) {
    return true;
  }

  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return true;
  } catch (error) {
    console.error('Stripe subscription immediate cancellation error:', error);
    return false;
  }
}

/**
 * サブスクリプション情報を取得
 */
export async function getSubscription(subscriptionId: string): Promise<{
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
} | null> {
  if (!stripe) {
    return {
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      trialEnd: null,
    };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subscription as any;
    return {
      status: sub.status as SubscriptionStatus,
      currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end || false,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    };
  } catch (error) {
    console.error('Stripe subscription retrieval error:', error);
    return null;
  }
}

/**
 * Webhookイベントを検証・構築
 */
export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event | null> {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return null;
  }
}

/**
 * カスタマーポータルセッションを作成（サブスク管理用）
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string | null> {
  if (!stripe) {
    return returnUrl;
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  } catch (error) {
    console.error('Stripe portal session error:', error);
    return null;
  }
}

/**
 * 請求書一覧を取得
 */
export async function getInvoices(customerId: string, limit: number = 10): Promise<{
  id: string;
  amount: number;
  status: string;
  created: Date;
  pdfUrl: string | null;
}[]> {
  if (!stripe) {
    return [];
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_paid / 100, // Stripeは最小単位なので100で割る
      status: invoice.status || 'unknown',
      created: new Date(invoice.created * 1000),
      pdfUrl: invoice.invoice_pdf,
    }));
  } catch (error) {
    console.error('Stripe invoices retrieval error:', error);
    return [];
  }
}

export default stripe;
