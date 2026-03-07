import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIResponse } from '@/lib/openai';

// トーン別キャプションテンプレート（5種類対応）
const CAPTION_TEMPLATES = {
  // かわいい系
  cute: [
    'ソファの上でまったり中🛋️\nふわふわの毛並みがキラキラ✨\nこの幸せそうな顔を見ると私まで癒される🥰',
    '窓辺でひなたぼっこしてた🌞\n午後の柔らかい光がまぶしそう💫\nこんな穏やかな時間がたまらなく好き💕',
    'おもちゃをくわえて得意げな顔🧸\nちょっぴりドヤ顔が可愛すぎて💓\n何気ない日常に幸せを感じる毎日🐶',
  ],
  // 面白い系
  funny: [
    'ごはんの気配を察知した瞬間🍖\n耳がピーンと立ってる感じが伝わる？😂\nこのわかりやすさがたまらない笑',
    '寝起きでぼーっとしてる朝😴\nまだ目が半開きでふにゃふにゃ💤\n思わず写真撮っちゃったよね📸',
    '変なポーズで固まってた瞬間📷\nなにその体勢？って二度見した🤣\n毎日笑わせてくれてありがとう',
    '散歩開始3分で帰りたい顔してる😂\n犬の気分屋レベルMAX🐕\nこれだから犬って最高なんだよな',
  ],
  // 感動系
  emotional: [
    '膝の上でうとうとし始めた🛌\n小さな寝息が聞こえてくる💤\nこの重みがなんとも言えない幸せ🥹',
    '帰宅したら玄関で待っててくれた🏠\nしっぽフリフリが止まらない💕\n疲れが吹き飛ぶ瞬間だなぁ',
    'そっと寄り添ってきてくれた🐶\n温もりが伝わってくるこの距離感🌸\n一緒にいられることに感謝の毎日✨',
    '出会えてよかった、心からそう思う🥹\nこの子がいない生活は考えられない💕\nこれからもずっと一緒にいようね🐾',
  ],
  // 日常系
  daily: [
    '今日もいつもの散歩道🚶‍♂️\n季節の風を感じながら🍃\nこういう何気ない時間が一番好き🐕',
    'いつものお気に入りスポットにて📍\nなんてことない日常だけど💭\nこれが私たちの幸せなんだよね☀️',
    '朝のルーティン完了✅\nごはん食べて、散歩して、ゴロゴロ💤\n今日も平和な一日のはじまり🌅',
    'お昼寝タイム突入🛋️\n気持ちよさそうに寝てる姿🐶\n見てるだけで癒される午後のひととき☕',
  ],
  // シンプル系
  simple: [
    '今日のベストショット📷✨',
    'おはよう🐶☀️',
    'お散歩日和🚶‍♂️🐕',
    '幸せな時間💕',
    'この顔がたまらない🥰',
    'いい天気☀️🐾',
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
  emotional: ['#感動', '#泣ける', '#愛犬家', '#犬との暮らし'],
  daily: ['#日常', '#日々の暮らし', '#犬との日常', '#everyday'],
  simple: ['#シンプル', '#今日の一枚', '#dogphoto'],
};

// トーンを日本語に変換
const TONE_LABELS: Record<string, string> = {
  cute: 'かわいい',
  funny: '面白い',
  emotional: '感動系',
  daily: '日常',
  simple: 'シンプル',
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { dogName, dogBreed, mood, customPrompt } = await request.json();

    // トーンのバリデーション
    const validMoods = ['cute', 'funny', 'emotional', 'daily', 'simple'];
    const selectedMood = validMoods.includes(mood) ? mood : 'cute';

    let caption = '';
    let hashtags: string[] = [];

    // AIで生成を試みる
    try {
      const toneLabel = TONE_LABELS[selectedMood] || 'かわいい';

      const systemPrompt = `あなたはInstagram投稿のプロです。
犬の写真に合う、親しみやすい投稿文を作成してください。

【重要】投稿トーン: ${toneLabel}

トーン別の指示:
- かわいい: キュンとする表現、ハートや星の絵文字、甘い言葉
- 面白い: ユーモア、ツッコミ、笑いを誘う表現
- 感動系: 愛情深い、感謝、じーんとする表現
- 日常: 何気ない日常、ほっこり、平和な雰囲気
- シンプル: 短く簡潔、1〜2行、絵文字少なめ

ルール:
- シンプル以外は3行構成（改行で区切る）
  - 1行目: 犬の行動・様子
  - 2行目: 写真の雰囲気・シーン
  - 3行目: 飼い主の気持ち
- シンプルの場合は1〜2行で短く
- 各行に絵文字を適度に入れる
- 押し付けがましくない、自然なトーン

出力形式:
CAPTION:
（投稿文）

HASHTAGS:
（ハッシュタグを10個、スペース区切り）`;

      const userPrompt = `犬の名前: ${dogName || 'うちの子'}
犬種: ${dogBreed || '犬'}
投稿トーン: ${toneLabel}
${customPrompt ? `写真の状況: ${customPrompt}` : ''}

この情報をもとに、「${toneLabel}」トーンの投稿文とハッシュタグを生成してください。`;

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
      const templates = CAPTION_TEMPLATES[selectedMood as keyof typeof CAPTION_TEMPLATES] || CAPTION_TEMPLATES.cute;
      caption = templates[Math.floor(Math.random() * templates.length)];

      if (dogName) {
        caption = caption.replace(/この子/g, `${dogName}`);
      }

      if (customPrompt && selectedMood !== 'simple') {
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

      // トーン別タグを追加
      if (MOOD_HASHTAGS[selectedMood]) {
        additionalTags.push(...MOOD_HASHTAGS[selectedMood]);
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
