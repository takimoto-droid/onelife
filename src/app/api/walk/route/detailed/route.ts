import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 歩行速度（犬連れ想定、休憩含む）
const WALKING_SPEED_KM_PER_HOUR = 4;
const WALKING_SPEED_M_PER_MIN = (WALKING_SPEED_KM_PER_HOUR * 1000) / 60;

// モック目的地データ（実際はGoogle Places APIを使用）
const MOCK_DESTINATIONS = {
  park: [
    {
      id: 'park-1',
      name: '中央公園',
      type: 'park' as const,
      baseDistance: 400,
      rating: 4.2,
      description: '広々とした芝生エリアが人気。ドッグランも併設。',
    },
    {
      id: 'park-2',
      name: 'さくら公園',
      type: 'park' as const,
      baseDistance: 600,
      rating: 4.5,
      description: '桜の名所。春は花見客で賑わう。',
    },
    {
      id: 'park-3',
      name: '緑地公園',
      type: 'park' as const,
      baseDistance: 800,
      rating: 4.0,
      description: '木陰が多く夏でも涼しい。',
    },
    {
      id: 'park-4',
      name: '河川敷公園',
      type: 'park' as const,
      baseDistance: 1000,
      rating: 4.3,
      description: '川沿いの遊歩道が気持ちいい。',
    },
  ],
  shopping: [
    {
      id: 'shop-1',
      name: '駅前商店街',
      type: 'shopping' as const,
      baseDistance: 350,
      rating: 3.8,
      description: '昔ながらの商店街。ペット同伴可の店も多い。',
    },
    {
      id: 'shop-2',
      name: 'にぎわい通り',
      type: 'shopping' as const,
      baseDistance: 500,
      rating: 4.1,
      description: '飲食店やカフェが並ぶ人気スポット。',
    },
    {
      id: 'shop-3',
      name: 'ペットショップ通り',
      type: 'shopping' as const,
      baseDistance: 700,
      rating: 4.4,
      description: 'ペット用品店が集まるエリア。',
    },
  ],
};

interface RouteDestination {
  id: string;
  name: string;
  type: 'park' | 'shopping' | 'other';
  distance: {
    oneWay: number;
    roundTrip: number;
  };
  duration: {
    oneWay: number;
    roundTrip: number;
  };
  isWithinTime: boolean;
  rating?: number;
}

interface WalkRoute {
  id: string;
  name: string;
  description: string;
  totalDistance: number;
  totalDuration: number;
  isWithinTime: boolean;
  destinations: RouteDestination[];
  recommendReason: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { durationMinutes, purpose } = await request.json();

    // 片道最大距離を計算
    const oneWayMaxMinutes = durationMinutes / 2;
    const oneWayMaxDistance = Math.round(WALKING_SPEED_M_PER_MIN * oneWayMaxMinutes);

    // 目的地候補を取得
    let destinations: typeof MOCK_DESTINATIONS.park = [];

    if (purpose === 'park') {
      destinations = MOCK_DESTINATIONS.park;
    } else if (purpose === 'shopping') {
      destinations = MOCK_DESTINATIONS.shopping;
    } else {
      // おまかせ: 両方から選択
      destinations = [...MOCK_DESTINATIONS.park, ...MOCK_DESTINATIONS.shopping];
    }

    // 距離にランダム変動を加える（実際のAPIでは正確な値を取得）
    const processedDestinations = destinations.map((dest) => {
      const variation = 0.8 + Math.random() * 0.4; // 80-120%
      const oneWayDistance = Math.round(dest.baseDistance * variation);
      const oneWayDuration = Math.round(oneWayDistance / WALKING_SPEED_M_PER_MIN);
      const roundTripDistance = oneWayDistance * 2;
      const roundTripDuration = oneWayDuration * 2;

      return {
        id: dest.id,
        name: dest.name,
        type: dest.type,
        distance: {
          oneWay: oneWayDistance,
          roundTrip: roundTripDistance,
        },
        duration: {
          oneWay: oneWayDuration,
          roundTrip: roundTripDuration,
        },
        isWithinTime: roundTripDuration <= durationMinutes,
        rating: dest.rating,
        description: dest.description,
      };
    });

    // ルートを生成
    const routes: WalkRoute[] = [];

    // 1. 公園コース（往復可能なもの）
    const parkDests = processedDestinations.filter(d => d.type === 'park' && d.isWithinTime);
    if (parkDests.length > 0) {
      const best = parkDests.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
      routes.push({
        id: `route-park-${Date.now()}`,
        name: `${best.name}コース`,
        description: `${best.name}まで往復する定番コース。${best.description || ''}`,
        totalDistance: best.distance.roundTrip,
        totalDuration: best.duration.roundTrip,
        isWithinTime: true,
        destinations: [best],
        recommendReason: `評価${best.rating}の人気スポット。${durationMinutes}分以内で往復できます。`,
      });
    }

    // 2. 商店街コース（往復可能なもの）
    const shopDests = processedDestinations.filter(d => d.type === 'shopping' && d.isWithinTime);
    if (shopDests.length > 0) {
      const best = shopDests.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
      routes.push({
        id: `route-shop-${Date.now()}`,
        name: `${best.name}コース`,
        description: `にぎやかな通りを歩くコース。${best.description || ''}`,
        totalDistance: best.distance.roundTrip,
        totalDuration: best.duration.roundTrip,
        isWithinTime: true,
        destinations: [best],
        recommendReason: `社会化にも◎。人通りがあるので安心です。`,
      });
    }

    // 3. 組み合わせコース（公園＋商店街）
    const nearPark = processedDestinations.find(d => d.type === 'park' && d.distance.oneWay <= oneWayMaxDistance * 0.6);
    const nearShop = processedDestinations.find(d => d.type === 'shopping' && d.distance.oneWay <= oneWayMaxDistance * 0.4);
    if (nearPark && nearShop) {
      const combinedDistance = nearPark.distance.oneWay + nearShop.distance.oneWay + nearShop.distance.oneWay;
      const combinedDuration = Math.round(combinedDistance / WALKING_SPEED_M_PER_MIN);
      const isWithinTime = combinedDuration <= durationMinutes;

      routes.push({
        id: `route-combo-${Date.now()}`,
        name: '公園＋商店街コース',
        description: `${nearShop.name}を経由して${nearPark.name}まで。変化のあるルート。`,
        totalDistance: combinedDistance,
        totalDuration: combinedDuration,
        isWithinTime,
        destinations: [nearShop, nearPark].map(d => ({
          ...d,
          isWithinTime,
        })),
        recommendReason: isWithinTime
          ? '公園と商店街の両方を楽しめるバランスの良いコース。'
          : '少し長めですが、変化に富んだ充実コース。',
      });
    }

    // 4. 時間超過ルート（代替として）
    const overTimeDests = processedDestinations.filter(d => !d.isWithinTime);
    if (overTimeDests.length > 0 && routes.length < 3) {
      const nearest = overTimeDests.sort((a, b) => a.duration.roundTrip - b.duration.roundTrip)[0];
      routes.push({
        id: `route-overtime-${Date.now()}`,
        name: `${nearest.name}コース（時間超過）`,
        description: `設定時間を超えますが、人気のスポットです。`,
        totalDistance: nearest.distance.roundTrip,
        totalDuration: nearest.duration.roundTrip,
        isWithinTime: false,
        destinations: [nearest],
        recommendReason: `${nearest.duration.roundTrip - durationMinutes}分超過しますが、評価${nearest.rating}の人気スポットです。`,
      });
    }

    // スコア順にソート（時間内を優先）
    routes.sort((a, b) => {
      if (a.isWithinTime !== b.isWithinTime) {
        return a.isWithinTime ? -1 : 1;
      }
      return a.totalDuration - b.totalDuration;
    });

    return NextResponse.json({ routes: routes.slice(0, 3) });
  } catch (error) {
    console.error('Walk route detailed error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
