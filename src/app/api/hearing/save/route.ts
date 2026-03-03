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

    const { dogId, breed, birthDate, adoptedAt, hasVisitedVet, mainConcern } =
      await request.json();

    if (!dogId) {
      return NextResponse.json(
        { error: '犬のIDが必要です' },
        { status: 400 }
      );
    }

    // 犬の情報を更新
    await prisma.dog.update({
      where: { id: dogId },
      data: {
        breed: breed || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        adoptedAt: adoptedAt ? new Date(adoptedAt) : null,
        hasVisitedVet: hasVisitedVet ?? null,
        mainConcern: mainConcern || null,
      },
    });

    // ユーザーのオンボーディングを完了にする
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboarded: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Hearing save error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
