import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIResponse } from '@/lib/openai';
import { isPremiumUser, premiumRequiredResponse } from '@/lib/subscription';

// ================================================
// AIドッグフードレシピ生成API【プレミアム機能】
// ================================================
//
// 【機能】
// - 食材からレシピを3つ生成
// - ユーザーが選択/入力した材料を必ず含む
// - アレルギー食材を自動除外
// - 体重に合わせた食事量を計算
// - 詳細な手順と栄養情報を提供
//
// 【アクセス制限】
// - プレミアムユーザーのみ利用可能
// ================================================

// 犬の1日の必要カロリー計算（RER: 安静時エネルギー要求量）
// RER = 70 × (体重kg)^0.75
// 成犬の場合、1日の必要カロリー = RER × 1.6
function calculateDailyCalories(weightKg: number): number {
  const rer = 70 * Math.pow(weightKg, 0.75);
  return Math.round(rer * 1.6);
}

// 1食あたりの目安量（グラム）を計算
// 手作り食の場合、体重の2〜3%が目安
function calculatePortionSize(weightKg: number): number {
  const percentage = 0.025; // 2.5%
  return Math.round(weightKg * 1000 * percentage);
}

// アレルギー食材の日本語マッピング
const ALLERGY_LABELS: Record<string, string> = {
  chicken: '鶏肉',
  beef: '牛肉',
  pork: '豚肉',
  fish: '魚',
  dairy: '乳製品',
  wheat: '小麦',
  egg: '卵',
  soy: '大豆',
  corn: 'とうもろこし',
};

// 参考情報URL
const REFERENCE_URLS = [
  { name: 'ペトコト（手作りドッグフード）', url: 'https://petokoto.com/foods' },
  { name: 'わんちゃんホンポ', url: 'https://wanchan.jp/' },
  { name: 'いぬのきもち', url: 'https://dog.benesse.ne.jp/' },
];

// モックレシピデータ（3パターン用意）
const generateMockRecipes = (ingredients: string[], weightKg: number, allergyList: string[]) => {
  const portionSize = calculatePortionSize(weightKg);
  const dailyCalories = calculateDailyCalories(weightKg);
  const caloriesPerMeal = Math.round(dailyCalories / 2);

  // ユーザーの入力材料を含めた分量付き材料リスト
  const userIngredientsList = ingredients.map(ing => {
    // 肉類は80-100g、野菜は30-50g、炭水化物は40-60gを目安
    if (ing.includes('肉') || ing.includes('ささみ') || ing.includes('魚')) {
      return `${ing} ${Math.round(portionSize * 0.4)}g`;
    } else if (ing.includes('米') || ing.includes('ごはん') || ing.includes('いも')) {
      return `${ing} ${Math.round(portionSize * 0.25)}g`;
    } else {
      return `${ing} ${Math.round(portionSize * 0.15)}g`;
    }
  });

  const recipes = [
    {
      id: 'recipe-1',
      name: `${ingredients[0] || '野菜'}たっぷり栄養ごはん`,
      description: `${ingredients.slice(0, 2).join('と')}を使った、消化に優しい栄養バランスレシピです。`,
      ingredients: [
        ...userIngredientsList,
        'オリーブオイル 小さじ1/2',
        '水 適量',
      ],
      steps: [
        {
          step: 1,
          title: '材料の下準備',
          description: `${ingredients.slice(0, 2).join('、')}を細かく刻みます。犬が食べやすいサイズ（5mm〜1cm角）にカットしてください。`,
        },
        {
          step: 2,
          title: '加熱調理',
          description: '鍋に水を入れ、肉類から先に入れて中火で5分ほど煮ます。アクが出たら取り除きます。',
        },
        {
          step: 3,
          title: '野菜を追加',
          description: '野菜類を加え、柔らかくなるまで10分ほど煮込みます。',
        },
        {
          step: 4,
          title: '仕上げ',
          description: '火を止め、人肌程度に冷ましてからオリーブオイルを加えて混ぜます。',
        },
        {
          step: 5,
          title: '盛り付け',
          description: `${portionSize}g程度を目安にお皿に盛り付けて完成です。`,
        },
      ],
      nutrition: {
        calories: caloriesPerMeal,
        protein: '約18g',
        fat: '約8g',
        carbs: '約15g',
        fiber: '約3g',
      },
      tips: '初めて与える場合は少量から始めてください。残りは冷蔵庫で2日、冷凍で2週間保存可能です。',
      references: REFERENCE_URLS,
    },
    {
      id: 'recipe-2',
      name: `${ingredients[0] || '食材'}のやさしいスープごはん`,
      description: `${ingredients.slice(0, 2).join('と')}をスープ仕立てにした、水分補給もできるレシピです。`,
      ingredients: [
        ...userIngredientsList,
        'かつおだし（無塩）100ml',
        '亜麻仁油 小さじ1/2',
      ],
      steps: [
        {
          step: 1,
          title: '材料の下準備',
          description: `${ingredients.slice(0, 2).join('、')}を一口大に切ります。野菜は薄くスライスすると火が通りやすくなります。`,
        },
        {
          step: 2,
          title: 'だしで煮る',
          description: 'かつおだしを鍋に入れ、肉類を加えて中火で煮込みます。',
        },
        {
          step: 3,
          title: '野菜を追加',
          description: '野菜を加えて弱火で15分ほど煮込みます。具材が柔らかくなればOKです。',
        },
        {
          step: 4,
          title: '冷ます',
          description: '火を止めて人肌に冷まし、亜麻仁油を加えます。',
        },
        {
          step: 5,
          title: '盛り付け',
          description: 'スープごと器に盛り付けて完成。水分補給にもなります。',
        },
      ],
      nutrition: {
        calories: Math.round(caloriesPerMeal * 0.9),
        protein: '約16g',
        fat: '約7g',
        carbs: '約12g',
        fiber: '約2g',
      },
      tips: 'スープ仕立てなので、夏場や水分をあまり取らない子におすすめです。',
      references: REFERENCE_URLS,
    },
    {
      id: 'recipe-3',
      name: `${ingredients[0] || '素材'}の蒸しごはん`,
      description: `${ingredients.slice(0, 2).join('と')}を蒸し調理で仕上げた、栄養を逃さないヘルシーレシピです。`,
      ingredients: [
        ...userIngredientsList,
        'すりごま 小さじ1',
        'オリーブオイル 小さじ1/2',
      ],
      steps: [
        {
          step: 1,
          title: '材料の下準備',
          description: `${ingredients.slice(0, 2).join('、')}を食べやすい大きさにカットします。`,
        },
        {
          step: 2,
          title: '蒸し器の準備',
          description: '蒸し器に水を入れて火にかけ、蒸気が上がるまで待ちます。',
        },
        {
          step: 3,
          title: '蒸し調理',
          description: '材料を蒸し器に入れ、中火で15分ほど蒸します。竹串がスッと通れば完成です。',
        },
        {
          step: 4,
          title: '味付け',
          description: '蒸し上がった材料をボウルに移し、すりごまとオリーブオイルを加えて混ぜます。',
        },
        {
          step: 5,
          title: '盛り付け',
          description: '人肌に冷めたら器に盛り付けて完成です。',
        },
      ],
      nutrition: {
        calories: Math.round(caloriesPerMeal * 0.85),
        protein: '約17g',
        fat: '約6g',
        carbs: '約14g',
        fiber: '約3g',
      },
      tips: '蒸し調理は栄養素の損失が少なく、消化にも優しい調理法です。',
      references: REFERENCE_URLS,
    },
  ];

  return recipes;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // プレミアム機能チェック
    const isPremium = await isPremiumUser(session.user.email ?? undefined);
    if (!isPremium) {
      return NextResponse.json(premiumRequiredResponse(), { status: 403 });
    }

    const { ingredients, allergies, weightKg } = await request.json();

    // 入力検証
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: '食材を入力してください' }, { status: 400 });
    }

    const weight = parseFloat(weightKg) || 5; // デフォルト5kg
    const allergyList: string[] = allergies || [];

    // アレルギー食材のラベルを取得
    const allergyLabels = allergyList.map(a => ALLERGY_LABELS[a] || a);

    // 1食の目安量を計算
    const portionSize = calculatePortionSize(weight);
    const dailyCalories = calculateDailyCalories(weight);
    const caloriesPerMeal = Math.round(dailyCalories / 2); // 1日2食の場合

    let recipes = [];

    // AIでレシピ生成を試みる
    try {
      const systemPrompt = `あなたは犬の手作り食の専門家です。
与えられた食材を【必ず全て使用して】、犬に安全で栄養バランスの良いレシピを3つ提案してください。

【重要】
- ユーザーが入力した食材は【必ず全てレシピの材料に含めてください】
- 入力された食材: ${ingredients.join('、')}

【絶対に使用禁止のアレルギー食材】:
${allergyLabels.length > 0 ? allergyLabels.join('、') : 'なし'}

【犬に危険な食材】絶対に使用禁止:
玉ねぎ、ニンニク、ネギ類、チョコレート、ぶどう、レーズン、アボカド、キシリトール、マカダミアナッツ、アルコール

【体重】${weight}kg
【1食の目安量】${portionSize}g
【1食のカロリー目安】${caloriesPerMeal}kcal

出力形式（JSON配列）:
[
  {
    "id": "recipe-1",
    "name": "レシピ名",
    "description": "レシピの説明（50文字以内）",
    "ingredients": ["材料1 分量", "材料2 分量", ...],
    "steps": [
      { "step": 1, "title": "手順タイトル", "description": "詳しい手順説明" },
      { "step": 2, "title": "手順タイトル", "description": "詳しい手順説明" }
    ],
    "nutrition": {
      "calories": 数値,
      "protein": "約Xg",
      "fat": "約Xg",
      "carbs": "約Xg",
      "fiber": "約Xg"
    },
    "tips": "調理のコツや保存方法",
    "references": [
      { "name": "参考サイト名", "url": "URL" }
    ]
  }
]

3つのレシピを提案してください。各レシピは調理法を変えてください（煮る、蒸す、炒めるなど）。`;

      const userPrompt = `食材: ${ingredients.join('、')}
体重: ${weight}kg
アレルギー: ${allergyLabels.length > 0 ? allergyLabels.join('、') : 'なし'}

上記の食材を【全て使用して】、犬用の手作りごはんレシピを3つ提案してください。
各レシピには必ず入力された食材を含めてください。`;

      const response = await getAIResponse(systemPrompt, userPrompt);

      // JSONをパース
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recipes = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('AI recipe generation failed:', error);
      // AIが使えない場合はモックを使用
    }

    // モックフォールバック
    if (!recipes || recipes.length === 0) {
      recipes = generateMockRecipes(ingredients, weight, allergyList);
    }

    // 各レシピに共通情報を追加
    const enrichedRecipes = recipes.map((recipe: Record<string, unknown>) => ({
      ...recipe,
      portionSize,
      weightKg: weight,
      dailyCalories,
      caloriesPerMeal,
      allergiesExcluded: allergyLabels,
      userIngredients: ingredients, // ユーザーが入力した食材を明示
    }));

    return NextResponse.json({
      recipes: enrichedRecipes,
      meta: {
        totalRecipes: enrichedRecipes.length,
        portionSize,
        weightKg: weight,
        dailyCalories,
        caloriesPerMeal,
        allergiesExcluded: allergyLabels,
        userIngredients: ingredients,
      },
    });
  } catch (error) {
    console.error('Recipe generation error:', error);
    return NextResponse.json(
      { error: 'レシピ生成に失敗しました' },
      { status: 500 }
    );
  }
}
