import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// 鳴き声の種類と感情の定義
const BARK_TYPES = [
  { pattern: 'ワンワン', emotion: '興奮・喜び', meaning: '嬉しい！遊びたい！', context: '飼い主が帰ってきた時や遊びを期待している時' },
  { pattern: 'ワン！', emotion: '注意喚起', meaning: '何か気になることがあるよ', context: '来客や物音に気づいた時' },
  { pattern: 'クーン', emotion: '寂しさ・甘え', meaning: 'かまってほしいな...', context: '一人にされた時や甘えたい時' },
  { pattern: 'ウー', emotion: '警戒・不安', meaning: '怖いよ、近づかないで', context: '見知らぬものや不安を感じた時' },
  { pattern: 'キャンキャン', emotion: '痛み・恐怖', meaning: '痛いよ！怖いよ！', context: '痛みを感じた時や強い恐怖を感じた時' },
  { pattern: 'ハァハァ', emotion: '暑さ・疲労', meaning: '暑いよ、疲れたよ', context: '運動後や暑い日' },
  { pattern: 'ウォーン', emotion: '孤独・呼びかけ', meaning: '誰かいないの？', context: '一人で長時間過ごした時' },
  { pattern: 'グルグル', emotion: '満足・リラックス', meaning: '気持ちいい〜', context: '撫でられている時やくつろいでいる時' },
];

// 音声分析結果を生成（モック）
function analyzeVoice(): {
  emotion: string;
  meaning: string;
  confidence: number;
  advice: string;
  barkType: string;
} {
  const bark = BARK_TYPES[Math.floor(Math.random() * BARK_TYPES.length)];
  const confidence = Math.floor(60 + Math.random() * 35); // 60-95%

  const advices: Record<string, string> = {
    '興奮・喜び': 'たくさん遊んであげましょう。適度な運動は犬の健康に良いです。',
    '注意喚起': '何に反応しているか確認してあげましょう。褒めて安心させてあげると良いでしょう。',
    '寂しさ・甘え': '少し時間を取ってスキンシップしてあげましょう。',
    '警戒・不安': '無理に近づけず、安心できる環境を作ってあげましょう。',
    '痛み・恐怖': '体調や周囲の環境を確認してください。続く場合は獣医師に相談を。',
    '暑さ・疲労': '水分補給と休息を取らせてあげましょう。涼しい場所で休ませてください。',
    '孤独・呼びかけ': '長時間の留守番は避け、帰宅時はたくさん褒めてあげましょう。',
    '満足・リラックス': 'とても良い状態です。このまま穏やかな時間を過ごしましょう。',
  };

  return {
    emotion: bark.emotion,
    meaning: bark.meaning,
    confidence,
    advice: advices[bark.emotion] || 'ワンちゃんの様子をよく観察してあげてください。',
    barkType: bark.pattern,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // プレミアム会員チェック
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionStatus: true },
    });

    if (!user || (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'trialing')) {
      return NextResponse.json(
        {
          error: 'この機能はPremiumメンバー限定です',
          requiresPremium: true,
        },
        { status: 403 }
      );
    }

    // 音声データを受け取る（実際のAPIでは音声ファイルを処理）
    // const formData = await request.formData();
    // const audioFile = formData.get('audio');

    // モック: 音声分析を実行
    // 実際のAPIではWhisper APIなどで音声を解析
    await new Promise(resolve => setTimeout(resolve, 1500)); // 分析時間をシミュレート

    const result = analyzeVoice();

    return NextResponse.json({
      success: true,
      result: {
        ...result,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Voice translation error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
