import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ================================================
// 保存レシピAPI
// ================================================
//
// 【機能】
// GET: 保存したレシピ一覧を取得
// POST: レシピを保存
// DELETE: 保存したレシピを削除
// ================================================

// メモリ内ストレージ（本番ではDBを使用）
const savedRecipesStore: Map<string, SavedRecipe[]> = new Map();

interface SavedRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  steps: string[];
  portionSize: number;
  weightKg: number;
  caloriesPerServing: number;
  savedAt: string;
}

// GET: 保存レシピ一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const userId = session.user.id;
    const recipes = savedRecipesStore.get(userId) || [];

    return NextResponse.json({
      recipes,
      count: recipes.length,
    });
  } catch (error) {
    console.error('Get saved recipes error:', error);
    return NextResponse.json(
      { error: 'レシピの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: レシピを保存
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const userId = session.user.id;
    const recipe = await request.json();

    // レシピデータの検証
    if (!recipe.name || !recipe.ingredients || !recipe.steps) {
      return NextResponse.json({ error: 'レシピデータが不正です' }, { status: 400 });
    }

    // 既存のレシピを取得
    const existingRecipes = savedRecipesStore.get(userId) || [];

    // 同じ名前のレシピがあれば上書き
    const existingIndex = existingRecipes.findIndex(r => r.name === recipe.name);

    const newRecipe: SavedRecipe = {
      id: `recipe_${Date.now()}`,
      name: recipe.name,
      description: recipe.description || '',
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      portionSize: recipe.portionSize || 100,
      weightKg: recipe.weightKg || 5,
      caloriesPerServing: recipe.caloriesPerServing || 180,
      savedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      existingRecipes[existingIndex] = newRecipe;
    } else {
      existingRecipes.unshift(newRecipe); // 最新を先頭に
    }

    // 最大20件まで保存
    const limitedRecipes = existingRecipes.slice(0, 20);
    savedRecipesStore.set(userId, limitedRecipes);

    return NextResponse.json({
      success: true,
      recipe: newRecipe,
      message: 'レシピを保存しました',
    });
  } catch (error) {
    console.error('Save recipe error:', error);
    return NextResponse.json(
      { error: 'レシピの保存に失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE: レシピを削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get('id');

    if (!recipeId) {
      return NextResponse.json({ error: 'レシピIDが必要です' }, { status: 400 });
    }

    const existingRecipes = savedRecipesStore.get(userId) || [];
    const filteredRecipes = existingRecipes.filter(r => r.id !== recipeId);
    savedRecipesStore.set(userId, filteredRecipes);

    return NextResponse.json({
      success: true,
      message: 'レシピを削除しました',
    });
  } catch (error) {
    console.error('Delete recipe error:', error);
    return NextResponse.json(
      { error: 'レシピの削除に失敗しました' },
      { status: 500 }
    );
  }
}
