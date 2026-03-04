import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// モック施設データ（実際はGoogle Places APIを使用）
const MOCK_PLACES = {
  vet: [
    {
      id: 'vet-1',
      name: 'さくら動物病院',
      address: '東京都渋谷区〇〇町1-2-3',
      distance: 350,
      rating: 4.5,
      openNow: true,
      type: 'vet' as const,
    },
    {
      id: 'vet-2',
      name: 'ペットクリニック青山',
      address: '東京都港区青山1-1-1',
      distance: 800,
      rating: 4.8,
      openNow: true,
      type: 'vet' as const,
    },
    {
      id: 'vet-3',
      name: 'アニマルケアセンター',
      address: '東京都渋谷区代々木2-3-4',
      distance: 1200,
      rating: 4.2,
      openNow: false,
      type: 'vet' as const,
    },
    {
      id: 'vet-4',
      name: 'どうぶつ医療センター',
      address: '東京都新宿区西新宿3-5-6',
      distance: 1500,
      rating: 4.6,
      openNow: true,
      type: 'vet' as const,
    },
  ],
  dogrun: [
    {
      id: 'dogrun-1',
      name: '代々木公園ドッグラン',
      address: '東京都渋谷区代々木神園町',
      distance: 500,
      rating: 4.3,
      openNow: true,
      type: 'dogrun' as const,
    },
    {
      id: 'dogrun-2',
      name: '駒沢公園ドッグラン',
      address: '東京都世田谷区駒沢公園',
      distance: 2000,
      rating: 4.5,
      openNow: true,
      type: 'dogrun' as const,
    },
    {
      id: 'dogrun-3',
      name: 'わんわんパーク',
      address: '東京都目黒区中目黒1-1-1',
      distance: 1800,
      rating: 4.0,
      openNow: false,
      type: 'dogrun' as const,
    },
  ],
  petshop: [
    {
      id: 'petshop-1',
      name: 'ペットショップ わんにゃん',
      address: '東京都渋谷区道玄坂2-1-1',
      distance: 300,
      rating: 4.1,
      openNow: true,
      type: 'petshop' as const,
    },
    {
      id: 'petshop-2',
      name: 'コジマ 渋谷店',
      address: '東京都渋谷区神南1-2-3',
      distance: 600,
      rating: 4.4,
      openNow: true,
      type: 'petshop' as const,
    },
    {
      id: 'petshop-3',
      name: 'ペットの専門店 コーナン',
      address: '東京都世田谷区三軒茶屋2-5-6',
      distance: 1500,
      rating: 3.9,
      openNow: true,
      type: 'petshop' as const,
    },
    {
      id: 'petshop-4',
      name: 'イオンペット',
      address: '東京都品川区大崎1-1-1',
      distance: 2200,
      rating: 4.2,
      openNow: true,
      type: 'petshop' as const,
    },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'vet') as 'vet' | 'dogrun' | 'petshop';
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    // 実際の実装ではGoogle Places APIを使用
    // ここではモックデータを返す

    let places = MOCK_PLACES[type] || [];

    // 位置情報がある場合は距離をランダムに調整（デモ用）
    if (lat && lng) {
      places = places.map((place) => ({
        ...place,
        distance: Math.round(place.distance * (0.8 + Math.random() * 0.4)),
      }));
    }

    // 距離順にソート
    places.sort((a, b) => a.distance - b.distance);

    return NextResponse.json({ places });
  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
