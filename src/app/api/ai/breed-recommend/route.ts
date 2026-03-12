import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

// OpenAIクライアントを遅延初期化
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// 犬種マスターデータ（AIの選択肢として使用）
const BREED_MASTER = {
  small: [
    { name: 'トイプードル', image: '🐩' },
    { name: 'チワワ', image: '🐶' },
    { name: 'ミニチュアダックスフンド', image: '🌭' },
    { name: 'ポメラニアン', image: '🦊' },
    { name: 'ヨークシャーテリア', image: '🎀' },
    { name: 'シーズー', image: '🦁' },
    { name: 'マルチーズ', image: '☁️' },
    { name: 'パピヨン', image: '🦋' },
    { name: 'ペキニーズ', image: '👑' },
    { name: 'パグ', image: '🐽' },
    { name: 'フレンチブルドッグ', image: '🐷' },
    { name: 'ボストンテリア', image: '🎩' },
    { name: 'キャバリア', image: '💕' },
    { name: 'ジャックラッセルテリア', image: '⚡' },
    { name: 'ミニチュアシュナウザー', image: '🧔' },
  ],
  medium: [
    { name: '柴犬', image: '🐕' },
    { name: 'コーギー', image: '🦊' },
    { name: 'ビーグル', image: '🐶' },
    { name: 'アメリカンコッカースパニエル', image: '🌸' },
    { name: 'ボーダーコリー', image: '🐑' },
    { name: 'シェットランドシープドッグ', image: '🦊' },
    { name: 'スピッツ', image: '❄️' },
    { name: 'ブルドッグ', image: '💪' },
    { name: 'ウェルシュコーギー', image: '🦊' },
    { name: 'イングリッシュコッカースパニエル', image: '🎀' },
  ],
  large: [
    { name: 'ゴールデンレトリバー', image: '🦮' },
    { name: 'ラブラドールレトリバー', image: '🐕‍🦺' },
    { name: 'ジャーマンシェパード', image: '🐺' },
    { name: 'スタンダードプードル', image: '🐩' },
    { name: 'シベリアンハスキー', image: '🐺' },
    { name: 'サモエド', image: '☁️' },
    { name: 'バーニーズマウンテンドッグ', image: '🏔️' },
    { name: 'グレートピレニーズ', image: '⛰️' },
    { name: 'ドーベルマン', image: '🖤' },
    { name: 'グレートデーン', image: '👑' },
    { name: 'ボクサー', image: '🥊' },
    { name: 'ダルメシアン', image: '🎲' },
    { name: 'アイリッシュセッター', image: '🍂' },
    { name: '秋田犬', image: '🗾' },
  ],
};

export interface BreedRecommendRequest {
  housing: 'apartment' | 'house';           // 住居タイプ
  houseSize: 'small' | 'medium' | 'large';  // 家の広さ
  walkTime: 'short' | 'medium' | 'long';    // 散歩時間
  preferredSize: 'small' | 'medium' | 'large' | 'any'; // 希望サイズ
  experience: 'first' | 'experienced';      // 飼育経験
  sheddingTolerance: 'low' | 'medium' | 'high'; // 抜け毛許容度
  exerciseLevel: 'low' | 'medium' | 'high'; // 希望する運動量
  hasYard: boolean;                         // 庭の有無
  hasChildren: boolean;                     // 子供の有無
  aloneTime: 'short' | 'medium' | 'long';   // 留守番時間
}

export interface BreedRecommendation {
  name: string;
  image: string;
  matchScore: number;
  characteristics: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  exerciseLevel: 'low' | 'medium' | 'high';
  size: 'small' | 'medium' | 'large';
  sheddingLevel: 'low' | 'medium' | 'high';
  description: string;
  reasonForYou: string;  // AIが生成するおすすめ理由
  goodFor: string[];
  cautions: string[];
  monthlyInsuranceCost: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const input: BreedRecommendRequest = await request.json();

    // 入力条件に基づいてAIプロンプトを構築
    const conditionText = buildConditionText(input);
    const candidateBreeds = getCandidateBreeds(input);

    const client = getOpenAIClient();
    if (!client) {
      // モックモード：フォールバック
      return NextResponse.json({
        recommendations: getMockRecommendations(input),
      });
    }

    const prompt = `
あなたは犬の専門家です。以下の条件に最も適した犬種を3つ選び、それぞれについて詳細情報を提供してください。

【ユーザーの条件】
${conditionText}

【候補となる犬種】
${candidateBreeds.map(b => b.name).join('、')}

【出力形式】
以下のJSON形式で3つの犬種を出力してください。必ず条件に合う犬種のみを選んでください。

{
  "recommendations": [
    {
      "name": "犬種名",
      "matchScore": 95,
      "characteristics": ["特徴1", "特徴2", "特徴3", "特徴4"],
      "difficulty": "easy|medium|hard",
      "exerciseLevel": "low|medium|high",
      "size": "small|medium|large",
      "sheddingLevel": "low|medium|high",
      "description": "犬種の一般的な説明（100文字程度）",
      "reasonForYou": "この条件のユーザーに特におすすめの理由（ユーザーの条件に言及しながら80文字程度）",
      "goodFor": ["向いている人1", "向いている人2", "向いている人3"],
      "cautions": ["注意点1", "注意点2", "注意点3"],
      "monthlyInsuranceCost": "2,000〜3,500円"
    }
  ]
}

注意事項：
- matchScoreは60-100の範囲で、条件との適合度を表します
- 条件と明らかに合わない犬種は選ばないでください
- 例えば「大型犬希望」なのに小型犬を選ばない
- 「運動量多め」なのに運動量が少ない犬種を選ばない
- reasonForYouはユーザーの具体的な条件（住環境、散歩時間など）に触れて書いてください
`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたは犬の専門家です。ユーザーの条件に最適な犬種を提案してください。必ず有効なJSONのみを出力してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '';

    // JSONを抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid AI response format');
    }

    const result = JSON.parse(jsonMatch[0]);

    // 画像を追加
    const recommendations = result.recommendations.map((rec: BreedRecommendation) => {
      const breedData = [...BREED_MASTER.small, ...BREED_MASTER.medium, ...BREED_MASTER.large]
        .find(b => b.name === rec.name);
      return {
        ...rec,
        image: breedData?.image || '🐕',
      };
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Breed recommendation error:', error);
    return NextResponse.json(
      { error: 'レコメンド生成に失敗しました' },
      { status: 500 }
    );
  }
}

function buildConditionText(input: BreedRecommendRequest): string {
  const conditions = [];

  // 住居
  conditions.push(`住居タイプ: ${input.housing === 'apartment' ? 'マンション・アパート' : '一戸建て'}`);

  // 家の広さ
  const sizeMap = { small: '狭め（ワンルーム〜1K）', medium: '普通（1LDK〜2DK）', large: '広め（2LDK以上）' };
  conditions.push(`家の広さ: ${sizeMap[input.houseSize]}`);

  // 庭
  conditions.push(`庭: ${input.hasYard ? 'あり' : 'なし'}`);

  // 散歩時間
  const walkMap = { short: '10分程度', medium: '30分程度', long: '1時間以上' };
  conditions.push(`1日の散歩時間: ${walkMap[input.walkTime]}`);

  // 希望サイズ
  const preferredMap = { small: '小型犬', medium: '中型犬', large: '大型犬', any: 'こだわりなし' };
  conditions.push(`希望するサイズ: ${preferredMap[input.preferredSize]}`);

  // 運動量
  const exerciseMap = { low: '少なめ', medium: '普通', high: '多め（アクティブ）' };
  conditions.push(`希望する運動量: ${exerciseMap[input.exerciseLevel]}`);

  // 経験
  conditions.push(`飼育経験: ${input.experience === 'first' ? '初めて' : 'あり'}`);

  // 抜け毛許容
  const sheddingMap = { low: '抜け毛は少ない方がいい', medium: '多少は許容できる', high: '気にしない' };
  conditions.push(`抜け毛: ${sheddingMap[input.sheddingTolerance]}`);

  // 子供
  if (input.hasChildren) {
    conditions.push('子供: あり（子供に優しい犬種が望ましい）');
  }

  // 留守番
  const aloneMap = { short: '短め（2時間以内）', medium: '普通（4〜6時間）', long: '長め（8時間以上）' };
  conditions.push(`留守番時間: ${aloneMap[input.aloneTime]}`);

  return conditions.join('\n');
}

function getCandidateBreeds(input: BreedRecommendRequest): { name: string; image: string }[] {
  let candidates: { name: string; image: string }[] = [];

  // サイズに基づいて候補を絞る
  if (input.preferredSize === 'any') {
    candidates = [...BREED_MASTER.small, ...BREED_MASTER.medium, ...BREED_MASTER.large];
  } else if (input.preferredSize === 'small') {
    candidates = [...BREED_MASTER.small];
    // マンションで狭い場合は中型犬も除外
  } else if (input.preferredSize === 'medium') {
    candidates = [...BREED_MASTER.medium];
    // 広い家なら小型犬も候補に
    if (input.houseSize === 'large') {
      candidates = [...candidates, ...BREED_MASTER.small.slice(0, 5)];
    }
  } else if (input.preferredSize === 'large') {
    candidates = [...BREED_MASTER.large];
    // 庭がある場合のみ大型犬を推奨
    if (!input.hasYard && input.housing === 'apartment') {
      // マンションで庭なしの場合は大型犬を減らす
      candidates = candidates.slice(0, 5);
    }
  }

  return candidates;
}

function getMockRecommendations(input: BreedRecommendRequest): BreedRecommendation[] {
  // モックモード用のフォールバック
  const baseRecommendations: BreedRecommendation[] = [];

  if (input.preferredSize === 'large' || (input.preferredSize === 'any' && input.hasYard)) {
    baseRecommendations.push({
      name: 'ゴールデンレトリバー',
      image: '🦮',
      matchScore: 92,
      characteristics: ['穏やか', '賢い', '人懐っこい', '運動好き'],
      difficulty: 'medium',
      exerciseLevel: 'high',
      size: 'large',
      sheddingLevel: 'high',
      description: '家族に優しく、子供との相性も抜群の人気大型犬。賢くてしつけやすいのも魅力です。',
      reasonForYou: `${input.hasYard ? '庭があるので' : ''}運動量が確保できる環境なら、温厚で家族向きのゴールデンレトリバーがぴったりです。`,
      goodFor: ['家族で飼いたい方', 'アウトドア好き', '広い家に住んでいる方'],
      cautions: ['抜け毛が多い', '運動量が必要', '暑さに弱い'],
      monthlyInsuranceCost: '3,500〜5,000円',
    });
  }

  if (input.preferredSize === 'small' || input.preferredSize === 'any') {
    baseRecommendations.push({
      name: 'トイプードル',
      image: '🐩',
      matchScore: 95,
      characteristics: ['賢い', '抜け毛少ない', '社交的', 'しつけやすい'],
      difficulty: 'easy',
      exerciseLevel: 'medium',
      size: 'small',
      sheddingLevel: 'low',
      description: '日本で最も人気の犬種。賢くてしつけやすく、抜け毛も少ないのでマンションでも飼いやすいです。',
      reasonForYou: `${input.housing === 'apartment' ? 'マンションでも飼いやすく、' : ''}抜け毛が少ないトイプードルは${input.experience === 'first' ? '初心者にも' : ''}おすすめです。`,
      goodFor: ['初心者', 'マンション住まい', 'アレルギーが心配な方'],
      cautions: ['定期的なトリミングが必要', '毛玉ができやすい', '膝の病気に注意'],
      monthlyInsuranceCost: '2,000〜3,500円',
    });
  }

  if (input.preferredSize === 'medium' || input.preferredSize === 'any') {
    baseRecommendations.push({
      name: '柴犬',
      image: '🐕',
      matchScore: 88,
      characteristics: ['忠実', '清潔好き', '独立心がある', '賢い'],
      difficulty: 'medium',
      exerciseLevel: 'medium',
      size: 'medium',
      sheddingLevel: 'high',
      description: '日本の伝統的な犬種。忠実で家族を大切にし、清潔好きでトイレトレーニングがしやすいです。',
      reasonForYou: `${input.aloneTime !== 'short' ? '留守番が得意なので、日中不在でも安心。' : ''}独立心があり、落ち着いた関係を築けます。`,
      goodFor: ['一人暮らし', '日中不在が多い方', '日本犬が好きな方'],
      cautions: ['換毛期の抜け毛が多い', 'しつけに根気が必要', '他の犬が苦手な子も'],
      monthlyInsuranceCost: '2,500〜4,000円',
    });
  }

  return baseRecommendations.slice(0, 3);
}
