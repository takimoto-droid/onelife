import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { cancelSubscriptionImmediately } from '@/lib/stripe';

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

    // 既に解約済みの場合
    if (user.subscriptionStatus === 'canceled' || !user.isPremium) {
      return NextResponse.json(
        { error: '既に解約済みです' },
        { status: 400 }
      );
    }

    // Stripeで即時解約（サブスクリプションIDがある場合）
    if (user.subscriptionId) {
      const success = await cancelSubscriptionImmediately(user.subscriptionId);

      if (!success) {
        return NextResponse.json(
          { error: '解約処理に失敗しました' },
          { status: 500 }
        );
      }
    }

    // 即座にプレミアムステータスを無効化
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'canceled',
        isPremium: false,
        canceledAt: new Date(),
      },
    });

    return NextResponse.json({
      message: '解約が完了しました。プレミアム機能はご利用いただけなくなりました。',
      success: true,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
