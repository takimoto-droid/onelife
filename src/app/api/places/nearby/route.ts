import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ================================================
// 周辺施設検索API
// ================================================
//
// 【機能】
// ユーザーの現在地から指定範囲内の施設を検索
// Haversine公式で距離を計算し、近い順にソート
//
// 【MVP実装】
// 現在地周辺にモック施設を動的生成
// 本番環境ではGoogle Places APIに置き換え
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
// ユーザーの現在地周辺に施設を動的生成
// ================================================
function generateNearbyPlaces(userLat: number, userLon: number): Place[] {
  // 施設テンプレート
  const templates = {
    vet: [
      { name: 'さくら動物病院', features: ['夜間対応', '駐車場あり'] },
      { name: 'ペットクリニック', features: ['予約制', '日曜診療'] },
      { name: 'アニマルケアセンター', features: ['24時間', '救急対応'] },
      { name: 'どうぶつ医療センター', features: ['専門医在籍'] },
      { name: 'わんにゃん病院', features: ['トリミング併設'] },
    ],
    dogrun: [
      { name: '○○公園ドッグラン', features: ['無料', '大型犬OK', '水飲み場'] },
      { name: 'わんわんパーク', features: ['会員制', '小型犬エリア'] },
      { name: 'ドッグフィールド', features: ['貸切可', '駐車場あり'] },
      { name: '緑地ドッグラン', features: ['芝生', '日陰あり'] },
    ],
    cafe: [
      { name: 'ドッグカフェ PAWS', features: ['室内OK', 'テラス席'] },
      { name: 'カフェ わんこ家', features: ['ドッグメニュー', '誕生日ケーキ'] },
      { name: 'Dog Cafe Terrace', features: ['予約可', '大型犬OK'] },
      { name: 'ペットカフェ ハッピー', features: ['個室あり'] },
    ],
    petshop: [
      { name: 'ペットショップ わんにゃん', features: ['品揃え豊富'] },
      { name: 'コジマ', features: ['大型店', 'トリミング'] },
      { name: 'イオンペット', features: ['駐車場無料'] },
      { name: 'ペットの専門店', features: ['相談コーナー'] },
    ],
    trimming: [
      { name: 'わんわんトリミング', features: ['完全予約制', '送迎あり'] },
      { name: 'ペットサロン HAPPY', features: ['オーガニック', '小型犬専門'] },
      { name: 'グルーミングサロン', features: ['当日予約OK'] },
      { name: 'ドッグビューティー', features: ['カット専門'] },
    ],
    walkspot: [
      { name: '○○公園', features: ['広い芝生', '木陰多い'] },
      { name: '○○緑道', features: ['遊歩道', '桜の名所'] },
      { name: '河川敷公園', features: ['ランニングコース'] },
      { name: '森林公園', features: ['自然豊か', '駐車場あり'] },
    ],
  };

  const places: Place[] = [];
  const types: Array<keyof typeof templates> = ['vet', 'dogrun', 'cafe', 'petshop', 'trimming', 'walkspot'];

  // 各タイプごとに施設を生成
  types.forEach((type, typeIndex) => {
    const typeTemplates = templates[type];

    typeTemplates.forEach((template, i) => {
      // ユーザーの現在地からランダムな距離・方角に配置
      const distanceKm = 0.1 + Math.random() * 4; // 100m〜4km
      const angle = (typeIndex * 60 + i * 30 + Math.random() * 20) * (Math.PI / 180);

      // 緯度経度のオフセット（1度 ≈ 111km）
      const latOffset = (distanceKm / 111) * Math.cos(angle);
      const lonOffset = (distanceKm / (111 * Math.cos(userLat * Math.PI / 180))) * Math.sin(angle);

      const placeLat = userLat + latOffset;
      const placeLon = userLon + lonOffset;

      // 住所を生成（緯度経度から概算）
      const address = generateAddress(placeLat, placeLon);

      places.push({
        id: `${type}-${i}`,
        name: template.name.replace('○○', getAreaName(placeLat, placeLon)),
        address,
        latitude: placeLat,
        longitude: placeLon,
        phone: type === 'vet' || type === 'trimming' ? generatePhone() : undefined,
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(50 + Math.random() * 300),
        openNow: Math.random() > 0.2,
        type,
        features: template.features,
        hours: getHours(type),
      });
    });
  });

  return places;
}

// 緯度経度からエリア名を推定
function getAreaName(lat: number, lon: number): string {
  // 日本国内かどうかで分岐
  if (lat >= 24 && lat <= 46 && lon >= 122 && lon <= 154) {
    const areas = ['中央', '東', '西', '南', '北', '本町', '緑', '桜', '若葉', '青葉'];
    return areas[Math.floor(Math.random() * areas.length)];
  }
  return 'Central';
}

// 緯度経度から住所を生成
function generateAddress(lat: number, lon: number): string {
  // 日本国内かどうかで分岐
  if (lat >= 24 && lat <= 46 && lon >= 122 && lon <= 154) {
    const prefectures = ['東京都', '神奈川県', '千葉県', '埼玉県', '大阪府', '愛知県', '福岡県'];
    const cities = ['中央区', '港区', '新宿区', '渋谷区', '品川区', '目黒区', '世田谷区'];
    const pref = prefectures[Math.floor(Math.random() * prefectures.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const chome = Math.floor(1 + Math.random() * 5);
    const ban = Math.floor(1 + Math.random() * 20);
    return `${pref}${city}${chome}-${ban}`;
  }
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

// 電話番号を生成
function generatePhone(): string {
  const area = ['03', '045', '044', '048', '043'][Math.floor(Math.random() * 5)];
  const num1 = Math.floor(1000 + Math.random() * 9000);
  const num2 = Math.floor(1000 + Math.random() * 9000);
  return `${area}-${num1}-${num2}`;
}

// 営業時間を取得
function getHours(type: string): string {
  switch (type) {
    case 'vet': return '9:00-19:00';
    case 'dogrun': return '日の出〜日没';
    case 'cafe': return '11:00-20:00';
    case 'petshop': return '10:00-21:00';
    case 'trimming': return '10:00-18:00';
    case 'walkspot': return '24時間';
    default: return '10:00-18:00';
  }
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

    // ユーザーの現在地周辺に施設を生成
    let places = generateNearbyPlaces(lat, lng);

    // タイプでフィルター
    if (type !== 'all') {
      places = places.filter(p => p.type === type);
    }

    // 距離を計算
    const placesWithDistance: PlaceWithDistance[] = places.map(place => {
      const distance = calculateDistance(lat, lng, place.latitude, place.longitude);
      return {
        ...place,
        distance,
        distanceText: formatDistance(distance),
        mapUrl: generateMapUrl(lat, lng, place.latitude, place.longitude),
      };
    });

    // 範囲内のみ
    const filtered = placesWithDistance.filter(p => p.distance <= radius);

    // 距離順ソート
    filtered.sort((a, b) => a.distance - b.distance);

    console.log(`[Places API] 結果: ${filtered.length}件`);

    return NextResponse.json({
      places: filtered,
      count: filtered.length,
      userLocation: { latitude: lat, longitude: lng },
      searchParams: { radius, type },
    });
  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
