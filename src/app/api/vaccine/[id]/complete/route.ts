import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;

    // スケジュールを取得して所有者を確認
    const schedule = await prisma.vaccineSchedule.findFirst({
      where: { id },
      include: {
        dog: true,
      },
    });

    if (!schedule || schedule.dog.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'スケジュールが見つかりません' },
        { status: 404 }
      );
    }

    // 完了にする
    await prisma.vaccineSchedule.update({
      where: { id },
      data: { completed: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vaccine complete error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
