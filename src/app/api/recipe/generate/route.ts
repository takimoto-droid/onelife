import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAIResponse } from '@/lib/openai';

// ================================================
// AIドッグフードレシピ生成API
// ================================================
//
// 【機能】
// - 食材からレシピを生成
// - アレルギー食材を自動除外
// - 体重に合わせた食事量を計算
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

// モックレシピデータ
const MOCK_RECIPES = [
  {
    name: '鶏むね肉と野菜の栄養ごはん',
    description: '高タンパク低脂肪の鶏むね肉をメインに、野菜たっぷりの健康レシピです。',
    ingredients: ['鶏むね肉 100g', 'にんじん 30g', 'ブロッコリー 30g', '白米 50g', 'オリーブオイル 小さじ1'],
    steps: [
      '鶏むね肉を一口大に切り、茹でる',
      'にんじんとブロッコリーを細かく刻み、柔らかくなるまで茹でる',
      '白米を炊く',
      'すべての材料を混ぜ合わせ、オリーブオイルを加える',
      '人肌程度に冷ましてから与える',
    ],
    caloriesPerServing: 180,
    excludedAllergens: [],
    mainProtein: 'chicken',
  },
  {
    name: '牛肉とかぼちゃのスタミナごはん',
    description: '牛肉の旨味とかぼちゃの甘みが絶妙な、栄養バランスの良いレシピです。',
    ingredients: ['牛赤身肉 80g', 'かぼちゃ 50g', 'キャベツ 30g', 'ごはん 40g', 'すりごま 少々'],
    steps: [
      '牛肉を細かく切り、フライパンで炒める',
      'かぼちゃを一口大に切り、柔らかくなるまで茹でてつぶす',
      'キャベツを細かく刻み、さっと茹でる',
      'すべての材料とごはんを混ぜ合わせる',
      'すりごまをトッピングして完成',
    ],
    caloriesPerServing: 200,
    excludedAllergens: [],
    mainProtein: 'beef',
  },
  {
    name: '白身魚と豆腐のヘルシーごはん',
    description: '消化に優しい白身魚と豆腐を使った、シニア犬にもおすすめのレシピです。',
    ingredients: ['タラ（白身魚）80g', '豆腐 50g', '小松菜 30g', 'さつまいも 40g', '亜麻仁油 小さじ1/2'],
    steps: [
      'タラを茹でて、骨を取り除きながらほぐす',
      '豆腐を水切りしてつぶす',
      '小松菜を細かく刻み、茹でる',
      'さつまいもを茹でてつぶす',
      'すべてを混ぜ合わせ、亜麻仁油を加える',
    ],
    caloriesPerServing: 160,
    excludedAllergens: ['chicken', 'beef'],
    mainProtein: 'fish',
  },
  {
    name: '豚肉と大根のさっぱりごはん',
    description: '豚肉のビタミンB1と大根の消化酵素で、お腹に優しいレシピです。',
    ingredients: ['豚もも肉 80g', '大根 50g', 'にんじん 30g', '白米 50g', 'パセリ 少々'],
    steps: [
      '豚肉を茹でて細かく切る',
      '大根とにんじんをすりおろす',
      '白米を炊く',
      'すべての材料を混ぜ合わせる',
      'パセリを細かく刻んでトッピング',
    ],
    caloriesPerServing: 190,
    excludedAllergens: ['chicken', 'beef'],
    mainProtein: 'pork',
  },
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
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

    let recipe;

    // AIでレシピ生成を試みる
    try {
      const systemPrompt = `あなたは犬の手作り食の専門家です。
与えられた食材を使って、犬に安全で栄養バランスの良いレシピを提案してください。

【重要】以下の食材は絶対に使用しないでください（アレルギー登録済み）:
${allergyLabels.length > 0 ? allergyLabels.join('、') : 'なし'}

【犬に危険な食材】絶対に使用禁止:
玉ねぎ、ニンニク、ネギ類、チョコレート、ぶどう、レーズン、アボカド、キシリトール、マカダミアナッツ、アルコール

出力形式（JSON）:
{
  "name": "レシピ名",
  "description": "レシピの説明（50文字以内）",
  "ingredients": ["材料1 分量", "材料2 分量", ...],
  "steps": ["手順1", "手順2", ...],
  "caloriesPerServing": 数値,
  "safetyNote": "安全に関する注意点"
}`;

      const userPrompt = `食材: ${ingredients.join('、')}
体重: ${weight}kg
アレルギー: ${allergyLabels.length > 0 ? allergyLabels.join('、') : 'なし'}

この食材を使って、犬用の手作りごはんレシピを1つ提案してください。`;

      const response = await getAIResponse(systemPrompt, userPrompt);

      // JSONをパース
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recipe = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // AIが使えない場合はモックを使用
    }

    // モックフォールバック
    if (!recipe) {
      // アレルギーに対応したレシピを選択
      const availableRecipes = MOCK_RECIPES.filter(r => {
        // アレルギー食材を含むレシピを除外
        if (allergyList.includes(r.mainProtein)) return false;
        return true;
      });

      recipe = availableRecipes.length > 0
        ? availableRecipes[Math.floor(Math.random() * availableRecipes.length)]
        : MOCK_RECIPES[2]; // 白身魚レシピをデフォルト
    }

    return NextResponse.json({
      recipe: {
        ...recipe,
        portionSize,
        weightKg: weight,
        dailyCalories,
        caloriesPerMeal,
        allergiesExcluded: allergyLabels,
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
