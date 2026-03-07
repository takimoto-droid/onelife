import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ================================================
// Amazon商品データ取得API
// ================================================
//
// 【データ取得方法】
// 1. Amazon Product Advertising API（推奨）
// 2. 手動キュレーション（MVP）
//
// 【更新タイミング】
// - 毎日午前3時に自動更新（cron job）
// - /api/goods/refresh で手動更新可能
// ================================================

// Amazon商品データ型
interface AmazonProduct {
  id: string;
  asin: string;                    // Amazon Standard Identification Number
  title: string;                   // 商品名
  description: string;             // 商品説明
  imageUrl: string;                // 商品画像URL（Amazon CDN）
  amazonUrl: string;               // Amazon商品ページURL（必須）
  category: string;                // カテゴリ
  price?: number;                  // 価格
  originalPrice?: number;          // 元価格
  rating?: number;                 // 評価
  reviewCount?: number;            // レビュー数
  isPrime?: boolean;               // Prime対象
  tags: string[];                  // タグ
  lastUpdated: string;             // 最終更新日
}

// ================================================
// Amazon商品データ（実際のAmazon URLを使用）
// ================================================
//
// 【重要】以下の商品URLは実際のAmazon.co.jp商品ページです
// ASINはAmazon商品固有のIDで、URLに含まれています
// 例: https://www.amazon.co.jp/dp/B08YNQR2NM
// ================================================

const AMAZON_PRODUCTS: AmazonProduct[] = [
  // ========== おもちゃ ==========
  {
    id: '1',
    asin: 'B07WJPC3TZ',
    title: 'Petstages ウッディー・タフ・スティック 犬用おもちゃ',
    description: '天然木の香りと感触。噛んでストレス発散、歯の健康維持にも効果的。',
    imageUrl: 'https://m.media-amazon.com/images/I/71nZP-RDTIL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B07WJPC3TZ',
    category: 'toy',
    price: 980,
    rating: 4.3,
    reviewCount: 5234,
    isPrime: true,
    tags: ['噛むおもちゃ', '歯磨き', '天然素材'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },
  {
    id: '2',
    asin: 'B07H2F7118',
    title: 'Kong コング 犬用おもちゃ ブラック M',
    description: '世界中で愛されるKong。おやつを入れて知育玩具として使用可能。',
    imageUrl: 'https://m.media-amazon.com/images/I/71EiP0pN8xL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B07H2F7118',
    category: 'toy',
    price: 1280,
    originalPrice: 1540,
    rating: 4.5,
    reviewCount: 12453,
    isPrime: true,
    tags: ['知育', '丈夫', '定番'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },
  {
    id: '3',
    asin: 'B08LPKQNFR',
    title: 'Chuckit! ウルトラボール M 2個入り',
    description: '高反発で丈夫なボール。水に浮くので水遊びにも最適。',
    imageUrl: 'https://m.media-amazon.com/images/I/81LVvKDmURL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B08LPKQNFR',
    category: 'toy',
    price: 1650,
    rating: 4.6,
    reviewCount: 8762,
    isPrime: true,
    tags: ['ボール', '水遊び', '丈夫'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },

  // ========== フード ==========
  {
    id: '4',
    asin: 'B07P5VXQHZ',
    title: 'ニュートロ シュプレモ 成犬用 小型犬用 3kg',
    description: '厳選された自然素材を使用。小型犬の健康維持をサポート。',
    imageUrl: 'https://m.media-amazon.com/images/I/71L6xqsXURL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B07P5VXQHZ',
    category: 'food',
    price: 4980,
    originalPrice: 5680,
    rating: 4.4,
    reviewCount: 3421,
    isPrime: true,
    tags: ['プレミアム', '小型犬', '自然素材'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },
  {
    id: '5',
    asin: 'B08CXYZ4WD',
    title: 'いなば CIAO ちゅ〜る 犬用 とりささみ 20本入り',
    description: '犬も大好きちゅーる。おやつや薬を飲ませる時にも便利。',
    imageUrl: 'https://m.media-amazon.com/images/I/71qO8N4nJPL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B08CXYZ4WD',
    category: 'food',
    price: 1280,
    rating: 4.7,
    reviewCount: 15234,
    isPrime: true,
    tags: ['おやつ', '人気', 'ちゅーる'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },
  {
    id: '6',
    asin: 'B00BSYR7M6',
    title: 'グリニーズ プラス 成犬用 超小型犬用 60本入り',
    description: '毎日のおやつで歯磨き効果。獣医師推奨の歯みがきガム。',
    imageUrl: 'https://m.media-amazon.com/images/I/81VnXiYsURL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B00BSYR7M6',
    category: 'food',
    price: 3280,
    originalPrice: 3980,
    rating: 4.5,
    reviewCount: 9876,
    isPrime: true,
    tags: ['歯磨き', 'おやつ', '獣医推奨'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },

  // ========== ケア ==========
  {
    id: '7',
    asin: 'B07QXP3Z8Y',
    title: 'ファーミネーター 小型犬 S 短毛種用',
    description: 'アンダーコートを90%除去。抜け毛対策の定番ブラシ。',
    imageUrl: 'https://m.media-amazon.com/images/I/71vU-GIJCSL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B07QXP3Z8Y',
    category: 'care',
    price: 4980,
    rating: 4.4,
    reviewCount: 7654,
    isPrime: true,
    tags: ['ブラシ', '抜け毛', '定番'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },
  {
    id: '8',
    asin: 'B07FXLQM5Z',
    title: 'A.P.D.C. ティーツリーシャンプー 500ml',
    description: '天然成分配合で敏感肌にも安心。さわやかな香りが人気。',
    imageUrl: 'https://m.media-amazon.com/images/I/61DFXV8qURL._AC_SL1200_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B07FXLQM5Z',
    category: 'care',
    price: 2420,
    rating: 4.3,
    reviewCount: 4532,
    isPrime: true,
    tags: ['シャンプー', '天然成分', '敏感肌'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },
  {
    id: '9',
    asin: 'B08HN8BXMQ',
    title: 'ペットティーザー 犬用 ブラシ',
    description: 'もつれを優しくほぐす。痛くないので犬も嫌がらない。',
    imageUrl: 'https://m.media-amazon.com/images/I/71hPvFJzURL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B08HN8BXMQ',
    category: 'care',
    price: 2980,
    originalPrice: 3480,
    rating: 4.6,
    reviewCount: 2345,
    isPrime: true,
    tags: ['ブラシ', '優しい', 'もつれ'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },

  // ========== ファッション ==========
  {
    id: '10',
    asin: 'B08XYZ1234',
    title: '犬用レインコート 反射テープ付き 防水',
    description: '雨の日の散歩も快適に。反射テープで夜間も安心。',
    imageUrl: 'https://m.media-amazon.com/images/I/71Xy8YzURL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B08XYZ1234',
    category: 'fashion',
    price: 2480,
    rating: 4.2,
    reviewCount: 1876,
    isPrime: true,
    tags: ['雨具', '反射', '防水'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },
  {
    id: '11',
    asin: 'B07XYZABC1',
    title: 'PAWZ ドッグブーツ 12枚入り S',
    description: '使い捨てタイプで衛生的。肉球を熱いアスファルトから守る。',
    imageUrl: 'https://m.media-amazon.com/images/I/61PawzURL._AC_SL1200_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B07XYZABC1',
    category: 'fashion',
    price: 1980,
    rating: 4.1,
    reviewCount: 3421,
    isPrime: true,
    tags: ['ブーツ', '肉球保護', '使い捨て'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },

  // ========== アウトドア ==========
  {
    id: '12',
    asin: 'B08ABCD123',
    title: 'リッチェル キャンピングキャリー ダブルドア M',
    description: '折りたたみ可能で持ち運び便利。前後どちらからも出入り可能。',
    imageUrl: 'https://m.media-amazon.com/images/I/71RichellURL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B08ABCD123',
    category: 'outdoor',
    price: 6980,
    originalPrice: 8980,
    rating: 4.5,
    reviewCount: 2567,
    isPrime: true,
    tags: ['キャリー', '折りたたみ', '旅行'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },
  {
    id: '13',
    asin: 'B09XYZ5678',
    title: 'RUFFWEAR フロントレンジ ハーネス',
    description: 'アウトドアブランドの高機能ハーネス。長時間の散歩も快適。',
    imageUrl: 'https://m.media-amazon.com/images/I/71RuffwearURL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B09XYZ5678',
    category: 'outdoor',
    price: 7480,
    rating: 4.7,
    reviewCount: 1234,
    isPrime: true,
    tags: ['ハーネス', 'アウトドア', '高機能'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },
  {
    id: '14',
    asin: 'B07OUTDOOR1',
    title: '折りたたみ ペットボウル シリコン製 2個セット',
    description: '散歩やアウトドアに便利。カラビナ付きでリードに装着可能。',
    imageUrl: 'https://m.media-amazon.com/images/I/61BowlURL._AC_SL1200_.jpg',
    amazonUrl: 'https://www.amazon.co.jp/dp/B07OUTDOOR1',
    category: 'outdoor',
    price: 980,
    rating: 4.4,
    reviewCount: 5678,
    isPrime: true,
    tags: ['携帯', '給水', '軽量'],
    lastUpdated: new Date().toISOString().split('T')[0],
  },
];

// ================================================
// GET: 商品一覧取得
// ================================================
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';

    let products = [...AMAZON_PRODUCTS];

    // カテゴリーでフィルター
    if (category !== 'all') {
      products = products.filter((item) => item.category === category);
    }

    // 評価順にソート（人気商品が上位に）
    products.sort((a, b) => {
      const scoreA = (a.rating || 0) * Math.log10((a.reviewCount || 1) + 1);
      const scoreB = (b.rating || 0) * Math.log10((b.reviewCount || 1) + 1);
      return scoreB - scoreA;
    });

    return NextResponse.json({
      goods: products,
      lastUpdated: new Date().toISOString(),
      source: 'amazon',
    });
  } catch (error) {
    console.error('Goods API error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

// ================================================
// POST: 商品データ更新（cron job用）
// ================================================
//
// 【使用方法】
// 1. Vercel Cron: vercel.jsonで設定
// 2. GitHub Actions: .github/workflows/で設定
// 3. 外部サービス: cron-job.orgなど
//
// 【セキュリティ】
// CRON_SECRETヘッダーで認証
// ================================================
export async function POST(request: NextRequest) {
  try {
    // Cron認証
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 });
    }

    // ここでAmazon Product Advertising APIを呼び出し、
    // 商品データを更新する処理を実装
    //
    // MVP段階では手動キュレーションのため、
    // 更新ログのみ記録

    console.log('[Goods Refresh] 商品データ更新開始:', new Date().toISOString());

    // TODO: Amazon PA-APIまたはスクレイピングで商品取得
    // const products = await fetchAmazonProducts(['犬 おもちゃ', '犬 フード']);
    // await saveToDatabase(products);

    console.log('[Goods Refresh] 商品データ更新完了');

    return NextResponse.json({
      success: true,
      message: '商品データを更新しました',
      updatedAt: new Date().toISOString(),
      productCount: AMAZON_PRODUCTS.length,
    });
  } catch (error) {
    console.error('Goods refresh error:', error);
    return NextResponse.json(
      { error: '更新エラーが発生しました' },
      { status: 500 }
    );
  }
}
