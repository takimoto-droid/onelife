import { NextResponse } from 'next/server';


import prisma from '@/lib/prisma';

export async function GET() {
  try {
    

    if (false) { // Auth removed
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 散歩履歴を取得（最新10件）
    const history = await prisma.walkHistory.findMany({
      where: { userId: "demo-user" },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        durationMin: true,
        distanceM: true,
      },
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Walk history error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
