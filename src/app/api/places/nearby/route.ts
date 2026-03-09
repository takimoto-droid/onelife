import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ================================================
// 周辺施設検索API
// ================================================
//
// 【処理フロー】
// 1. フロントからGPS座標（緯度・経度）を受信
// 2. モックDBから施設データを取得
// 3. Haversine公式で各施設との距離を計算
// 4. 指定範囲内の施設をフィルタリング
// 5. 距離で昇順ソート
// 6. JSONで返却
//
// 【将来的な拡張】
// - Google Places API連携
// - OpenStreetMap API連携
// ================================================

// 施設の型定義
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

// レスポンス用（距離を追加）
interface PlaceWithDistance extends Place {
  distance: number;      // メートル
  distanceText: string;  // 表示用（"0.8km"など）
  mapUrl: string;        // Google Maps URL
}

// ================================================
// Haversine公式：2点間の距離を計算
// ================================================
//
// 【計算式】
// a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
// c = 2 × atan2(√a, √(1−a))
// d = R × c
//
// φ = 緯度, λ = 経度, R = 地球の半径（6371km）
// ================================================
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 地球の半径（メートル）

  const toRad = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // メートル単位で返却
}

// 距離をテキストにフォーマット
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// Google Maps URLを生成
function generateMapUrl(
  userLat: number,
  userLon: number,
  placeLat: number,
  placeLon: number,
  placeName: string
): string {
  const origin = `${userLat},${userLon}`;
  const destination = `${placeLat},${placeLon}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&destination_place_id=${encodeURIComponent(placeName)}&travelmode=walking`;
}

// ================================================
// モック施設データベース
// ================================================
//
// 【注意】
// 実際の緯度経度を使用（東京都内）
// 本番環境ではGoogle Places APIまたはDBから取得
// ================================================
const PLACES_DATABASE: Place[] = [
  // === 動物病院 ===
  {
    id: 'vet-1',
    name: '代々木動物病院',
    address: '東京都渋谷区代々木1-30-1',
    latitude: 35.6833,
    longitude: 139.7022,
    phone: '03-3379-5811',
    rating: 4.5,
    reviewCount: 128,
    openNow: true,
    type: 'vet',
    hours: '9:00-19:00',
  },
  {
    id: 'vet-2',
    name: '渋谷ペットクリニック',
    address: '東京都渋谷区神南1-20-8',
    latitude: 35.6625,
    longitude: 139.6997,
    phone: '03-3461-0012',
    rating: 4.8,
    reviewCount: 256,
    openNow: true,
    type: 'vet',
    hours: '10:00-20:00',
  },
  {
    id: 'vet-3',
    name: 'アニマルケアセンター恵比寿',
    address: '東京都渋谷区恵比寿1-5-5',
    latitude: 35.6467,
    longitude: 139.7100,
    phone: '03-5421-1234',
    rating: 4.3,
    reviewCount: 89,
    openNow: true,
    type: 'vet',
    hours: '9:30-18:30',
  },
  {
    id: 'vet-4',
    name: '新宿どうぶつ病院',
    address: '東京都新宿区新宿3-15-2',
    latitude: 35.6896,
    longitude: 139.7006,
    phone: '03-3354-0303',
    rating: 4.6,
    reviewCount: 312,
    openNow: true,
    type: 'vet',
    hours: '9:00-21:00',
  },
  {
    id: 'vet-5',
    name: '目黒ペットケアクリニック',
    address: '東京都目黒区中目黒2-10-3',
    latitude: 35.6433,
    longitude: 139.6994,
    phone: '03-3710-0022',
    rating: 4.4,
    reviewCount: 156,
    openNow: false,
    type: 'vet',
    hours: '10:00-18:00',
  },

  // === ドッグラン ===
  {
    id: 'dogrun-1',
    name: '代々木公園ドッグラン',
    address: '東京都渋谷区代々木神園町2-1',
    latitude: 35.6720,
    longitude: 139.6948,
    rating: 4.2,
    reviewCount: 523,
    openNow: true,
    type: 'dogrun',
    features: ['大型犬OK', '水飲み場', '無料'],
    hours: '日の出〜日没',
  },
  {
    id: 'dogrun-2',
    name: '駒沢公園ドッグラン',
    address: '東京都世田谷区駒沢公園1-1',
    latitude: 35.6307,
    longitude: 139.6612,
    rating: 4.6,
    reviewCount: 412,
    openNow: true,
    type: 'dogrun',
    features: ['大型犬エリア', '小型犬エリア', '日陰あり'],
    hours: '9:00-17:00',
  },
  {
    id: 'dogrun-3',
    name: '城南島海浜公園ドッグラン',
    address: '東京都大田区城南島4-2-2',
    latitude: 35.5836,
    longitude: 139.7647,
    rating: 4.5,
    reviewCount: 287,
    openNow: true,
    type: 'dogrun',
    features: ['海が見える', '大型犬OK', '駐車場あり'],
    hours: '7:00-21:00',
  },

  // === ペットショップ ===
  {
    id: 'petshop-1',
    name: 'ペットショップ わんにゃん渋谷',
    address: '東京都渋谷区道玄坂2-10-10',
    latitude: 35.6584,
    longitude: 139.6989,
    phone: '03-3461-5050',
    rating: 4.1,
    reviewCount: 76,
    openNow: true,
    type: 'petshop',
    hours: '10:00-21:00',
  },
  {
    id: 'petshop-2',
    name: 'コジマ 渋谷店',
    address: '東京都渋谷区神南1-21-3',
    latitude: 35.6631,
    longitude: 139.7012,
    phone: '03-3477-1122',
    rating: 4.4,
    reviewCount: 198,
    openNow: true,
    type: 'petshop',
    hours: '10:00-20:00',
  },
  {
    id: 'petshop-3',
    name: 'イオンペット 品川シーサイド店',
    address: '東京都品川区東品川4-12-6',
    latitude: 35.6095,
    longitude: 139.7488,
    phone: '03-5796-4570',
    rating: 4.2,
    reviewCount: 134,
    openNow: true,
    type: 'petshop',
    hours: '10:00-21:00',
  },

  // === トリミング ===
  {
    id: 'trimming-1',
    name: 'わんわんトリミング 恵比寿',
    address: '東京都渋谷区恵比寿西1-8-8',
    latitude: 35.6478,
    longitude: 139.7066,
    phone: '03-5489-3344',
    rating: 4.7,
    reviewCount: 178,
    openNow: true,
    type: 'trimming',
    hours: '10:00-19:00',
  },
  {
    id: 'trimming-2',
    name: 'ペットサロン HAPPY 代官山',
    address: '東京都渋谷区猿楽町24-7',
    latitude: 35.6500,
    longitude: 139.7000,
    phone: '03-3770-5566',
    rating: 4.8,
    reviewCount: 234,
    openNow: true,
    type: 'trimming',
    features: ['オーガニック', '小型犬専門'],
    hours: '9:00-18:00',
  },

  // === ドッグカフェ ===
  {
    id: 'cafe-1',
    name: 'ドッグカフェ PAWS 原宿',
    address: '東京都渋谷区神宮前3-25-5',
    latitude: 35.6695,
    longitude: 139.7077,
    phone: '03-5414-1199',
    rating: 4.4,
    reviewCount: 203,
    openNow: true,
    type: 'cafe',
    features: ['室内OK', '大型犬OK', 'テラス席'],
    hours: '11:00-20:00',
  },
  {
    id: 'cafe-2',
    name: 'カフェ&バー わんこ家',
    address: '東京都渋谷区桜丘町14-10',
    latitude: 35.6558,
    longitude: 139.7000,
    phone: '03-3476-7788',
    rating: 4.3,
    reviewCount: 156,
    openNow: true,
    type: 'cafe',
    features: ['ドッグメニュー', '誕生日ケーキ'],
    hours: '10:00-22:00',
  },
  {
    id: 'cafe-3',
    name: 'Dog Cafe Terrace 中目黒',
    address: '東京都目黒区上目黒1-18-6',
    latitude: 35.6445,
    longitude: 139.6989,
    phone: '03-3713-2233',
    rating: 4.6,
    reviewCount: 289,
    openNow: true,
    type: 'cafe',
    features: ['川沿いテラス', '予約可'],
    hours: '11:00-21:00',
  },

  // === 散歩スポット ===
  {
    id: 'walkspot-1',
    name: '代々木公園',
    address: '東京都渋谷区代々木神園町2-1',
    latitude: 35.6714,
    longitude: 139.6969,
    rating: 4.5,
    reviewCount: 1234,
    openNow: true,
    type: 'walkspot',
    features: ['広い芝生', 'ドッグランあり', '木陰多い'],
    hours: '5:00-20:00',
  },
  {
    id: 'walkspot-2',
    name: '目黒川沿い遊歩道',
    address: '東京都目黒区中目黒〜品川区',
    latitude: 35.6433,
    longitude: 139.6978,
    rating: 4.3,
    reviewCount: 567,
    openNow: true,
    type: 'walkspot',
    features: ['桜の名所', '川沿い', 'カフェ多い'],
    hours: '24時間',
  },
  {
    id: 'walkspot-3',
    name: '新宿御苑（ペット不可エリアあり）',
    address: '東京都新宿区内藤町11',
    latitude: 35.6852,
    longitude: 139.7100,
    rating: 4.4,
    reviewCount: 890,
    openNow: true,
    type: 'walkspot',
    features: ['広大な庭園', '四季の花'],
    hours: '9:00-16:30',
  },
];

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

    // パラメータ取得
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseInt(searchParams.get('radius') || '1000', 10); // メートル
    const type = searchParams.get('type') || 'all';

    // 緯度経度の検証
    if (lat === 0 || lng === 0) {
      return NextResponse.json(
        { error: '位置情報が必要です' },
        { status: 400 }
      );
    }

    console.log(`[Places API] 検索開始: lat=${lat}, lng=${lng}, radius=${radius}m, type=${type}`);

    // 施設をフィルタリング
    let places = PLACES_DATABASE;

    // タイプでフィルター
    if (type !== 'all') {
      places = places.filter(p => p.type === type);
    }

    // 距離を計算して追加
    const placesWithDistance: PlaceWithDistance[] = places.map(place => {
      const distance = calculateDistance(lat, lng, place.latitude, place.longitude);
      return {
        ...place,
        distance,
        distanceText: formatDistance(distance),
        mapUrl: generateMapUrl(lat, lng, place.latitude, place.longitude, place.name),
      };
    });

    // 範囲内の施設のみ
    const filteredPlaces = placesWithDistance.filter(p => p.distance <= radius);

    // 距離で昇順ソート
    filteredPlaces.sort((a, b) => a.distance - b.distance);

    console.log(`[Places API] 検索結果: ${filteredPlaces.length}件`);

    return NextResponse.json({
      places: filteredPlaces,
      count: filteredPlaces.length,
      searchParams: {
        latitude: lat,
        longitude: lng,
        radius,
        type,
      },
    });
  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
