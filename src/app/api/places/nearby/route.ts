import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ================================================
// 周辺施設検索API（OpenStreetMap / Overpass API）
// ================================================
//
// 【機能】
// ユーザーの現在地から指定範囲内の施設を検索
// OpenStreetMap（無料・APIキー不要）を使用
//
// 【データソース】
// Overpass API: OpenStreetMapのデータを検索
// 完全無料、商用利用可、日本全国対応
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
}

interface PlaceWithDistance extends Place {
  distance: number;
  distanceText: string;
  mapUrl: string;
}

// OpenStreetMapタグと施設タイプのマッピング
const OSM_QUERIES: Record<string, { tags: string[]; label: string }> = {
  vet: {
    tags: ['amenity=veterinary', 'healthcare=veterinary'],
    label: '動物病院',
  },
  dogrun: {
    tags: ['leisure=dog_park'],
    label: 'ドッグラン',
  },
  petshop: {
    tags: ['shop=pet', 'shop=pet_supply'],
    label: 'ペットショップ',
  },
  trimming: {
    tags: ['shop=pet_grooming', 'craft=pet_grooming'],
    label: 'トリミング',
  },
  cafe: {
    tags: ['amenity=cafe', 'cuisine=coffee_shop'],
    label: 'カフェ',
  },
  walkspot: {
    tags: ['leisure=park', 'leisure=garden', 'landuse=recreation_ground'],
    label: '公園・散歩スポット',
  },
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
// Overpass API（OpenStreetMap）で施設を検索
// ================================================
async function searchOverpassAPI(
  lat: number,
  lng: number,
  radius: number,
  type: string
): Promise<Place[]> {
  const places: Place[] = [];
  const typesToSearch = type === 'all' ? Object.keys(OSM_QUERIES) : [type];

  // Overpassクエリを構築
  let overpassQuery = '[out:json][timeout:25];\n(\n';

  for (const placeType of typesToSearch) {
    const config = OSM_QUERIES[placeType];
    if (!config) continue;

    for (const tag of config.tags) {
      const [key, value] = tag.split('=');
      // node, way, relationすべてを検索
      overpassQuery += `  node["${key}"="${value}"](around:${radius},${lat},${lng});\n`;
      overpassQuery += `  way["${key}"="${value}"](around:${radius},${lat},${lng});\n`;
    }
  }

  overpassQuery += ');\nout center body;\n>;out skel qt;';

  try {
    console.log('[Overpass API] クエリ実行中...');

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      console.error('[Overpass API] Error:', response.status);
      return places;
    }

    const data = await response.json();

    if (data.elements) {
      for (const element of data.elements) {
        // 座標を取得（wayの場合はcenterを使用）
        const placeLat = element.lat || element.center?.lat;
        const placeLon = element.lon || element.center?.lon;

        if (!placeLat || !placeLon) continue;

        const tags = element.tags || {};

        // 名前がない施設はスキップ
        if (!tags.name && !tags['name:ja']) continue;

        // 施設タイプを判定
        let detectedType: Place['type'] = 'walkspot';
        for (const [typeKey, config] of Object.entries(OSM_QUERIES)) {
          for (const tag of config.tags) {
            const [key, value] = tag.split('=');
            if (tags[key] === value) {
              detectedType = typeKey as Place['type'];
              break;
            }
          }
        }

        // 住所を構築
        const address = buildAddress(tags);

        // 営業時間
        const hours = tags.opening_hours;

        // 電話番号
        const phone = tags.phone || tags['contact:phone'];

        // 特徴を抽出
        const features: string[] = [];
        if (tags.wheelchair === 'yes') features.push('バリアフリー');
        if (tags.internet_access === 'wlan' || tags.internet_access === 'yes') features.push('WiFi');
        if (tags.outdoor_seating === 'yes') features.push('テラス席');
        if (tags.takeaway === 'yes') features.push('テイクアウト');
        if (tags.dog === 'yes' || tags.dogs === 'yes') features.push('犬OK');
        if (tags.parking) features.push('駐車場');

        places.push({
          id: `osm-${element.id}`,
          name: tags['name:ja'] || tags.name,
          address,
          latitude: placeLat,
          longitude: placeLon,
          phone,
          type: detectedType,
          features: features.length > 0 ? features : undefined,
          hours,
        });
      }
    }

    console.log(`[Overpass API] ${places.length}件の施設を取得`);
  } catch (error) {
    console.error('[Overpass API] Error:', error);
  }

  return places;
}

// 住所を構築
function buildAddress(tags: Record<string, string>): string {
  const parts: string[] = [];

  // 日本式住所
  if (tags['addr:province'] || tags['addr:city'] || tags['addr:street']) {
    if (tags['addr:province']) parts.push(tags['addr:province']);
    if (tags['addr:city']) parts.push(tags['addr:city']);
    if (tags['addr:district']) parts.push(tags['addr:district']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  }
  // 完全な住所
  else if (tags['addr:full']) {
    return tags['addr:full'];
  }
  // フォールバック
  else if (tags.address) {
    return tags.address;
  }

  return parts.length > 0 ? parts.join('') : '住所情報なし';
}

// ================================================
// 日本の逆ジオコーディング（Nominatim）
// ================================================
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&accept-language=ja`,
      {
        headers: {
          'User-Agent': 'WansapoApp/1.0',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.display_name) {
        // 日本の住所形式に整形
        const parts = data.display_name.split(', ').reverse();
        return parts.slice(0, 4).join('');
      }
    }
  } catch (error) {
    console.error('[Nominatim] Error:', error);
  }

  return '';
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

    // OpenStreetMap (Overpass API) で検索
    const places = await searchOverpassAPI(lat, lng, radius, type);

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
      index === self.findIndex(p => p.name === place.name && p.type === place.type)
    );

    console.log(`[Places API] 結果: ${uniquePlaces.length}件`);

    return NextResponse.json({
      places: uniquePlaces,
      count: uniquePlaces.length,
      userLocation: { latitude: lat, longitude: lng },
      searchParams: { radius, type },
      source: 'openstreetmap',
    });
  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
