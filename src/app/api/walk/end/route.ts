import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { walkId, durationMin, distanceM } = await request.json();

    if (!walkId) {
      return NextResponse.json(
        { error: '散歩IDが必要です' },
        { status: 400 }
      );
    }

    // 散歩履歴を更新
    await prisma.walkHistory.update({
      where: { id: walkId },
      data: {
        endedAt: new Date(),
        durationMin: durationMin || null,
        distanceM: distanceM || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Walk end error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
