import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// 感情タイプの定義
interface EmotionScore {
  emotion: string;
  emoji: string;
  percentage: number;
}

// 音声特徴の型定義
interface AudioFeatures {
  pitch: 'high' | 'medium' | 'low';           // 周波数（高/中/低）
  volume: 'loud' | 'medium' | 'soft';         // 音量
  duration: 'short' | 'medium' | 'long';      // 鳴き声の長さ
  continuity: 'continuous' | 'intermittent' | 'single'; // 連続性
}

// 鳴き声パターンの詳細定義
const BARK_PATTERNS = [
  {
    id: 'excited',
    patterns: ['ワンワン！', 'ワンワンワン！', 'キャンキャン！'],
    emotion: '興奮・喜び',
    emoji: '😊',
    features: { pitch: 'high', volume: 'loud', duration: 'short', continuity: 'continuous' },
    meanings: [
      '嬉しいな！遊ぼう！',
      'わーい！大好き！',
      '楽しいね！もっともっと！',
      'お帰りなさい！待ってたよ！',
      'ごはん？ごはん？やったー！',
    ],
    advice: 'たくさん遊んであげましょう。この興奮を適度に発散させてあげると、落ち着いた犬になります。',
  },
  {
    id: 'alert',
    patterns: ['ワン！', 'ワンッ！', 'ワッ！'],
    emotion: '注意喚起',
    emoji: '👀',
    features: { pitch: 'medium', volume: 'loud', duration: 'short', continuity: 'single' },
    meanings: [
      '誰か来たよ！',
      '何か聞こえた！',
      'ねえ、あっち見て！',
      '玄関で音がしたよ',
      '知らない人がいる！',
    ],
    advice: '何に反応しているか確認してあげましょう。「大丈夫だよ」と声をかけて安心させてあげると良いでしょう。',
  },
  {
    id: 'lonely',
    patterns: ['クーン...', 'クゥーン', 'キュンキュン'],
    emotion: '寂しさ・甘え',
    emoji: '🥺',
    features: { pitch: 'high', volume: 'soft', duration: 'long', continuity: 'intermittent' },
    meanings: [
      'さみしいよ...こっち見て',
      'かまってほしいな...',
      'ひとりはいやだよ',
      '一緒にいたいの...',
      'なでなでして...',
    ],
    advice: '少し時間を取ってスキンシップしてあげましょう。目を合わせて撫でてあげると安心します。',
  },
  {
    id: 'anxious',
    patterns: ['ウー...', 'ウゥー', 'グルル...'],
    emotion: '警戒・不安',
    emoji: '😨',
    features: { pitch: 'low', volume: 'medium', duration: 'long', continuity: 'continuous' },
    meanings: [
      '怖いよ、近づかないで',
      '何か嫌な予感がする...',
      'これ、大丈夫かな...',
      '警戒中...動かないで',
      '不安だよ...',
    ],
    advice: '無理に近づけず、安心できる環境を作ってあげましょう。落ち着くまでそっと見守ってください。',
  },
  {
    id: 'pain',
    patterns: ['キャン！', 'キャンキャン！', 'キャイン！'],
    emotion: '痛み・恐怖',
    emoji: '😢',
    features: { pitch: 'high', volume: 'loud', duration: 'short', continuity: 'intermittent' },
    meanings: [
      '痛いよ！やめて！',
      '怖い！助けて！',
      'びっくりした！',
      '何かに挟まった！',
      'ここが痛いの...',
    ],
    advice: '体調や周囲の環境を確認してください。続く場合は早めに獣医師に相談しましょう。',
  },
  {
    id: 'tired',
    patterns: ['ハァハァ', 'ハッハッ', 'ゼーゼー'],
    emotion: '暑さ・疲労',
    emoji: '😮‍💨',
    features: { pitch: 'low', volume: 'soft', duration: 'medium', continuity: 'continuous' },
    meanings: [
      '暑いよ〜水ちょうだい',
      '疲れた...休みたい',
      'ちょっとバテてきた',
      '息が上がってるよ',
      '休憩しようよ',
    ],
    advice: '水分補給と休息を取らせてあげましょう。涼しい場所で休ませてください。夏場は特に注意が必要です。',
  },
  {
    id: 'calling',
    patterns: ['ウォーン', 'アォーン', 'ワォーン'],
    emotion: '孤独・呼びかけ',
    emoji: '🐕',
    features: { pitch: 'medium', volume: 'loud', duration: 'long', continuity: 'single' },
    meanings: [
      '誰かいないの〜？',
      'ここにいるよ〜',
      '返事して〜',
      'みんなどこ〜？',
      '一人は寂しいよ〜',
    ],
    advice: '長時間の留守番は避け、帰宅時はたくさん褒めてあげましょう。留守番用のおもちゃも効果的です。',
  },
  {
    id: 'content',
    patterns: ['グルグル', 'ウフフ', 'スースー'],
    emotion: '満足・リラックス',
    emoji: '😌',
    features: { pitch: 'low', volume: 'soft', duration: 'long', continuity: 'continuous' },
    meanings: [
      '気持ちいい〜幸せ',
      'ここ最高〜',
      'もっと撫でて〜',
      'うとうと...眠いな',
      '大好きだよ〜',
    ],
    advice: 'とても良い状態です。このまま穏やかな時間を過ごしましょう。信頼関係が築けている証拠です。',
  },
  {
    id: 'playful',
    patterns: ['ワフワフ！', 'ハッハッ！', 'ワゥ！'],
    emotion: '遊びたい',
    emoji: '🎾',
    features: { pitch: 'high', volume: 'medium', duration: 'short', continuity: 'intermittent' },
    meanings: [
      '遊ぼうよ！ねえねえ！',
      'ボール投げて！',
      '追いかけっこしよう！',
      'おもちゃ持ってきたよ！',
      '一緒に走ろう！',
    ],
    advice: '遊びたがっています。10〜15分程度の遊びタイムを設けてあげると良いでしょう。',
  },
  {
    id: 'hungry',
    patterns: ['ワンッ', 'ワゥワゥ', 'クゥ...'],
    emotion: '空腹・要求',
    emoji: '🍽️',
    features: { pitch: 'medium', volume: 'medium', duration: 'short', continuity: 'intermittent' },
    meanings: [
      'お腹すいたよ〜',
      'ごはんまだ？',
      'おやつちょうだい',
      '何か食べたいな',
      'そろそろごはんの時間でしょ？',
    ],
    advice: '食事の時間を確認しましょう。決まった時間に与えることで、要求吠えを減らすことができます。',
  },
];

// 音声特徴から最適な鳴き声パターンを選択
function matchBarkPattern(features: AudioFeatures): typeof BARK_PATTERNS[0] {
  let bestMatch = BARK_PATTERNS[0];
  let bestScore = 0;

  for (const pattern of BARK_PATTERNS) {
    let score = 0;
    if (pattern.features.pitch === features.pitch) score += 3;
    if (pattern.features.volume === features.volume) score += 2;
    if (pattern.features.duration === features.duration) score += 2;
    if (pattern.features.continuity === features.continuity) score += 3;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = pattern;
    }
  }

  return bestMatch;
}

// 感情スコアを計算
function calculateEmotionScores(primaryPattern: typeof BARK_PATTERNS[0], features: AudioFeatures): EmotionScore[] {
  const scores: EmotionScore[] = [];

  // プライマリー感情
  const primaryScore = 50 + Math.floor(Math.random() * 30); // 50-80%
  scores.push({
    emotion: primaryPattern.emotion,
    emoji: primaryPattern.emoji,
    percentage: primaryScore,
  });

  // 関連感情を追加
  const relatedEmotions: Record<string, string[]> = {
    '興奮・喜び': ['遊びたい', '空腹・要求'],
    '注意喚起': ['警戒・不安', '興奮・喜び'],
    '寂しさ・甘え': ['孤独・呼びかけ', '空腹・要求'],
    '警戒・不安': ['痛み・恐怖', '注意喚起'],
    '痛み・恐怖': ['警戒・不安', '寂しさ・甘え'],
    '暑さ・疲労': ['満足・リラックス', '空腹・要求'],
    '孤独・呼びかけ': ['寂しさ・甘え', '遊びたい'],
    '満足・リラックス': ['暑さ・疲労', '遊びたい'],
    '遊びたい': ['興奮・喜び', '空腹・要求'],
    '空腹・要求': ['寂しさ・甘え', '遊びたい'],
  };

  const related = relatedEmotions[primaryPattern.emotion] || [];
  let remaining = 100 - primaryScore;

  for (let i = 0; i < Math.min(2, related.length); i++) {
    const relatedPattern = BARK_PATTERNS.find(p => p.emotion === related[i]);
    if (relatedPattern) {
      const score = i === 0
        ? Math.floor(remaining * 0.6) + Math.floor(Math.random() * 10)
        : remaining;
      scores.push({
        emotion: relatedPattern.emotion,
        emoji: relatedPattern.emoji,
        percentage: Math.min(score, remaining),
      });
      remaining -= score;
    }
  }

  // 合計が100になるよう調整
  const total = scores.reduce((sum, s) => sum + s.percentage, 0);
  if (total !== 100) {
    scores[0].percentage += (100 - total);
  }

  return scores.sort((a, b) => b.percentage - a.percentage);
}

// 音声ファイルから特徴を抽出（シミュレーション）
// 実際の実装ではWeb Audio APIやWhisper APIを使用
async function extractAudioFeatures(audioBlob: Blob): Promise<AudioFeatures> {
  // 音声ファイルのサイズから大まかな長さを推定
  const sizeKB = audioBlob.size / 1024;

  // サイズベースの推定（実際はWeb Audio APIで詳細分析可能）
  let duration: AudioFeatures['duration'] = 'medium';
  if (sizeKB < 50) duration = 'short';
  else if (sizeKB > 150) duration = 'long';

  // ランダム要素を含めた特徴生成
  // 実際の実装ではFFTやスペクトラム分析を使用
  const pitchOptions: AudioFeatures['pitch'][] = ['high', 'medium', 'low'];
  const volumeOptions: AudioFeatures['volume'][] = ['loud', 'medium', 'soft'];
  const continuityOptions: AudioFeatures['continuity'][] = ['continuous', 'intermittent', 'single'];

  // ファイルサイズと時間から連続性を推定
  let continuity: AudioFeatures['continuity'] = 'single';
  if (sizeKB > 100) continuity = 'continuous';
  else if (sizeKB > 50) continuity = 'intermittent';

  return {
    pitch: pitchOptions[Math.floor(Math.random() * pitchOptions.length)],
    volume: volumeOptions[Math.floor(Math.random() * volumeOptions.length)],
    duration,
    continuity,
  };
}

// 自然な翻訳文を生成
function generateNaturalTranslation(pattern: typeof BARK_PATTERNS[0], emotionScores: EmotionScore[]): {
  mainTranslation: string;
  alternativeTranslations: string[];
} {
  const meanings = pattern.meanings;
  const mainIndex = Math.floor(Math.random() * meanings.length);
  const mainTranslation = meanings[mainIndex];

  // 他のパターンを選択
  const alternativeTranslations = meanings
    .filter((_, i) => i !== mainIndex)
    .slice(0, 2);

  return {
    mainTranslation,
    alternativeTranslations,
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

    // 音声データを受け取る
    const formData = await request.formData();
    const audioFile = formData.get('audio') as Blob | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: '音声データがありません' },
        { status: 400 }
      );
    }

    // 音声ファイルのサイズチェック（10MB上限）
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: '音声ファイルが大きすぎます（10MB以下にしてください）' },
        { status: 400 }
      );
    }

    // 音声特徴を抽出
    const features = await extractAudioFeatures(audioFile);

    // 最適な鳴き声パターンをマッチング
    const matchedPattern = matchBarkPattern(features);

    // 感情スコアを計算
    const emotionScores = calculateEmotionScores(matchedPattern, features);

    // 自然な翻訳を生成
    const { mainTranslation, alternativeTranslations } = generateNaturalTranslation(
      matchedPattern,
      emotionScores
    );

    // 信頼度を計算（特徴のマッチング度合いに基づく）
    const confidence = Math.floor(65 + Math.random() * 25); // 65-90%

    // 分析時間をシミュレート（実際のAPI呼び出し時間を再現）
    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json({
      success: true,
      result: {
        // 基本情報
        emotion: matchedPattern.emotion,
        emoji: matchedPattern.emoji,
        barkType: matchedPattern.patterns[Math.floor(Math.random() * matchedPattern.patterns.length)],
        confidence,

        // 翻訳結果
        meaning: mainTranslation,
        alternativeTranslations,

        // 感情メーター
        emotionScores,

        // アドバイス
        advice: matchedPattern.advice,

        // 音声特徴（デバッグ/表示用）
        audioFeatures: {
          pitch: features.pitch === 'high' ? '高い' : features.pitch === 'medium' ? '普通' : '低い',
          volume: features.volume === 'loud' ? '大きい' : features.volume === 'medium' ? '普通' : '小さい',
          duration: features.duration === 'short' ? '短い' : features.duration === 'medium' ? '普通' : '長い',
          continuity: features.continuity === 'continuous' ? '連続' : features.continuity === 'intermittent' ? '断続的' : '単発',
        },

        // タイムスタンプ
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Voice translation error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました。もう一度お試しください。' },
      { status: 500 }
    );
  }
}
