import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { cancelSubscription, getSubscription } from '@/lib/stripe';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // Apple課金の場合はApp Storeで解約が必要
    if (user.appleSubscriptionStatus && user.appleSubscriptionStatus !== 'expired') {
      return NextResponse.json(
        {
          error: 'App Store経由でご契約の場合、App Storeの設定から解約をお願いします。',
          provider: 'apple',
        },
        { status: 400 }
      );
    }

    if (!user.subscriptionId) {
      return NextResponse.json(
        { error: 'サブスクリプションが見つかりません' },
        { status: 404 }
      );
    }

    // 既に解約予約中の場合
    if (user.subscriptionStatus === 'canceling') {
      return NextResponse.json(
        { error: '既に解約予約されています' },
        { status: 400 }
      );
    }

    // Stripeで解約予約（期間終了時にキャンセル）
    const success = await cancelSubscription(user.subscriptionId);

    if (!success) {
      return NextResponse.json(
        { error: '解約処理に失敗しました' },
        { status: 500 }
      );
    }

    // サブスクリプション情報を取得して終了日を確認
    const subscriptionInfo = await getSubscription(user.subscriptionId);
    const endDate = subscriptionInfo?.currentPeriodEnd || null;

    // ステータスを「解約予約中」に更新
    // （実際の解約はWebhookで処理される）
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'canceling',
        canceledAt: new Date(),
        // プレミアムは期間終了まで維持
        // isPremium: true のまま
      },
    });

    return NextResponse.json({
      message: '解約予約が完了しました',
      endDate: endDate?.toISOString(),
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
