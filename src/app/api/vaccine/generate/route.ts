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

    const { dogId } = await request.json();

    if (!dogId) {
      return NextResponse.json(
        { error: '犬のIDが必要です' },
        { status: 400 }
      );
    }

    // 犬の情報を取得
    const dog = await prisma.dog.findFirst({
      where: {
        id: dogId,
        userId: session.user.id,
      },
    });

    if (!dog) {
      return NextResponse.json(
        { error: '犬が見つかりません' },
        { status: 404 }
      );
    }

    // 既存のスケジュールを削除
    await prisma.vaccineSchedule.deleteMany({
      where: { dogId },
    });

    // スケジュールを生成
    const schedules = generateVaccineSchedule(dog.birthDate);

    // スケジュールを保存
    await prisma.vaccineSchedule.createMany({
      data: schedules.map((schedule) => ({
        dogId,
        type: schedule.type,
        scheduledDate: schedule.date,
      })),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vaccine generation error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

function generateVaccineSchedule(
  birthDate: Date | null
): { type: string; date: Date }[] {
  const schedules: { type: string; date: Date }[] = [];
  const now = new Date();
  const baseDate = birthDate || now;

  // 年齢を計算（月齢）
  const ageInMonths = birthDate
    ? Math.floor(
        (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      )
    : 12; // 誕生日不明なら1歳と仮定

  // 混合ワクチン
  if (ageInMonths < 4) {
    // 子犬: 8週、12週、16週
    const weeksSchedule = [8, 12, 16];
    weeksSchedule.forEach((weeks) => {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + weeks * 7);
      if (date > now) {
        schedules.push({ type: 'mixed_vaccine', date });
      }
    });
  } else {
    // 成犬: 1年後
    const nextMixed = new Date(now);
    nextMixed.setFullYear(nextMixed.getFullYear() + 1);
    schedules.push({ type: 'mixed_vaccine', date: nextMixed });
  }

  // 狂犬病ワクチン（生後91日以降、年1回）
  if (ageInMonths >= 3) {
    // 次の4月を計算（狂犬病の接種は通常4-6月）
    const rabiesDate = new Date(now);
    if (now.getMonth() >= 6) {
      // 7月以降なら来年の4月
      rabiesDate.setFullYear(rabiesDate.getFullYear() + 1);
    }
    rabiesDate.setMonth(3); // 4月
    rabiesDate.setDate(1);
    schedules.push({ type: 'rabies', date: rabiesDate });
  } else {
    // 生後91日になったら
    const rabiesDate = new Date(baseDate);
    rabiesDate.setDate(rabiesDate.getDate() + 91);
    if (rabiesDate < now) {
      // 既に過ぎている場合は来月
      rabiesDate.setMonth(now.getMonth() + 1);
    }
    schedules.push({ type: 'rabies', date: rabiesDate });
  }

  // 日付順にソート
  schedules.sort((a, b) => a.date.getTime() - b.date.getTime());

  return schedules;
}
