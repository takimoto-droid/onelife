import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ================================================
// 周辺施設検索API（Google Places API対応）
// ================================================
//
// 【機能】
// ユーザーの現在地から指定範囲内の施設を検索
// Google Places APIで実際の施設を取得
//
// 【API】
// GOOGLE_PLACES_API_KEYが設定されている場合: 本番API
// 設定されていない場合: モックデータ
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

// 施設タイプとGoogle Places APIの検索クエリのマッピング
const TYPE_SEARCH_QUERIES: Record<string, { query: string; googleType?: string }> = {
  vet: { query: '動物病院', googleType: 'veterinary_care' },
  dogrun: { query: 'ドッグラン' },
  petshop: { query: 'ペットショップ', googleType: 'pet_store' },
  trimming: { query: 'トリミングサロン 犬' },
  cafe: { query: 'ドッグカフェ' },
  walkspot: { query: '公園 犬', googleType: 'park' },
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
// Google Places API（Text Search）を使用
// ================================================
async function searchGooglePlaces(
  lat: number,
  lng: number,
  radius: number,
  type: string,
  apiKey: string
): Promise<Place[]> {
  const places: Place[] = [];
  const typesToSearch = type === 'all'
    ? Object.keys(TYPE_SEARCH_QUERIES)
    : [type];

  for (const placeType of typesToSearch) {
    const searchConfig = TYPE_SEARCH_QUERIES[placeType];
    if (!searchConfig) continue;

    try {
      // Google Places API (New) - Text Search
      const url = 'https://places.googleapis.com/v1/places:searchText';

      const requestBody = {
        textQuery: searchConfig.query,
        locationBias: {
          circle: {
            center: {
              latitude: lat,
              longitude: lng,
            },
            radius: radius,
          },
        },
        languageCode: 'ja',
        maxResultCount: 10,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.currentOpeningHours,places.regularOpeningHours',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error(`[Google Places API] Error for ${placeType}:`, response.status, await response.text());
        continue;
      }

      const data = await response.json();

      if (data.places) {
        for (const place of data.places) {
          // 営業時間のテキストを生成
          let hoursText: string | undefined;
          if (place.regularOpeningHours?.weekdayDescriptions) {
            hoursText = place.regularOpeningHours.weekdayDescriptions[0];
          }

          places.push({
            id: place.id,
            name: place.displayName?.text || '名称不明',
            address: place.formattedAddress || '',
            latitude: place.location?.latitude || 0,
            longitude: place.location?.longitude || 0,
            phone: place.nationalPhoneNumber,
            rating: place.rating,
            reviewCount: place.userRatingCount,
            openNow: place.currentOpeningHours?.openNow,
            type: placeType as Place['type'],
            hours: hoursText,
          });
        }
      }
    } catch (error) {
      console.error(`[Google Places API] Error fetching ${placeType}:`, error);
    }
  }

  return places;
}

// ================================================
// モックデータ生成（APIキーがない場合のフォールバック）
// ================================================
function generateMockPlaces(userLat: number, userLon: number): Place[] {
  const templates = {
    vet: [
      { name: 'さくら動物病院', features: ['夜間対応', '駐車場あり'] },
      { name: 'ペットクリニック', features: ['予約制', '日曜診療'] },
      { name: 'アニマルケアセンター', features: ['24時間', '救急対応'] },
    ],
    dogrun: [
      { name: '中央公園ドッグラン', features: ['無料', '大型犬OK'] },
      { name: 'わんわんパーク', features: ['会員制', '小型犬エリア'] },
    ],
    cafe: [
      { name: 'ドッグカフェ PAWS', features: ['室内OK', 'テラス席'] },
      { name: 'カフェ わんこ家', features: ['ドッグメニュー'] },
    ],
    petshop: [
      { name: 'ペットショップ わんにゃん', features: ['品揃え豊富'] },
    ],
    trimming: [
      { name: 'わんわんトリミング', features: ['完全予約制'] },
    ],
    walkspot: [
      { name: '緑地公園', features: ['広い芝生', '木陰多い'] },
    ],
  };

  const places: Place[] = [];
  const types = Object.keys(templates) as Array<keyof typeof templates>;

  types.forEach((type, typeIndex) => {
    const typeTemplates = templates[type];
    typeTemplates.forEach((template, i) => {
      const distanceKm = 0.2 + Math.random() * 3;
      const angle = (typeIndex * 60 + i * 45) * (Math.PI / 180);
      const latOffset = (distanceKm / 111) * Math.cos(angle);
      const lonOffset = (distanceKm / (111 * Math.cos(userLat * Math.PI / 180))) * Math.sin(angle);

      places.push({
        id: `mock-${type}-${i}`,
        name: template.name,
        address: '東京都○○区○○',
        latitude: userLat + latOffset,
        longitude: userLon + lonOffset,
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(50 + Math.random() * 200),
        openNow: Math.random() > 0.3,
        type,
        features: template.features,
        hours: '10:00-19:00',
      });
    });
  });

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

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    let places: Place[];

    if (apiKey) {
      console.log('[Places API] Google Places APIを使用');
      places = await searchGooglePlaces(lat, lng, radius, type, apiKey);
    } else {
      console.log('[Places API] モックデータを使用（APIキー未設定）');
      places = generateMockPlaces(lat, lng);
      if (type !== 'all') {
        places = places.filter(p => p.type === type);
      }
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

    // 重複除去（同じ名前の施設）
    const uniquePlaces = placesWithDistance.filter((place, index, self) =>
      index === self.findIndex(p => p.name === place.name)
    );

    console.log(`[Places API] 結果: ${uniquePlaces.length}件`);

    return NextResponse.json({
      places: uniquePlaces,
      count: uniquePlaces.length,
      userLocation: { latitude: lat, longitude: lng },
      searchParams: { radius, type },
      source: apiKey ? 'google' : 'mock',
    });
  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
