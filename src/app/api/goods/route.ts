import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// アフィリエイトタグ（実際はenv変数から取得）
const AFFILIATE_TAG = 'wanlife-22';

// Amazonアフィリエイトリンクを生成
function generateAmazonUrl(asin: string): string {
  return `https://www.amazon.co.jp/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

// Amazon商品画像URL生成（実際のAmazon画像URLパターン）
// 画像IDはASINと異なる場合があるが、MVPではプレースホルダーまたは実際の画像URLを使用
function generateAmazonImageUrl(imageId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const sizeCode = size === 'small' ? 'SL200' : size === 'large' ? 'SL500' : 'SL300';
  return `https://m.media-amazon.com/images/I/${imageId}._AC_${sizeCode}_.jpg`;
}

// モックグッズデータ（実際のAmazon商品画像URLを使用）
const MOCK_GOODS = [
  {
    id: '1',
    asin: 'B08YNQR2NM',
    title: '犬用 ノーズワークマット 知育おもちゃ',
    description: 'おやつを隠して嗅覚を刺激！雨の日の室内遊びに最適。ストレス解消にも効果的。',
    imageId: '71pVHU8OEYL', // 実際のAmazon画像ID
    category: 'toy',
    price: 2980,
    originalPrice: 3980,
    rating: 4.5,
    reviewCount: 1234,
    isPrime: true,
    tags: ['知育', '室内遊び', '人気'],
    publishedAt: '2024-01-15',
  },
  {
    id: '2',
    asin: 'B07WLWN2ZM',
    title: '獣医師監修 国産 無添加 鶏ささみジャーキー',
    description: '国産鶏ささみ100%使用。無添加で安心して与えられます。小型犬でも食べやすいサイズ。',
    imageId: '71qQzLWaSeL',
    category: 'food',
    price: 1280,
    rating: 4.7,
    reviewCount: 3456,
    isPrime: true,
    tags: ['無添加', '国産', 'おやつ'],
    publishedAt: '2024-01-10',
  },
  {
    id: '3',
    asin: 'B09NNGC5K7',
    title: 'ペット用ブランケット もふもふ 洗濯可能',
    description: 'もふもふ素材で暖かさ抜群。洗濯機で丸洗いOK。Sサイズ〜XLサイズまで豊富なサイズ展開。',
    imageId: '71eT-DqM6dL',
    category: 'care',
    price: 3480,
    originalPrice: 4280,
    rating: 4.3,
    reviewCount: 892,
    isPrime: true,
    tags: ['防寒', '洗える', '冬用'],
    publishedAt: '2024-01-08',
  },
  {
    id: '4',
    asin: 'B0BN1QNXGM',
    title: '犬用レインコート 反射テープ付き 防水',
    description: '防水・撥水加工で雨の日も快適に散歩。反射テープ付きで夜間も安心。',
    imageId: '71qwsC+Rt3L',
    category: 'fashion',
    price: 4980,
    rating: 4.2,
    reviewCount: 567,
    isPrime: false,
    tags: ['雨具', 'おしゃれ', '防水'],
    publishedAt: '2024-01-05',
  },
  {
    id: '5',
    asin: 'B07S596XJ7',
    title: 'ロープトイ 3本セット コットン 歯磨き効果',
    description: '丈夫なコットンロープで長持ち。歯の健康維持にも。引っ張りっこ遊びに最適。',
    imageId: '71YvJyVzPBL',
    category: 'toy',
    price: 1580,
    originalPrice: 1980,
    rating: 4.4,
    reviewCount: 2345,
    isPrime: true,
    tags: ['歯磨き', '丈夫', 'セット'],
    publishedAt: '2024-01-03',
  },
  {
    id: '6',
    asin: 'B08CXNQ8BM',
    title: '折りたたみ ペットキャリー 機内持込対応',
    description: '軽量で持ち運び便利。飛行機持ち込みOKサイズ。通気性の良いメッシュ素材。',
    imageId: '81Ls-5LlTfL',
    category: 'outdoor',
    price: 6980,
    originalPrice: 8980,
    rating: 4.6,
    reviewCount: 1567,
    isPrime: true,
    tags: ['旅行', '軽量', '機内持込'],
    publishedAt: '2024-01-01',
  },
  {
    id: '7',
    asin: 'B08D3QPRZM',
    title: '低刺激シャンプー 天然由来成分 子犬OK',
    description: '敏感肌のワンちゃんにも安心。天然由来成分配合。泡立ち良く、すすぎも簡単。',
    imageId: '61vqzUdwGwL',
    category: 'care',
    price: 1980,
    rating: 4.5,
    reviewCount: 789,
    isPrime: true,
    tags: ['低刺激', '子犬', 'シャンプー'],
    publishedAt: '2023-12-28',
  },
  {
    id: '8',
    asin: 'B0752FGWB5',
    title: 'グレインフリー ドッグフード チキン味',
    description: '穀物不使用で消化に優しい。チキン味で食いつき抜群。小粒で食べやすい。',
    imageId: '71P3msNIJaL',
    category: 'food',
    price: 3980,
    originalPrice: 4980,
    rating: 4.6,
    reviewCount: 4567,
    isPrime: true,
    tags: ['グレインフリー', '消化', 'プレミアム'],
    publishedAt: '2023-12-25',
  },
  {
    id: '9',
    asin: 'B08LPSGB9H',
    title: '自動給水器 フィルター付き 静音 2.5L',
    description: '常に新鮮な水を提供。活性炭フィルターで不純物を除去。静音設計で夜も安心。',
    imageId: '71qHovWwN3L',
    category: 'care',
    price: 4280,
    rating: 4.3,
    reviewCount: 1234,
    isPrime: true,
    tags: ['自動', '清潔', '静音'],
    publishedAt: '2023-12-20',
  },
  {
    id: '10',
    asin: 'B096FVBJDQ',
    title: 'ドッグブーツ 4足セット 防水 肉球保護',
    description: '暑いアスファルトや冬の雪道から肉球を守る。防水・防滑加工。脱げにくい設計。',
    imageId: '61pR9Gj-ksL',
    category: 'fashion',
    price: 2980,
    rating: 4.1,
    reviewCount: 456,
    isPrime: false,
    tags: ['肉球保護', '防水', '4足'],
    publishedAt: '2023-12-18',
  },
  {
    id: '11',
    asin: 'B07QQBQ5Q9',
    title: '折りたたみ ペットボウル シリコン製 携帯用',
    description: '散歩やお出かけに便利。シリコン製で軽量。カラビナ付きでリードに取り付け可能。',
    imageId: '61CYr1-THIL',
    category: 'outdoor',
    price: 980,
    rating: 4.4,
    reviewCount: 678,
    isPrime: true,
    tags: ['携帯', '軽量', 'お出かけ'],
    publishedAt: '2023-12-15',
  },
  {
    id: '12',
    asin: 'B08HMRCFQ4',
    title: 'ぬいぐるみ おもちゃ 音が鳴る 3個セット',
    description: '可愛いぬいぐるみの中にカシャカシャ素材入り。ワンちゃんの興味を引きつける。',
    imageId: '71lsUAB5ynL',
    category: 'toy',
    price: 1480,
    rating: 4.2,
    reviewCount: 345,
    isPrime: true,
    tags: ['音が鳴る', 'ぬいぐるみ', 'セット'],
    publishedAt: '2023-12-10',
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';

    let goods = MOCK_GOODS.map(item => ({
      ...item,
      amazonUrl: generateAmazonUrl(item.asin),
      imageUrl: generateAmazonImageUrl(item.imageId, 'medium'),
      imageLarge: generateAmazonImageUrl(item.imageId, 'large'),
    }));

    // カテゴリーでフィルター
    if (category !== 'all') {
      goods = goods.filter((item) => item.category === category);
    }

    // 日付順にソート（新しい順）
    goods.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return NextResponse.json({ goods });
  } catch (error) {
    console.error('Goods API error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
