import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIResponse } from '@/lib/openai';

// モック用のキャプションテンプレート
const CAPTION_TEMPLATES = {
  cute: [
    '今日も最高にかわいい🥰\nこの顔、反則だよね〜💕',
    'きゅんきゅんが止まらない😍\n何回見ても可愛すぎる💓',
    'この可愛さ、伝われ〜！🐶✨\n親バカ全開でいきます💕',
  ],
  funny: [
    'まさかの表情いただきました😂\n何考えてるの？笑',
    'え、その顔なに？🤣\n思わず吹き出した瞬間📸',
    '今日のベストショット📷\n笑いすぎてお腹痛い🤣',
  ],
  cool: [
    'イケわん決まってる😎✨\nモデルさんかな？',
    'かっこよすぎてため息出る🐕‍🦺\n惚れ直しました💫',
    'この凛々しさ、たまらん😍\nいつもありがとね🐾',
  ],
  heartwarming: [
    'この子がいてくれて幸せ🥹💕\n毎日感謝してます',
    '癒しをありがとう🐶💓\n一緒にいられて嬉しいな',
    'ほっこりする日常🌸\nこの子との時間が宝物✨',
  ],
};

const BASE_HASHTAGS = [
  '#犬のいる暮らし',
  '#犬バカ部',
  '#愛犬',
  '#わんこ',
  '#犬スタグラム',
  '#いぬすたぐらむ',
  '#dogsofinstagram',
  '#doglife',
  '#doglover',
];

const BREED_HASHTAGS: Record<string, string[]> = {
  'トイプードル': ['#トイプードル', '#トイプー', '#toypoodle', '#poodle'],
  'チワワ': ['#チワワ', '#ちわわ', '#chihuahua'],
  '柴犬': ['#柴犬', '#しばいぬ', '#shiba', '#shibainu'],
  'ミニチュアダックスフンド': ['#ミニチュアダックスフンド', '#ダックス', '#dachshund'],
  'フレンチブルドッグ': ['#フレンチブルドッグ', '#フレブル', '#frenchbulldog'],
  'ゴールデンレトリバー': ['#ゴールデンレトリバー', '#ゴールデン', '#goldenretriever'],
  'ポメラニアン': ['#ポメラニアン', '#ポメ', '#pomeranian'],
  'シーズー': ['#シーズー', '#shihtzu'],
  'ミックス': ['#ミックス犬', '#雑種犬', '#mixdog'],
};

const MOOD_HASHTAGS: Record<string, string[]> = {
  cute: ['#可愛い', '#かわいい', '#cute', '#adorable'],
  funny: ['#おもしろ', '#笑える', '#funny', '#funnydog'],
  cool: ['#かっこいい', '#イケメン犬', '#cool', '#handsome'],
  heartwarming: ['#癒し', '#ほっこり', '#healing', '#happydog'],
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { dogName, dogBreed, mood, customPrompt } = await request.json();

    let caption = '';
    let hashtags: string[] = [];

    // AIで生成を試みる
    try {
      const systemPrompt = `あなたはInstagram投稿のプロです。
犬の写真に合う、親しみやすくかわいい投稿文を作成してください。

ルール:
- 文章は3行以内
- 絵文字を適度に使用（3-5個）
- 押し付けがましくない自然なトーン
- 犬好きコミュニティに響く内容

出力形式（必ずこの形式で出力）:
CAPTION:
（投稿文をここに）

HASHTAGS:
（ハッシュタグをスペース区切りで10個）`;

      const userPrompt = `犬の名前: ${dogName || 'うちの子'}
犬種: ${dogBreed || '不明'}
投稿のトーン: ${mood === 'cute' ? 'かわいい' : mood === 'funny' ? 'おもしろい' : mood === 'cool' ? 'かっこいい' : 'ほっこり'}
${customPrompt ? `追加リクエスト: ${customPrompt}` : ''}

この情報をもとに投稿文とハッシュタグを生成してください。`;

      const response = await getAIResponse(systemPrompt, userPrompt);

      // レスポンスをパース
      const captionMatch = response.match(/CAPTION:\s*([\s\S]*?)(?=HASHTAGS:|$)/i);
      const hashtagsMatch = response.match(/HASHTAGS:\s*([\s\S]*)/i);

      if (captionMatch) {
        caption = captionMatch[1].trim();
      }
      if (hashtagsMatch) {
        hashtags = hashtagsMatch[1].trim().split(/\s+/).filter(tag => tag.startsWith('#'));
      }
    } catch {
      // AIが使えない場合はモックを使用
    }

    // モックフォールバック
    if (!caption) {
      const templates = CAPTION_TEMPLATES[mood as keyof typeof CAPTION_TEMPLATES] || CAPTION_TEMPLATES.cute;
      caption = templates[Math.floor(Math.random() * templates.length)];

      if (dogName) {
        caption = caption.replace(/この子/g, `${dogName}`);
      }

      if (customPrompt) {
        caption = `${customPrompt}\n\n${caption}`;
      }
    }

    // ハッシュタグを生成（モックまたは補完）
    if (hashtags.length < 5) {
      const additionalTags = [...BASE_HASHTAGS];

      // 犬種タグを追加
      if (dogBreed && BREED_HASHTAGS[dogBreed]) {
        additionalTags.push(...BREED_HASHTAGS[dogBreed]);
      }

      // ムードタグを追加
      if (MOOD_HASHTAGS[mood]) {
        additionalTags.push(...MOOD_HASHTAGS[mood]);
      }

      // 既存のハッシュタグと重複しないものを追加
      const existingSet = new Set(hashtags);
      for (const tag of additionalTags) {
        if (!existingSet.has(tag) && hashtags.length < 10) {
          hashtags.push(tag);
          existingSet.add(tag);
        }
      }
    }

    // 最大10個に制限
    hashtags = hashtags.slice(0, 10);

    const fullText = `${caption}\n\n${hashtags.join(' ')}`;

    return NextResponse.json({
      post: {
        caption,
        hashtags,
        fullText,
      },
    });
  } catch (error) {
    console.error('SNS generate error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
