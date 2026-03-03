import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { cancelSubscription } from '@/lib/stripe';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.subscriptionId) {
      return NextResponse.json(
        { error: 'サブスクリプションが見つかりません' },
        { status: 404 }
      );
    }

    const success = await cancelSubscription(user.subscriptionId);

    if (!success) {
      return NextResponse.json(
        { error: '解約処理に失敗しました' },
        { status: 500 }
      );
    }

    // ステータスを更新
    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: 'canceled' },
    });

    return NextResponse.json({ message: '解約が完了しました' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
