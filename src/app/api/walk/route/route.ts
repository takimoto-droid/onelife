import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// モックルートデータ（実際はGoogle Directions APIを使用）
const ROUTE_TEMPLATES = [
  {
    type: 'park',
    names: ['公園コース', '緑道コース', 'のんびりコース'],
    descriptions: [
      '近くの公園を巡る定番コース。木陰が多くて涼しい。',
      '緑道沿いを歩く気持ちいいコース。他のワンちゃんにも会えるかも。',
      '静かな住宅街を通るのんびりコース。落ち着いて歩けます。',
    ],
  },
  {
    type: 'active',
    names: ['アクティブコース', 'チャレンジコース', '坂道コース'],
    descriptions: [
      '少し長めのルートで運動不足解消に。',
      '適度なアップダウンがあるコース。いい運動になります。',
      '坂道を含むルート。足腰の強化に。',
    ],
  },
  {
    type: 'quick',
    names: ['サクッとコース', '駅前コース', '商店街コース'],
    descriptions: [
      '短時間でサクッと回れるコース。忙しい日に。',
      '駅前を通る便利なコース。買い物ついでにも。',
      '商店街を通るにぎやかコース。社会化にも◎',
    ],
  },
];

const WAYPOINT_TEMPLATES = [
  ['スタート地点', '〇〇公園', '△△通り', 'スタート地点に戻る'],
  ['スタート地点', '□□緑道入口', '緑道沿い', '××交差点', 'スタート地点に戻る'],
  ['スタート地点', '◇◇商店街', '▽▽神社', 'スタート地点に戻る'],
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { durationMinutes } = await request.json();

    // 歩行速度 4km/h で計算
    const walkingSpeedMPerMin = (4 * 1000) / 60; // 約66m/分
    const targetDistanceM = Math.round(walkingSpeedMPerMin * durationMinutes);

    // ルートを生成（モック）
    const routes = ROUTE_TEMPLATES.map((template, index) => {
      const variation = Math.random() * 0.2 - 0.1; // -10% ~ +10%
      const adjustedDistance = Math.round(targetDistanceM * (1 + variation));
      const adjustedTime = Math.round(durationMinutes * (1 + variation));

      return {
        id: `route-${Date.now()}-${index}`,
        name: template.names[Math.floor(Math.random() * template.names.length)],
        estimatedMinutes: adjustedTime,
        distanceM: adjustedDistance,
        description: template.descriptions[Math.floor(Math.random() * template.descriptions.length)],
        waypoints: WAYPOINT_TEMPLATES[index % WAYPOINT_TEMPLATES.length],
      };
    });

    return NextResponse.json({ routes });
  } catch (error) {
    console.error('Walk route error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
