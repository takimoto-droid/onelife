import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ================================================
// ペット同伴飲食店検索API（Yahoo! YOLP対応）
// ================================================

interface PetPolicy {
  dogAllowed: boolean;
  sizeLimit: 'all' | 'medium' | 'small';
  indoorAllowed: boolean;
  terraceOnly: boolean;
  petMenu: boolean;
  waterBowl: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  category: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
  distance: number;
  distanceText: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  petPolicy: PetPolicy;
  features: string[];
  openingHours?: string;
  description?: string;
  mapUrl: string;
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

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function generateMapUrl(userLat: number, userLon: number, placeLat: number, placeLon: number): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${placeLat},${placeLon}&travelmode=walking`;
}

// カテゴリを推測
function detectCategory(name: string, catchcopy: string): string {
  const text = `${name} ${catchcopy}`.toLowerCase();
  if (text.includes('カフェ') || text.includes('cafe') || text.includes('珈琲')) return 'カフェ';
  if (text.includes('イタリアン') || text.includes('パスタ') || text.includes('ピザ')) return 'イタリアン';
  if (text.includes('和食') || text.includes('寿司') || text.includes('蕎麦')) return '和食';
  if (text.includes('ビアガーデン') || text.includes('ビール')) return 'ビアガーデン';
  if (text.includes('ダイニング') || text.includes('dining')) return 'ダイニング';
  return 'カフェ';
}

// ペットポリシーを推測
function detectPetPolicy(name: string, catchcopy: string): PetPolicy {
  const text = `${name} ${catchcopy}`.toLowerCase();

  return {
    dogAllowed: true,
    sizeLimit: text.includes('小型犬') ? 'small' : text.includes('中型犬') ? 'medium' : 'all',
    indoorAllowed: !text.includes('テラス') && !text.includes('屋外'),
    terraceOnly: text.includes('テラス') || text.includes('屋外'),
    petMenu: text.includes('ペットメニュー') || text.includes('ドッグメニュー') || text.includes('犬用'),
    waterBowl: true,
  };
}

// 特徴を抽出
function extractFeatures(name: string, catchcopy: string, petPolicy: PetPolicy): string[] {
  const features: string[] = [];
  const text = `${name} ${catchcopy}`;

  if (petPolicy.indoorAllowed) features.push('室内OK');
  if (petPolicy.terraceOnly) features.push('テラス席');
  if (petPolicy.petMenu) features.push('ペットメニュー');
  if (petPolicy.sizeLimit === 'all') features.push('大型犬OK');
  else if (petPolicy.sizeLimit === 'medium') features.push('中型犬まで');
  else features.push('小型犬のみ');

  if (text.includes('ドッグラン')) features.push('ドッグラン併設');
  if (text.includes('駐車')) features.push('駐車場あり');

  return features;
}

// Yahoo! YOLP でペット同伴飲食店を検索
async function searchYahooYOLP(
  lat: number,
  lng: number,
  radius: number,
  appId: string,
  category: string
): Promise<Restaurant[]> {
  const restaurants: Restaurant[] = [];

  // 検索クエリ
  const queries = ['ドッグカフェ', 'ペット同伴 カフェ', 'ペットOK レストラン', 'わんこカフェ'];

  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        appid: appId,
        lat: lat.toString(),
        lon: lng.toString(),
        dist: (radius / 1000).toString(),
        query,
        results: '20',
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

          // 既に追加済みの場合はスキップ
          if (restaurants.find(r => r.name === feature.Name)) continue;

          const [lon, placeLat] = geometry.split(',').map(Number);
          const property = feature.Property || {};
          const distance = calculateDistance(lat, lng, placeLat, lon);
          const catchcopy = property.CatchCopy || '';

          const detectedCategory = detectCategory(feature.Name || '', catchcopy);

          // カテゴリフィルター
          if (category !== 'すべて' && detectedCategory !== category) continue;

          const petPolicy = detectPetPolicy(feature.Name || '', catchcopy);
          const features = extractFeatures(feature.Name || '', catchcopy, petPolicy);

          restaurants.push({
            id: `yahoo-rest-${feature.Id || Math.random().toString(36).substr(2, 9)}`,
            name: feature.Name || '名称不明',
            category: detectedCategory,
            address: property.Address || '',
            phone: property.Tel1,
            latitude: placeLat,
            longitude: lon,
            distance,
            distanceText: formatDistance(distance),
            petPolicy,
            features,
            openingHours: property.OpenTime,
            description: catchcopy,
            mapUrl: generateMapUrl(lat, lng, placeLat, lon),
          });
        }
      }
    } catch (error) {
      console.error('[Yahoo YOLP] Error:', error);
    }
  }

  console.log(`[Yahoo YOLP] ${restaurants.length}件のペット飲食店を取得`);
  return restaurants;
}

// OpenStreetMap フォールバック
async function searchOverpassFallback(
  lat: number,
  lng: number,
  radius: number
): Promise<Restaurant[]> {
  const restaurants: Restaurant[] = [];

  try {
    const overpassQuery = `[out:json][timeout:25];
(
  node["amenity"="cafe"]["dog"="yes"](around:${radius},${lat},${lng});
  node["amenity"="restaurant"]["dog"="yes"](around:${radius},${lat},${lng});
  node["amenity"="cafe"](around:${radius},${lat},${lng});
);
out center body;`;

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
          const isDogFriendly = tags.dog === 'yes' || tags.dogs === 'yes';

          if (!isDogFriendly) continue;

          restaurants.push({
            id: `osm-rest-${element.id}`,
            name: tags['name:ja'] || tags.name,
            category: tags.cuisine || 'カフェ',
            address: tags['addr:full'] || tags.address || '住所情報なし',
            phone: tags.phone,
            latitude: placeLat,
            longitude: placeLon,
            distance,
            distanceText: formatDistance(distance),
            petPolicy: {
              dogAllowed: true,
              sizeLimit: 'all',
              indoorAllowed: tags.outdoor_seating !== 'only',
              terraceOnly: tags.outdoor_seating === 'only',
              petMenu: false,
              waterBowl: true,
            },
            features: ['ペットOK'],
            openingHours: tags.opening_hours,
            mapUrl: generateMapUrl(lat, lng, placeLat, placeLon),
          });
        }
      }
    }
  } catch (error) {
    console.error('[Overpass] Error:', error);
  }

  return restaurants;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseInt(searchParams.get('radius') || '3000', 10);
    const category = searchParams.get('category') || 'すべて';
    const sizeFilter = searchParams.get('size') || 'all';
    const indoorOnly = searchParams.get('indoor') === 'true';

    if (lat === 0 || lng === 0) {
      return NextResponse.json({ error: '位置情報が必要です' }, { status: 400 });
    }

    console.log(`[Restaurant API] 検索: lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}, radius=${radius}m`);

    const yahooAppId = process.env.YAHOO_APP_ID;
    let restaurants: Restaurant[];

    if (yahooAppId) {
      restaurants = await searchYahooYOLP(lat, lng, radius, yahooAppId, category);

      // 結果が少ない場合はOSMで補完
      if (restaurants.length < 3) {
        const osmRestaurants = await searchOverpassFallback(lat, lng, radius);
        for (const osm of osmRestaurants) {
          if (!restaurants.find(r => r.name === osm.name)) {
            restaurants.push(osm);
          }
        }
      }
    } else {
      restaurants = await searchOverpassFallback(lat, lng, radius);
    }

    // フィルター適用
    let filtered = restaurants;

    if (sizeFilter !== 'all') {
      filtered = filtered.filter(r => {
        if (sizeFilter === 'medium') {
          return r.petPolicy.sizeLimit === 'all' || r.petPolicy.sizeLimit === 'medium';
        }
        return r.petPolicy.sizeLimit === sizeFilter ||
               r.petPolicy.sizeLimit === 'all' ||
               r.petPolicy.sizeLimit === 'medium';
      });
    }

    if (indoorOnly) {
      filtered = filtered.filter(r => r.petPolicy.indoorAllowed);
    }

    // 距離でソート
    filtered.sort((a, b) => a.distance - b.distance);

    // 重複除去
    const unique = filtered.filter((r, i, self) =>
      i === self.findIndex(x => x.name === r.name)
    );

    return NextResponse.json({
      restaurants: unique,
      count: unique.length,
    });
  } catch (error) {
    console.error('Restaurant API error:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
