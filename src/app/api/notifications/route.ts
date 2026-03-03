import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ユーザーの犬を取得
    const dogs = await prisma.dog.findMany({
      where: { userId: session.user.id },
      include: {
        vaccineSchedules: {
          where: {
            completed: false,
          },
        },
      },
    });

    const notifications: {
      title: string;
      body: string;
      type: string;
      url: string;
    }[] = [];

    const now = new Date();
    const oneWeekLater = new Date(now);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const dog of dogs) {
      for (const schedule of dog.vaccineSchedules) {
        const scheduleDate = new Date(schedule.scheduledDate);

        // 1週間前の通知
        if (
          scheduleDate <= oneWeekLater &&
          scheduleDate > tomorrow &&
          !schedule.notifiedWeek
        ) {
          const vaccineType =
            schedule.type === 'rabies' ? '狂犬病ワクチン' : '混合ワクチン';

          notifications.push({
            title: `${dog.name}ちゃんのワクチン予定`,
            body: `${vaccineType}の予定日まであと1週間です。獣医さんへの予約はお済みですか？`,
            type: 'vaccine_week',
            url: '/vaccine',
          });

          // 通知済みフラグを更新
          await prisma.vaccineSchedule.update({
            where: { id: schedule.id },
            data: { notifiedWeek: true },
          });
        }

        // 前日の通知
        if (
          scheduleDate.toDateString() === tomorrow.toDateString() &&
          !schedule.notifiedDay
        ) {
          const vaccineType =
            schedule.type === 'rabies' ? '狂犬病ワクチン' : '混合ワクチン';

          notifications.push({
            title: `明日は${dog.name}ちゃんのワクチン！`,
            body: `${vaccineType}の予定日が明日です。お忘れなく！`,
            type: 'vaccine_day',
            url: '/vaccine',
          });

          // 通知済みフラグを更新
          await prisma.vaccineSchedule.update({
            where: { id: schedule.id },
            data: { notifiedDay: true },
          });
        }
      }
    }

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
