import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ================================================
// 散歩ルート提案API（Yahoo! YOLP対応）
// ================================================

const WALKING_SPEED_KM_PER_HOUR = 4;
const WALKING_SPEED_M_PER_MIN = (WALKING_SPEED_KM_PER_HOUR * 1000) / 60;

// Yahoo! YOLP で公園・商店街を検索
async function searchDestinations(
  lat: number,
  lng: number,
  maxDistance: number,
  purpose: 'park' | 'shopping' | 'any',
  appId: string
): Promise<DestinationData[]> {
  const destinations: DestinationData[] = [];

  const queries = purpose === 'park'
    ? ['公園', '緑地', 'ドッグラン']
    : purpose === 'shopping'
    ? ['商店街', 'カフェ', 'ペットショップ']
    : ['公園', '商店街', 'カフェ', 'ドッグラン'];

  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        appid: appId,
        lat: lat.toString(),
        lon: lng.toString(),
        dist: (maxDistance / 1000).toString(),
        query,
        results: '10',
        output: 'json',
        sort: 'dist',
      });

      const url = `https://map.yahooapis.jp/search/local/V1/localSearch?${params}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'WansapoApp/1.0' },
      });

      if (!response.ok) continue;

      const data = await response.json();

      if (data.Feature) {
        for (const feature of data.Feature) {
          const geometry = feature.Geometry?.Coordinates;
          if (!geometry) continue;

          if (destinations.find(d => d.name === feature.Name)) continue;

          const [lon, placeLat] = geometry.split(',').map(Number);
          const property = feature.Property || {};

          const distance = calculateDistance(lat, lng, placeLat, lon);
          if (distance > maxDistance) continue;

          const type = detectType(query, feature.Name || '', property.CatchCopy || '');
          const features = extractFeatures(property.CatchCopy || '', type);

          destinations.push({
            id: `yahoo-${feature.Id || Math.random().toString(36).substr(2, 9)}`,
            name: feature.Name || '名称不明',
            type,
            baseDistance: distance,
            rating: 4.0 + Math.random() * 0.8,
            description: property.CatchCopy || `${feature.Name}への散歩コース`,
            features,
            landmark: `${feature.Name}の入口`,
            atmosphere: type === 'park' ? 'nature' : 'social',
            routeCharacter: features.slice(0, 2),
            latitude: placeLat,
            longitude: lon,
          });
        }
      }
    } catch (error) {
      console.error('[Yahoo YOLP Walk] Error:', error);
    }
  }

  console.log(`[Yahoo YOLP Walk] ${destinations.length}件の目的地を取得`);
  return destinations;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function detectType(query: string, name: string, catchcopy: string): 'park' | 'shopping' {
  const text = `${query} ${name} ${catchcopy}`.toLowerCase();
  if (text.includes('公園') || text.includes('緑地') || text.includes('ドッグラン')) return 'park';
  return 'shopping';
}

function extractFeatures(catchcopy: string, type: 'park' | 'shopping'): string[] {
  const features: string[] = [];
  if (type === 'park') {
    if (catchcopy.includes('芝生')) features.push('芝生広場');
    if (catchcopy.includes('ドッグラン')) features.push('ドッグラン');
    if (catchcopy.includes('池') || catchcopy.includes('川')) features.push('水辺');
    if (catchcopy.includes('桜')) features.push('桜並木');
    if (features.length === 0) features.push('緑豊か', '散歩コース');
  } else {
    if (catchcopy.includes('カフェ')) features.push('カフェあり');
    if (catchcopy.includes('ペット')) features.push('ペット用品');
    if (features.length === 0) features.push('お買い物', 'にぎやか');
  }
  return features;
}

// OpenStreetMap フォールバック
async function searchOverpassFallback(
  lat: number,
  lng: number,
  maxDistance: number,
  purpose: 'park' | 'shopping' | 'any'
): Promise<DestinationData[]> {
  const destinations: DestinationData[] = [];

  const tags = purpose === 'park'
    ? ['leisure=park', 'leisure=dog_park', 'leisure=garden']
    : purpose === 'shopping'
    ? ['shop=*', 'amenity=cafe']
    : ['leisure=park', 'shop=*', 'amenity=cafe'];

  try {
    let overpassQuery = '[out:json][timeout:25];\n(\n';
    for (const tag of tags) {
      const [key, value] = tag.split('=');
      if (value === '*') {
        overpassQuery += `  node["${key}"](around:${maxDistance},${lat},${lng});\n`;
      } else {
        overpassQuery += `  node["${key}"="${value}"](around:${maxDistance},${lat},${lng});\n`;
      }
    }
    overpassQuery += ');\nout center body;';

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (response.ok) {
      const data = await response.json();
      if (data.elements) {
        for (const element of data.elements) {
          const placeLat = element.lat || element.center?.lat;
          const placeLon = element.lon || element.center?.lon;
          const tags = element.tags || {};

          if (!placeLat || !placeLon || !tags.name) continue;

          const distance = calculateDistance(lat, lng, placeLat, placeLon);
          const type = tags.leisure === 'park' || tags.leisure === 'dog_park' ? 'park' : 'shopping';

          destinations.push({
            id: `osm-${element.id}`,
            name: tags['name:ja'] || tags.name,
            type,
            baseDistance: distance,
            rating: 4.0,
            description: `${tags.name}への散歩`,
            features: type === 'park' ? ['緑豊か'] : ['お買い物'],
            landmark: tags.name,
            atmosphere: type === 'park' ? 'nature' : 'social',
            routeCharacter: [],
            latitude: placeLat,
            longitude: placeLon,
          });
        }
      }
    }
  } catch (error) {
    console.error('[Overpass Walk] Error:', error);
  }

  return destinations;
}

interface DestinationData {
  id: string;
  name: string;
  type: 'park' | 'shopping';
  baseDistance: number;
  rating: number;
  description: string;
  features: string[];
  landmark: string;
  atmosphere: string;
  routeCharacter: string[];
  latitude?: number;
  longitude?: number;
}

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
  distance: { oneWay: number; roundTrip: number };
  duration: { oneWay: number; roundTrip: number };
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

// ルート名テンプレート
const ROUTE_NAMES = {
  park: ['芝生でのびのびコース', 'ワンコ元気いっぱいコース', '自然満喫コース', 'のんびりお散歩コース', 'リラックスさんぽコース'],
  shopping: ['カフェでひと息コース', 'お買い物ついでコース', 'ワンコと街ブラコース', 'テラス席でまったりコース'],
  combo: ['公園＆カフェ欲張りコース', '気分転換お散歩コース'],
  short: ['ちょこっとお外コース', 'サクッとお散歩コース'],
  long: ['たっぷり探検コース', 'しっかりお散歩コース'],
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { durationMinutes, purpose, latitude, longitude } = await request.json();

    const oneWayMaxMinutes = durationMinutes / 2;
    const oneWayMaxDistance = Math.round(WALKING_SPEED_M_PER_MIN * oneWayMaxMinutes);

    const yahooAppId = process.env.YAHOO_APP_ID;
    let destinations: DestinationData[];

    if (yahooAppId && latitude && longitude) {
      destinations = await searchDestinations(latitude, longitude, oneWayMaxDistance, purpose, yahooAppId);

      if (destinations.length < 3) {
        const osmDests = await searchOverpassFallback(latitude, longitude, oneWayMaxDistance, purpose);
        for (const osm of osmDests) {
          if (!destinations.find(d => d.name === osm.name)) {
            destinations.push(osm);
          }
        }
      }
    } else if (latitude && longitude) {
      destinations = await searchOverpassFallback(latitude, longitude, oneWayMaxDistance, purpose);
    } else {
      return NextResponse.json({ error: '位置情報が必要です' }, { status: 400 });
    }

    // ルート生成
    const routes: WalkRoute[] = [];
    const usedNames = new Set<string>();

    const getRouteName = (type: keyof typeof ROUTE_NAMES): string => {
      const names = ROUTE_NAMES[type].filter(n => !usedNames.has(n));
      const pool = names.length > 0 ? names : ROUTE_NAMES[type];
      const name = pool[Math.floor(Math.random() * pool.length)];
      usedNames.add(name);
      return name;
    };

    const generateWaypoints = (dest: RouteDestination): Waypoint[] => [
      { name: '現在地', type: 'start', description: 'ここからスタート！', distanceFromStart: 0, durationFromStart: 0 },
      { name: '直進', type: 'turn', description: '道なりに進みましょう', distanceFromStart: Math.round(dest.distance.oneWay * 0.33), durationFromStart: Math.round(dest.duration.oneWay * 0.33) },
      { name: dest.landmark || 'もうすぐ', type: 'landmark', description: 'もうすぐ到着', distanceFromStart: Math.round(dest.distance.oneWay * 0.66), durationFromStart: Math.round(dest.duration.oneWay * 0.66) },
      { name: dest.name, type: 'destination', description: dest.description || '到着！', distanceFromStart: dest.distance.oneWay, durationFromStart: dest.duration.oneWay },
    ];

    // 公園コース
    const parks = destinations.filter(d => d.type === 'park').sort((a, b) => (b.rating || 0) - (a.rating || 0));
    parks.slice(0, 3).forEach(dest => {
      const oneWayDuration = Math.round(dest.baseDistance / WALKING_SPEED_M_PER_MIN);
      const routeDest: RouteDestination = {
        id: dest.id,
        name: dest.name,
        type: dest.type,
        distance: { oneWay: dest.baseDistance, roundTrip: dest.baseDistance * 2 },
        duration: { oneWay: oneWayDuration, roundTrip: oneWayDuration * 2 },
        isWithinTime: oneWayDuration * 2 <= durationMinutes,
        rating: dest.rating,
        description: dest.description,
        features: dest.features,
        landmark: dest.landmark,
      };

      routes.push({
        id: `route-park-${dest.id}`,
        name: getRouteName('park'),
        description: `${dest.name}で自然を満喫！${dest.features.join('、')}が楽しめます。`,
        totalDistance: routeDest.distance.roundTrip,
        totalDuration: routeDest.duration.roundTrip,
        isWithinTime: routeDest.isWithinTime,
        destinations: [routeDest],
        waypoints: generateWaypoints(routeDest),
        recommendReason: routeDest.isWithinTime ? `${durationMinutes}分以内で往復可能` : '少し長めですが楽しいコース',
        difficulty: routeDest.distance.roundTrip < 800 ? 'easy' : routeDest.distance.roundTrip < 1500 ? 'normal' : 'challenging',
        scenery: dest.features,
        tips: 'ワンちゃんのペースに合わせてゆっくり歩きましょう',
      });
    });

    // 商店街コース
    const shops = destinations.filter(d => d.type === 'shopping').sort((a, b) => a.baseDistance - b.baseDistance);
    shops.slice(0, 2).forEach(dest => {
      const oneWayDuration = Math.round(dest.baseDistance / WALKING_SPEED_M_PER_MIN);
      const routeDest: RouteDestination = {
        id: dest.id,
        name: dest.name,
        type: dest.type,
        distance: { oneWay: dest.baseDistance, roundTrip: dest.baseDistance * 2 },
        duration: { oneWay: oneWayDuration, roundTrip: oneWayDuration * 2 },
        isWithinTime: oneWayDuration * 2 <= durationMinutes,
        rating: dest.rating,
        description: dest.description,
        features: dest.features,
        landmark: dest.landmark,
      };

      routes.push({
        id: `route-shop-${dest.id}`,
        name: getRouteName('shopping'),
        description: `${dest.name}でお買い物も楽しめるコース。`,
        totalDistance: routeDest.distance.roundTrip,
        totalDuration: routeDest.duration.roundTrip,
        isWithinTime: routeDest.isWithinTime,
        destinations: [routeDest],
        waypoints: generateWaypoints(routeDest),
        recommendReason: '社会化トレーニングにも◎',
        difficulty: 'easy',
        scenery: dest.features,
        tips: 'お店の前では他の人の邪魔にならないように',
      });
    });

    // ソート（時間内優先）
    routes.sort((a, b) => {
      if (a.isWithinTime !== b.isWithinTime) return a.isWithinTime ? -1 : 1;
      return (b.destinations[0]?.rating || 0) - (a.destinations[0]?.rating || 0);
    });

    return NextResponse.json({
      routes: routes.slice(0, 5),
      location: latitude && longitude ? { latitude, longitude } : null,
    });
  } catch (error) {
    console.error('Walk route error:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
