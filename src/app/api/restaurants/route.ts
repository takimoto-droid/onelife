import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// モックデータ: ペット同伴可能な飲食店
const MOCK_RESTAURANTS = [
  {
    id: 'rest-1',
    name: 'ドッグカフェ WOOF',
    category: 'カフェ',
    address: '東京都渋谷区神宮前1-2-3',
    phone: '03-1234-5678',
    distance: 350,
    rating: 4.6,
    reviewCount: 89,
    priceRange: '¥1,000〜¥2,000',
    petPolicy: {
      dogAllowed: true,
      catAllowed: false,
      sizeLimit: 'all',
      indoorAllowed: true,
      terraceOnly: false,
      petMenu: true,
      waterBowl: true,
    },
    features: ['ドッグラン併設', 'ペットメニュー', 'トリミング予約可'],
    openingHours: '10:00-20:00',
    images: ['/images/rest1.jpg'],
    description: '愛犬と一緒にくつろげるドッグカフェ。ドッグラン併設で思いっきり遊べます。',
  },
  {
    id: 'rest-2',
    name: 'Italian Kitchen Verde',
    category: 'イタリアン',
    address: '東京都港区南青山2-3-4',
    phone: '03-2345-6789',
    distance: 620,
    rating: 4.3,
    reviewCount: 156,
    priceRange: '¥3,000〜¥5,000',
    petPolicy: {
      dogAllowed: true,
      catAllowed: false,
      sizeLimit: 'small',
      indoorAllowed: false,
      terraceOnly: true,
      petMenu: false,
      waterBowl: true,
    },
    features: ['テラス席', 'ペット用水', '広々とした空間'],
    openingHours: '11:30-22:00',
    images: ['/images/rest2.jpg'],
    description: 'テラス席でワンちゃんと一緒に本格イタリアンを楽しめます。',
  },
  {
    id: 'rest-3',
    name: 'Burger & Dogs',
    category: 'ハンバーガー',
    address: '東京都渋谷区代々木3-4-5',
    phone: '03-3456-7890',
    distance: 480,
    rating: 4.1,
    reviewCount: 67,
    priceRange: '¥1,500〜¥2,500',
    petPolicy: {
      dogAllowed: true,
      catAllowed: true,
      sizeLimit: 'medium',
      indoorAllowed: true,
      terraceOnly: false,
      petMenu: true,
      waterBowl: true,
    },
    features: ['店内OK', 'ペットメニュー', 'キッズフレンドリー'],
    openingHours: '11:00-21:00',
    images: ['/images/rest3.jpg'],
    description: 'アメリカンなバーガーをワンちゃんと一緒に。ペット用メニューも充実。',
  },
  {
    id: 'rest-4',
    name: '和食処 花鳥風月',
    category: '和食',
    address: '東京都目黒区中目黒1-5-6',
    phone: '03-4567-8901',
    distance: 890,
    rating: 4.5,
    reviewCount: 203,
    priceRange: '¥4,000〜¥8,000',
    petPolicy: {
      dogAllowed: true,
      catAllowed: false,
      sizeLimit: 'small',
      indoorAllowed: true,
      terraceOnly: false,
      petMenu: false,
      waterBowl: true,
    },
    features: ['個室あり', '落ち着いた雰囲気', '予約推奨'],
    openingHours: '17:00-23:00',
    images: ['/images/rest4.jpg'],
    description: '個室でゆっくりと和食を楽しめます。小型犬のみ同伴可。',
  },
  {
    id: 'rest-5',
    name: 'Beach Side Cafe',
    category: 'カフェ',
    address: '東京都品川区東品川2-6-7',
    phone: '03-5678-9012',
    distance: 1200,
    rating: 4.4,
    reviewCount: 134,
    priceRange: '¥1,000〜¥2,000',
    petPolicy: {
      dogAllowed: true,
      catAllowed: true,
      sizeLimit: 'all',
      indoorAllowed: false,
      terraceOnly: true,
      petMenu: true,
      waterBowl: true,
    },
    features: ['オーシャンビュー', '大型犬OK', 'ペットメニュー'],
    openingHours: '9:00-19:00',
    images: ['/images/rest5.jpg'],
    description: '海を眺めながらワンちゃんとリラックス。広いテラスで大型犬も歓迎。',
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const sizeFilter = searchParams.get('size');
    const indoorOnly = searchParams.get('indoor') === 'true';
    const sortBy = searchParams.get('sort') || 'distance';

    let restaurants = [...MOCK_RESTAURANTS];

    // カテゴリーフィルター
    if (category && category !== 'all') {
      restaurants = restaurants.filter(r => r.category === category);
    }

    // サイズフィルター
    if (sizeFilter && sizeFilter !== 'all') {
      restaurants = restaurants.filter(r => {
        if (r.petPolicy.sizeLimit === 'all') return true;
        if (sizeFilter === 'large') return r.petPolicy.sizeLimit === 'all';
        if (sizeFilter === 'medium') return ['all', 'medium'].includes(r.petPolicy.sizeLimit);
        return true; // small
      });
    }

    // 店内OKフィルター
    if (indoorOnly) {
      restaurants = restaurants.filter(r => r.petPolicy.indoorAllowed);
    }

    // ソート
    if (sortBy === 'rating') {
      restaurants.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'reviews') {
      restaurants.sort((a, b) => b.reviewCount - a.reviewCount);
    } else {
      restaurants.sort((a, b) => a.distance - b.distance);
    }

    // カテゴリー一覧
    const categories = [...new Set(MOCK_RESTAURANTS.map(r => r.category))];

    return NextResponse.json({
      restaurants,
      categories,
      total: restaurants.length,
    });
  } catch (error) {
    console.error('Restaurants API error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
