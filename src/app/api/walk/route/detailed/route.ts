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
      features: ['芝生広場', 'ドッグラン', 'ベンチ多数'],
      landmark: '大きな噴水が目印',
    },
    {
      id: 'park-2',
      name: 'さくら公園',
      type: 'park' as const,
      baseDistance: 600,
      rating: 4.5,
      description: '桜の名所。春は花見客で賑わう。',
      features: ['桜並木', '池', '遊歩道'],
      landmark: '赤い橋が目印',
    },
    {
      id: 'park-3',
      name: '緑地公園',
      type: 'park' as const,
      baseDistance: 800,
      rating: 4.0,
      description: '木陰が多く夏でも涼しい。',
      features: ['木陰', '小川', '野鳥観察'],
      landmark: '大きなケヤキの木',
    },
    {
      id: 'park-4',
      name: '河川敷公園',
      type: 'park' as const,
      baseDistance: 1000,
      rating: 4.3,
      description: '川沿いの遊歩道が気持ちいい。',
      features: ['河川敷', 'サイクリングロード', '広場'],
      landmark: '青い歩道橋',
    },
    {
      id: 'park-5',
      name: 'ひまわり公園',
      type: 'park' as const,
      baseDistance: 500,
      rating: 4.1,
      description: '小さいけど穴場の公園。',
      features: ['花壇', 'ベンチ', '静か'],
      landmark: '黄色いフェンス',
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
      features: ['飲食店', 'ペットショップ', 'コンビニ'],
      landmark: '赤いアーケード',
    },
    {
      id: 'shop-2',
      name: 'にぎわい通り',
      type: 'shopping' as const,
      baseDistance: 500,
      rating: 4.1,
      description: '飲食店やカフェが並ぶ人気スポット。',
      features: ['カフェ', 'テラス席あり', '犬OK店多数'],
      landmark: '大きな時計台',
    },
    {
      id: 'shop-3',
      name: 'ペットショップ通り',
      type: 'shopping' as const,
      baseDistance: 700,
      rating: 4.4,
      description: 'ペット用品店が集まるエリア。',
      features: ['ペット用品', 'トリミング', 'おやつ'],
      landmark: '犬の看板',
    },
  ],
};

interface Waypoint {
  name: string;
  type: 'start' | 'destination' | 'landmark' | 'turn';
  description: string;
  distanceFromStart: number;
  durationFromStart: number;
}

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
  description?: string;
  features?: string[];
  landmark?: string;
}

interface WalkRoute {
  id: string;
  name: string;
  description: string;
  totalDistance: number;
  totalDuration: number;
  isWithinTime: boolean;
  destinations: RouteDestination[];
  waypoints: Waypoint[];
  recommendReason: string;
  difficulty: 'easy' | 'normal' | 'challenging';
  scenery: string[];
  tips: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { durationMinutes, purpose, latitude, longitude } = await request.json();

    // 片道最大距離を計算
    const oneWayMaxMinutes = durationMinutes / 2;
    const oneWayMaxDistance = Math.round(WALKING_SPEED_M_PER_MIN * oneWayMaxMinutes);

    // 位置情報がある場合は距離を微調整（デモ用）
    const locationFactor = latitude && longitude ? 0.9 + Math.random() * 0.2 : 1;

    // 目的地候補を取得
    type Destination = {
      id: string;
      name: string;
      type: 'park' | 'shopping';
      baseDistance: number;
      rating: number;
      description: string;
      features: string[];
      landmark: string;
    };
    let destinations: Destination[] = [];

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
      const variation = (0.8 + Math.random() * 0.4) * locationFactor;
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
        features: dest.features,
        landmark: dest.landmark,
      };
    });

    // ルートを生成（最低3つ確保）
    const routes: WalkRoute[] = [];

    // ウェイポイントを生成するヘルパー関数
    const generateWaypoints = (dest: RouteDestination, isReturn: boolean = false): Waypoint[] => {
      const waypoints: Waypoint[] = [
        {
          name: '現在地',
          type: 'start',
          description: 'ここからスタート！',
          distanceFromStart: 0,
          durationFromStart: 0,
        },
      ];

      // 中間地点（3分の1地点）
      waypoints.push({
        name: '信号を渡って直進',
        type: 'turn',
        description: '歩道を進みましょう',
        distanceFromStart: Math.round(dest.distance.oneWay * 0.33),
        durationFromStart: Math.round(dest.duration.oneWay * 0.33),
      });

      // 目印（3分の2地点）
      if (dest.landmark) {
        waypoints.push({
          name: dest.landmark,
          type: 'landmark',
          description: 'もうすぐ到着です',
          distanceFromStart: Math.round(dest.distance.oneWay * 0.66),
          durationFromStart: Math.round(dest.duration.oneWay * 0.66),
        });
      }

      // 目的地
      waypoints.push({
        name: dest.name,
        type: 'destination',
        description: dest.description || '到着！',
        distanceFromStart: dest.distance.oneWay,
        durationFromStart: dest.duration.oneWay,
      });

      return waypoints;
    };

    // 1. 公園コース（評価順に複数）
    const parkDests = processedDestinations
      .filter(d => d.type === 'park')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    parkDests.forEach((dest, index) => {
      if (routes.length >= 5) return;

      routes.push({
        id: `route-park-${dest.id}-${Date.now()}`,
        name: index === 0 ? `${dest.name}コース（おすすめ）` : `${dest.name}コース`,
        description: `${dest.name}まで往復する${dest.isWithinTime ? '定番' : 'ゆったり'}コース。${dest.description || ''}`,
        totalDistance: dest.distance.roundTrip,
        totalDuration: dest.duration.roundTrip,
        isWithinTime: dest.isWithinTime,
        destinations: [dest],
        waypoints: generateWaypoints(dest),
        recommendReason: dest.isWithinTime
          ? `評価★${dest.rating}の人気スポット。${durationMinutes}分以内で往復できます。`
          : `評価★${dest.rating}の人気スポット。少し時間に余裕を持って出かけましょう。`,
        difficulty: dest.distance.roundTrip < 800 ? 'easy' : dest.distance.roundTrip < 1500 ? 'normal' : 'challenging',
        scenery: dest.features || [],
        tips: dest.isWithinTime
          ? 'ワンちゃんのペースに合わせてゆっくり歩きましょう'
          : '途中で休憩を入れながら歩くのがおすすめです',
      });
    });

    // 2. 商店街コース
    const shopDests = processedDestinations
      .filter(d => d.type === 'shopping')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    shopDests.forEach((dest) => {
      if (routes.length >= 5) return;

      routes.push({
        id: `route-shop-${dest.id}-${Date.now()}`,
        name: `${dest.name}コース`,
        description: `にぎやかな通りを歩くコース。${dest.description || ''}`,
        totalDistance: dest.distance.roundTrip,
        totalDuration: dest.duration.roundTrip,
        isWithinTime: dest.isWithinTime,
        destinations: [dest],
        waypoints: generateWaypoints(dest),
        recommendReason: '社会化トレーニングにも◎。人通りがあるので安心です。',
        difficulty: 'easy',
        scenery: dest.features || [],
        tips: 'お店の前では立ち止まって、他の人の邪魔にならないようにしましょう',
      });
    });

    // 3. 組み合わせコース
    const nearPark = processedDestinations.find(d => d.type === 'park' && d.distance.oneWay <= oneWayMaxDistance * 0.6);
    const nearShop = processedDestinations.find(d => d.type === 'shopping' && d.distance.oneWay <= oneWayMaxDistance * 0.5);

    if (nearPark && nearShop && routes.length < 5) {
      const combinedDistance = nearPark.distance.oneWay + nearShop.distance.oneWay * 2;
      const combinedDuration = Math.round(combinedDistance / WALKING_SPEED_M_PER_MIN);
      const isWithinTime = combinedDuration <= durationMinutes;

      routes.push({
        id: `route-combo-${Date.now()}`,
        name: '公園＋商店街コース',
        description: `${nearShop.name}を経由して${nearPark.name}まで。変化のあるルート。`,
        totalDistance: combinedDistance,
        totalDuration: combinedDuration,
        isWithinTime,
        destinations: [
          { ...nearShop, isWithinTime },
          { ...nearPark, isWithinTime },
        ],
        waypoints: [
          { name: '現在地', type: 'start', description: 'ここからスタート！', distanceFromStart: 0, durationFromStart: 0 },
          { name: nearShop.name, type: 'destination', description: '商店街で少し休憩', distanceFromStart: nearShop.distance.oneWay, durationFromStart: nearShop.duration.oneWay },
          { name: nearPark.name, type: 'destination', description: '公園で遊びましょう', distanceFromStart: nearShop.distance.oneWay + nearPark.distance.oneWay, durationFromStart: nearShop.duration.oneWay + nearPark.duration.oneWay },
        ],
        recommendReason: isWithinTime
          ? '公園と商店街の両方を楽しめるバランスの良いコース。'
          : '少し長めですが、変化に富んだ充実コース。',
        difficulty: 'normal',
        scenery: [...(nearShop.features || []), ...(nearPark.features || [])],
        tips: '商店街では人混みに注意、公園ではリードを短めに持ちましょう',
      });
    }

    // 4. ショートコース（時間が短い場合の代替）
    if (durationMinutes <= 15 && routes.length < 3) {
      const shortDest = processedDestinations
        .filter(d => d.distance.oneWay <= 300)
        .sort((a, b) => a.distance.oneWay - b.distance.oneWay)[0];

      if (shortDest) {
        routes.push({
          id: `route-short-${Date.now()}`,
          name: 'ご近所お散歩コース',
          description: '近場をサクッと歩くコース。トイレ休憩にもぴったり。',
          totalDistance: shortDest.distance.roundTrip,
          totalDuration: shortDest.duration.roundTrip,
          isWithinTime: true,
          destinations: [{ ...shortDest, isWithinTime: true }],
          waypoints: generateWaypoints(shortDest),
          recommendReason: '短い時間でもお外の空気を楽しめます。',
          difficulty: 'easy',
          scenery: shortDest.features || [],
          tips: '短い散歩でも、しっかり嗅ぎ探索の時間を作ってあげましょう',
        });
      }
    }

    // 5. のんびりコース（時間が長い場合）
    if (durationMinutes >= 40 && routes.length < 5) {
      const farDest = processedDestinations
        .sort((a, b) => b.distance.oneWay - a.distance.oneWay)[0];

      if (farDest && !routes.find(r => r.destinations.some(d => d.id === farDest.id))) {
        routes.push({
          id: `route-long-${Date.now()}`,
          name: 'のんびり探検コース',
          description: `少し遠出して${farDest.name}まで。探検気分で楽しもう。`,
          totalDistance: farDest.distance.roundTrip,
          totalDuration: farDest.duration.roundTrip,
          isWithinTime: farDest.isWithinTime,
          destinations: [farDest],
          waypoints: generateWaypoints(farDest),
          recommendReason: '時間をかけてゆっくりお散歩。新しい発見があるかも。',
          difficulty: 'challenging',
          scenery: farDest.features || [],
          tips: '水分補給を忘れずに。暑い日は日陰を選んで歩きましょう',
        });
      }
    }

    // スコア順にソート（時間内を優先、その中で評価順）
    routes.sort((a, b) => {
      if (a.isWithinTime !== b.isWithinTime) {
        return a.isWithinTime ? -1 : 1;
      }
      const aRating = a.destinations[0]?.rating || 0;
      const bRating = b.destinations[0]?.rating || 0;
      return bRating - aRating;
    });

    // 最低3つ、最大5つのルートを返す
    const finalRoutes = routes.slice(0, Math.max(3, Math.min(5, routes.length)));

    return NextResponse.json({
      routes: finalRoutes,
      location: latitude && longitude ? { latitude, longitude } : null,
    });
  } catch (error) {
    console.error('Walk route detailed error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
