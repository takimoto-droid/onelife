import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createCheckoutSession, createCustomer, PaymentMethodType } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // 既にプレミアム会員の場合
    if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
      return NextResponse.json({
        error: '既にプレミアム会員です',
        isPremium: true,
      }, { status: 400 });
    }

    // リクエストボディから決済方法を取得
    let paymentMethod: PaymentMethodType = 'card';
    try {
      const body = await request.json();
      if (body.paymentMethod === 'paypay') {
        paymentMethod = 'paypay';
      }
    } catch {
      // JSONパースに失敗した場合はデフォルトのカード決済
    }

    // Stripeカスタマーがなければ作成
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      customerId = await createCustomer(user.email);
      if (customerId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/premium?success=true`;
    const cancelUrl = `${baseUrl}/premium?canceled=true`;

    const checkoutSession = await createCheckoutSession(
      customerId || '',
      user.email,
      successUrl,
      cancelUrl,
      paymentMethod
    );

    if (!checkoutSession) {
      return NextResponse.json(
        { error: 'チェックアウトセッションの作成に失敗しました' },
        { status: 500 }
      );
    }

    // モックモードの場合はユーザーをプレミアムに更新
    if (checkoutSession.url.includes('mock=true')) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isPremium: true,
          subscriptionStatus: 'trialing',
          trialStartDate: new Date(),
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日後
          billingStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          nextBillingDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000), // トライアル後30日
        },
      });
      return NextResponse.json({
        success: true,
        url: successUrl,
        mock: true,
      });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

// GETリクエストの場合はリダイレクト
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/`);
  }

  // POSTと同じ処理を行う
  const response = await POST(request);
  const data = await response.json();

  if (data.url) {
    return NextResponse.redirect(data.url);
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${baseUrl}/premium?error=true`);
}
