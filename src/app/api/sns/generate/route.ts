import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIResponse } from '@/lib/openai';

// モック用のキャプションテンプレート（3行構成: 行動・雰囲気・気持ち）
const CAPTION_TEMPLATES = {
  cute: [
    'ソファの上でまったり中🛋️\nふわふわの毛並みがキラキラ✨\nこの幸せそうな顔を見ると私まで癒される🥰',
    '窓辺でひなたぼっこしてた🌞\n午後の柔らかい光がまぶしそう💫\nこんな穏やかな時間がたまらなく好き💕',
    'おもちゃをくわえて得意げな顔🧸\nちょっぴりドヤ顔が可愛すぎて💓\n何気ない日常に幸せを感じる毎日🐶',
  ],
  funny: [
    'ごはんの気配を察知した瞬間🍖\n耳がピーンと立ってる感じが伝わる？😂\nこのわかりやすさがたまらない笑',
    '寝起きでぼーっとしてる朝😴\nまだ目が半開きでふにゃふにゃ💤\n思わず写真撮っちゃったよね📸',
    '変なポーズで固まってた瞬間📷\nなにその体勢？って二度見した🤣\n毎日笑わせてくれてありがとう',
  ],
  cool: [
    '散歩中にビシッとキメてた🐕\n風になびく毛並みがかっこいい🌬️\nうちの子、モデルさんみたい😎',
    '遠くを見つめる横顔が凛々しくて✨\n夕日に照らされてキラキラ🌅\n惚れ直しちゃったよね💫',
    'お座りでピシッと決めた瞬間🐾\nこの真剣な眼差しがたまらない👀\nいつもそばにいてくれてありがとう',
  ],
  heartwarming: [
    '膝の上でうとうとし始めた🛌\n小さな寝息が聞こえてくる💤\nこの重みがなんとも言えない幸せ🥹',
    '帰宅したら玄関で待っててくれた🏠\nしっぽフリフリが止まらない💕\n疲れが吹き飛ぶ瞬間だなぁ',
    'そっと寄り添ってきてくれた🐶\n温もりが伝わってくるこの距離感🌸\n一緒にいられることに感謝の毎日✨',
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
- 文章は必ず3行構成（改行で区切る）
  - 1行目: 犬の行動・様子（何をしているか）
  - 2行目: 写真の雰囲気・シーン（光、場所、空気感）
  - 3行目: 飼い主の気持ち（感謝、幸せ、愛情）
- 各行に1つずつ絵文字を入れる（計3個程度）
- 押し付けがましくない、日常の優しいトーン
- 「毎日」「いつも」など日常感のある表現を使う
- 自然体で飾らない言葉選び

出力形式（必ずこの形式で出力）:
CAPTION:
（投稿文をここに - 必ず3行で）

HASHTAGS:
（ハッシュタグをスペース区切りで10個）`;

      const userPrompt = `犬の名前: ${dogName || 'うちの子'}
犬種: ${dogBreed || '不明'}
投稿のトーン: ${mood === 'cute' ? 'かわいい' : mood === 'funny' ? 'おもしろい' : mood === 'cool' ? 'かっこいい' : 'ほっこり'}
${customPrompt ? `写真の状況: ${customPrompt}` : ''}

この情報をもとに、必ず3行構成（行動・雰囲気・気持ち）の投稿文とハッシュタグを生成してください。
日常の何気ない瞬間を切り取ったような、優しい文章でお願いします。`;

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
