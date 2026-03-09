import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ================================================
// 周辺施設検索API（Yahoo! YOLP対応）
// ================================================
//
// 【機能】
// ユーザーの現在地から指定範囲内の施設を検索
// Yahoo! Japan ローカルサーチAPIを使用（無料・5万回/日）
//
// 【API】
// Yahoo! Open Local Platform (YOLP)
// https://developer.yahoo.co.jp/webapi/map/openlocalplatform/v1/localsearch.html
// ================================================

interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  openNow?: boolean;
  type: 'vet' | 'dogrun' | 'petshop' | 'trimming' | 'cafe' | 'walkspot';
  features?: string[];
  hours?: string;
  catchcopy?: string;
}

interface PlaceWithDistance extends Place {
  distance: number;
  distanceText: string;
  mapUrl: string;
}

// Yahoo! YOLP ジャンルコードと検索クエリのマッピング
const SEARCH_CONFIG: Record<string, { query: string; gc?: string }> = {
  vet: { query: '動物病院' },
  dogrun: { query: 'ドッグラン' },
  petshop: { query: 'ペットショップ' },
  trimming: { query: 'トリミング 犬' },
  cafe: { query: 'ドッグカフェ' },
  walkspot: { query: '公園', gc: '0422' }, // 公園のジャンルコード
};

// Haversine公式：2点間の距離を計算（メートル）
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

// ================================================
// Yahoo! YOLP ローカルサーチAPI
// ================================================
async function searchYahooYOLP(
  lat: number,
  lng: number,
  radius: number,
  type: string,
  appId: string
): Promise<Place[]> {
  const places: Place[] = [];
  const typesToSearch = type === 'all' ? Object.keys(SEARCH_CONFIG) : [type];

  for (const placeType of typesToSearch) {
    const config = SEARCH_CONFIG[placeType];
    if (!config) continue;

    try {
      // Yahoo! YOLP ローカルサーチAPI
      const params = new URLSearchParams({
        appid: appId,
        lat: lat.toString(),
        lon: lng.toString(),
        dist: (radius / 1000).toString(), // km単位
        query: config.query,
        results: '20',
        output: 'json',
        sort: 'dist',
      });

      // ジャンルコードがある場合は追加
      if (config.gc) {
        params.append('gc', config.gc);
      }

      const url = `https://map.yahooapis.jp/search/local/V1/localSearch?${params}`;
      console.log(`[Yahoo YOLP] 検索: ${config.query}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WansapoApp/1.0',
        },
      });

      if (!response.ok) {
        console.error(`[Yahoo YOLP] Error: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.Feature) {
        for (const feature of data.Feature) {
          const geometry = feature.Geometry?.Coordinates;
          if (!geometry) continue;

          // Yahoo APIは "lon,lat" 形式で返す
          const [lon, placeLat] = geometry.split(',').map(Number);

          const property = feature.Property || {};

          places.push({
            id: `yahoo-${feature.Id || Math.random().toString(36).substr(2, 9)}`,
            name: feature.Name || '名称不明',
            address: property.Address || '',
            latitude: placeLat,
            longitude: lon,
            phone: property.Tel1,
            type: placeType as Place['type'],
            catchcopy: property.CatchCopy,
            hours: property.OpenTime,
            features: extractFeatures(property),
          });
        }
      }
    } catch (error) {
      console.error(`[Yahoo YOLP] Error fetching ${placeType}:`, error);
    }
  }

  return places;
}

// 特徴を抽出
function extractFeatures(property: Record<string, unknown>): string[] | undefined {
  const features: string[] = [];

  if (property.ParkingFlag === 'true') features.push('駐車場あり');
  if (property.CashlessFlag === 'true') features.push('キャッシュレス対応');
  if (property.SmokingFlag === 'false') features.push('禁煙');

  // キャッチコピーから特徴を抽出
  const catchcopy = property.CatchCopy as string;
  if (catchcopy) {
    if (catchcopy.includes('24時間')) features.push('24時間');
    if (catchcopy.includes('予約')) features.push('予約可');
    if (catchcopy.includes('駐車')) features.push('駐車場');
  }

  return features.length > 0 ? features : undefined;
}

// ================================================
// フォールバック: OpenStreetMap (Overpass API)
// ================================================
async function searchOverpassFallback(
  lat: number,
  lng: number,
  radius: number,
  type: string
): Promise<Place[]> {
  const places: Place[] = [];

  const OSM_QUERIES: Record<string, string[]> = {
    vet: ['amenity=veterinary'],
    dogrun: ['leisure=dog_park'],
    petshop: ['shop=pet'],
    trimming: ['shop=pet_grooming'],
    cafe: ['amenity=cafe'],
    walkspot: ['leisure=park'],
  };

  const typesToSearch = type === 'all' ? Object.keys(OSM_QUERIES) : [type];

  let overpassQuery = '[out:json][timeout:25];\n(\n';
  for (const placeType of typesToSearch) {
    const tags = OSM_QUERIES[placeType];
    if (!tags) continue;
    for (const tag of tags) {
      const [key, value] = tag.split('=');
      overpassQuery += `  node["${key}"="${value}"](around:${radius},${lat},${lng});\n`;
      overpassQuery += `  way["${key}"="${value}"](around:${radius},${lat},${lng});\n`;
    }
  }
  overpassQuery += ');\nout center body;\n>;out skel qt;';

  try {
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

          let detectedType: Place['type'] = 'walkspot';
          for (const [typeKey, osmTags] of Object.entries(OSM_QUERIES)) {
            for (const tag of osmTags) {
              const [key, value] = tag.split('=');
              if (tags[key] === value) {
                detectedType = typeKey as Place['type'];
                break;
              }
            }
          }

          places.push({
            id: `osm-${element.id}`,
            name: tags['name:ja'] || tags.name,
            address: tags['addr:full'] || tags.address || '住所情報なし',
            latitude: placeLat,
            longitude: placeLon,
            phone: tags.phone,
            type: detectedType,
            hours: tags.opening_hours,
          });
        }
      }
    }
  } catch (error) {
    console.error('[Overpass Fallback] Error:', error);
  }

  return places;
}

// ================================================
// GET: 周辺施設検索
// ================================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseInt(searchParams.get('radius') || '1000', 10);
    const type = searchParams.get('type') || 'all';

    if (lat === 0 || lng === 0) {
      return NextResponse.json({ error: '位置情報が必要です' }, { status: 400 });
    }

    console.log(`[Places API] 検索: lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}, radius=${radius}m, type=${type}`);

    const yahooAppId = process.env.YAHOO_APP_ID;
    let places: Place[];
    let source: string;

    if (yahooAppId) {
      console.log('[Places API] Yahoo! YOLP を使用');
      places = await searchYahooYOLP(lat, lng, radius, type, yahooAppId);
      source = 'yahoo';

      // Yahoo!で結果が少ない場合、OpenStreetMapで補完
      if (places.length < 5) {
        console.log('[Places API] OpenStreetMapで補完');
        const osmPlaces = await searchOverpassFallback(lat, lng, radius, type);
        // 重複を避けて追加
        for (const osmPlace of osmPlaces) {
          if (!places.find(p => p.name === osmPlace.name)) {
            places.push(osmPlace);
          }
        }
      }
    } else {
      console.log('[Places API] OpenStreetMap を使用（Yahoo! APP ID未設定）');
      places = await searchOverpassFallback(lat, lng, radius, type);
      source = 'openstreetmap';
    }

    // 距離を計算してソート
    const placesWithDistance: PlaceWithDistance[] = places
      .map(place => {
        const distance = calculateDistance(lat, lng, place.latitude, place.longitude);
        return {
          ...place,
          distance,
          distanceText: formatDistance(distance),
          mapUrl: generateMapUrl(lat, lng, place.latitude, place.longitude),
        };
      })
      .filter(p => p.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    // 重複除去
    const uniquePlaces = placesWithDistance.filter((place, index, self) =>
      index === self.findIndex(p => p.name === place.name)
    );

    console.log(`[Places API] 結果: ${uniquePlaces.length}件 (source: ${source})`);

    return NextResponse.json({
      places: uniquePlaces,
      count: uniquePlaces.length,
      userLocation: { latitude: lat, longitude: lng },
      searchParams: { radius, type },
      source,
    });
  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
