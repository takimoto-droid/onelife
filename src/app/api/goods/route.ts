import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// モックグッズデータ
const MOCK_GOODS = [
  {
    id: '1',
    title: '話題の知育おもちゃ「ノーズワークマット」',
    description: 'おやつを隠して嗅覚を刺激！雨の日の室内遊びに最適です。ストレス解消にも効果的。',
    imageUrl: '/images/goods/nosework.jpg',
    category: 'toy',
    price: 2980,
    tags: ['知育', '室内遊び', '人気'],
    publishedAt: '2024-01-15',
  },
  {
    id: '2',
    title: '獣医師監修の無添加おやつ',
    description: '国産鶏ささみ100%使用。無添加で安心して与えられます。小型犬でも食べやすいサイズ。',
    imageUrl: '/images/goods/treat.jpg',
    category: 'food',
    price: 1280,
    tags: ['無添加', '国産', 'おやつ'],
    publishedAt: '2024-01-10',
  },
  {
    id: '3',
    title: '冬でも暖かい犬用ブランケット',
    description: 'もふもふ素材で暖かさ抜群。洗濯機で丸洗いOK。Sサイズ〜XLサイズまで豊富なサイズ展開。',
    imageUrl: '/images/goods/blanket.jpg',
    category: 'care',
    price: 3480,
    tags: ['防寒', '洗える', '冬用'],
    publishedAt: '2024-01-08',
  },
  {
    id: '4',
    title: 'おしゃれなレインコート 2024年新作',
    description: '防水・撥水加工で雨の日も快適に散歩。反射テープ付きで夜間も安心。6色展開。',
    imageUrl: '/images/goods/raincoat.jpg',
    category: 'fashion',
    price: 4980,
    tags: ['雨具', 'おしゃれ', '新作'],
    publishedAt: '2024-01-05',
  },
  {
    id: '5',
    title: 'ロープトイ 3本セット',
    description: '丈夫なコットンロープで長持ち。歯の健康維持にも。引っ張りっこ遊びに最適。',
    imageUrl: '/images/goods/rope.jpg',
    category: 'toy',
    price: 1580,
    tags: ['歯磨き', '丈夫', 'セット'],
    publishedAt: '2024-01-03',
  },
  {
    id: '6',
    title: '折りたたみ式 ペット用キャリーバッグ',
    description: '軽量で持ち運び便利。飛行機持ち込みOKサイズ。通気性の良いメッシュ素材。',
    imageUrl: '/images/goods/carrier.jpg',
    category: 'outdoor',
    price: 6980,
    tags: ['旅行', '軽量', '機内持込'],
    publishedAt: '2024-01-01',
  },
  {
    id: '7',
    title: '低刺激シャンプー 子犬から使える',
    description: '敏感肌のワンちゃんにも安心。天然由来成分配合。泡立ち良く、すすぎも簡単。',
    imageUrl: '/images/goods/shampoo.jpg',
    category: 'care',
    price: 1980,
    tags: ['低刺激', '子犬', 'シャンプー'],
    publishedAt: '2023-12-28',
  },
  {
    id: '8',
    title: 'グレインフリー ドッグフード',
    description: '穀物不使用で消化に優しい。チキン&サーモン味。小粒で食べやすい。',
    imageUrl: '/images/goods/dogfood.jpg',
    category: 'food',
    price: 3980,
    tags: ['グレインフリー', '消化', 'プレミアム'],
    publishedAt: '2023-12-25',
  },
  {
    id: '9',
    title: '自動給水器 フィルター付き',
    description: '常に新鮮な水を提供。活性炭フィルターで不純物を除去。静音設計で夜も安心。',
    imageUrl: '/images/goods/water.jpg',
    category: 'care',
    price: 4280,
    tags: ['自動', '清潔', '静音'],
    publishedAt: '2023-12-20',
  },
  {
    id: '10',
    title: 'ドッグブーツ 4足セット',
    description: '暑いアスファルトや冬の雪道から肉球を守る。防水・防滑加工。脱げにくい設計。',
    imageUrl: '/images/goods/boots.jpg',
    category: 'fashion',
    price: 2980,
    tags: ['肉球保護', '防水', '4足'],
    publishedAt: '2023-12-18',
  },
  {
    id: '11',
    title: 'アウトドア用 折りたたみボウル',
    description: '散歩やお出かけに便利。シリコン製で軽量。カラビナ付きでリードに取り付け可能。',
    imageUrl: '/images/goods/bowl.jpg',
    category: 'outdoor',
    price: 980,
    tags: ['携帯', '軽量', 'お出かけ'],
    publishedAt: '2023-12-15',
  },
  {
    id: '12',
    title: 'ぬいぐるみ付き 音が鳴るおもちゃ',
    description: '可愛いぬいぐるみの中にカシャカシャ素材入り。ワンちゃんの興味を引きつける。',
    imageUrl: '/images/goods/plush.jpg',
    category: 'toy',
    price: 1480,
    tags: ['音が鳴る', 'ぬいぐるみ', 'かわいい'],
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

    let goods = MOCK_GOODS;

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
