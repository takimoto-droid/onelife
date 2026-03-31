import { NextRequest, NextResponse } from 'next/server';


import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    

    if (false) { // Auth removed
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { routeId } = await request.json();

    // 犬を取得
    const dogs = await prisma.dog.findMany({
      where: { userId: "demo-user" },
    });

    if (dogs.length === 0) {
      return NextResponse.json(
        { error: '犬の情報が見つかりません' },
        { status: 404 }
      );
    }

    // 散歩履歴を作成
    const walkHistory = await prisma.walkHistory.create({
      data: {
        userId: "demo-user",
        dogId: dogs[0].id,
        startedAt: new Date(),
        routePolyline: routeId,
      },
    });

    return NextResponse.json({ walkId: walkHistory.id });
  } catch (error) {
    console.error('Walk start error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
