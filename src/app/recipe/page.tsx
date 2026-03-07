'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

// ================================================
// AIドッグフードレシピページ
// ================================================
//
// 【機能】
// 1. 犬の体重入力 → 食事量を計算
// 2. アレルギー登録 → レシピから除外
// 3. 食材入力 → AIがレシピ生成
// 4. レシピ保存 → マイレシピに追加
// ================================================

// アレルギー食材の選択肢
const ALLERGY_OPTIONS = [
  { id: 'chicken', label: '鶏肉', emoji: '🐔' },
  { id: 'beef', label: '牛肉', emoji: '🐄' },
  { id: 'pork', label: '豚肉', emoji: '🐷' },
  { id: 'fish', label: '魚', emoji: '🐟' },
  { id: 'dairy', label: '乳製品', emoji: '🥛' },
  { id: 'wheat', label: '小麦', emoji: '🌾' },
  { id: 'egg', label: '卵', emoji: '🥚' },
  { id: 'soy', label: '大豆', emoji: '🫘' },
];

// よく使う食材の候補
const INGREDIENT_SUGGESTIONS = [
  '鶏むね肉', '鶏ささみ', '牛肉', '豚肉', '白身魚',
  'にんじん', 'ブロッコリー', 'かぼちゃ', 'さつまいも', 'キャベツ',
  '白米', 'じゃがいも', '豆腐', '小松菜', '大根',
];

interface Recipe {
  name: string;
  description: string;
  ingredients: string[];
  steps: string[];
  portionSize: number;
  weightKg: number;
  caloriesPerServing: number;
  caloriesPerMeal: number;
  dailyCalories: number;
  allergiesExcluded: string[];
}

interface SavedRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  steps: string[];
  portionSize: number;
  savedAt: string;
}

type TabType = 'create' | 'saved';

export default function RecipePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // タブ管理
  const [activeTab, setActiveTab] = useState<TabType>('create');

  // 犬の情報
  const [dogWeight, setDogWeight] = useState<string>('5');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

  // 食材入力
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);

  // レシピ
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);

  // 状態
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 保存レシピを取得
  useEffect(() => {
    if (session) {
      fetchSavedRecipes();
    }
  }, [session]);

  const fetchSavedRecipes = async () => {
    try {
      const res = await fetch('/api/recipe/saved');
      const data = await res.json();
      if (data.recipes) {
        setSavedRecipes(data.recipes);
      }
    } catch (error) {
      console.error('Failed to fetch saved recipes:', error);
    }
  };

  // トースト表示
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // アレルギー選択
  const toggleAllergy = (allergyId: string) => {
    setSelectedAllergies(prev =>
      prev.includes(allergyId)
        ? prev.filter(a => a !== allergyId)
        : [...prev, allergyId]
    );
  };

  // 食材追加
  const addIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients(prev => [...prev, trimmed]);
      setIngredientInput('');
    }
  };

  // 食材削除
  const removeIngredient = (ingredient: string) => {
    setIngredients(prev => prev.filter(i => i !== ingredient));
  };

  // レシピ生成
  const generateRecipe = async () => {
    if (ingredients.length === 0) {
      showToast('error', '食材を1つ以上入力してください');
      return;
    }

    setLoading(true);
    setRecipe(null);

    try {
      const res = await fetch('/api/recipe/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients,
          allergies: selectedAllergies,
          weightKg: parseFloat(dogWeight) || 5,
        }),
      });

      const data = await res.json();

      if (data.recipe) {
        setRecipe(data.recipe);
        showToast('success', 'レシピを生成しました');
      } else {
        showToast('error', data.error || 'レシピ生成に失敗しました');
      }
    } catch (error) {
      console.error('Recipe generation error:', error);
      showToast('error', 'レシピ生成に失敗しました');
    }

    setLoading(false);
  };

  // レシピ保存
  const saveRecipe = async () => {
    if (!recipe) return;

    setSaving(true);

    try {
      const res = await fetch('/api/recipe/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe),
      });

      const data = await res.json();

      if (data.success) {
        showToast('success', 'レシピを保存しました');
        fetchSavedRecipes();
      } else {
        showToast('error', data.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('Save recipe error:', error);
      showToast('error', '保存に失敗しました');
    }

    setSaving(false);
  };

  // 保存レシピ削除
  const deleteRecipe = async (recipeId: string) => {
    try {
      const res = await fetch(`/api/recipe/saved?id=${recipeId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        showToast('success', 'レシピを削除しました');
        fetchSavedRecipes();
      }
    } catch (error) {
      console.error('Delete recipe error:', error);
    }
  };

  // ローディング
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full" />
      </div>
    );
  }

  // 未ログイン
  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 pb-24">
      {/* トースト */}
      {toast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}>
            <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-md border-b border-cream-200 p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
          <Link href="/dashboard" className="text-pink-500 text-sm hover:text-pink-600">
            戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        {/* タイトル */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-brown-700 mb-2 flex items-center justify-center gap-2">
            <span>🍳</span>
            AIレシピ
          </h2>
          <p className="text-brown-400">
            愛犬の手作りごはんをAIが提案
          </p>
        </div>

        {/* タブ */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-pink-400 to-peach-400 text-white shadow-soft'
                : 'bg-white text-brown-500 border border-cream-200'
            }`}
          >
            🍳 レシピ作成
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeTab === 'saved'
                ? 'bg-gradient-to-r from-pink-400 to-peach-400 text-white shadow-soft'
                : 'bg-white text-brown-500 border border-cream-200'
            }`}
          >
            ❤️ マイレシピ ({savedRecipes.length})
          </button>
        </div>

        {/* レシピ作成タブ */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* 犬の体重入力 */}
            <Card variant="warm" className="p-4">
              <h3 className="font-bold text-brown-700 mb-3 flex items-center gap-2">
                <span>⚖️</span>
                犬の体重
              </h3>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={dogWeight}
                  onChange={(e) => setDogWeight(e.target.value)}
                  placeholder="5"
                  className="w-24 text-center text-lg"
                  min="1"
                  max="100"
                />
                <span className="text-brown-500 font-bold">kg</span>
              </div>
              <p className="text-xs text-brown-400 mt-2">
                体重に合わせた食事量を計算します
              </p>
            </Card>

            {/* アレルギー登録 */}
            <Card variant="warm" className="p-4">
              <h3 className="font-bold text-brown-700 mb-3 flex items-center gap-2">
                <span>⚠️</span>
                アレルギー食材
              </h3>
              <p className="text-xs text-brown-400 mb-3">
                登録した食材はレシピから除外されます
              </p>
              <div className="flex flex-wrap gap-2">
                {ALLERGY_OPTIONS.map((allergy) => (
                  <button
                    key={allergy.id}
                    onClick={() => toggleAllergy(allergy.id)}
                    className={`px-3 py-2 rounded-full text-sm transition-all flex items-center gap-1 ${
                      selectedAllergies.includes(allergy.id)
                        ? 'bg-red-100 text-red-600 border-2 border-red-300 font-bold'
                        : 'bg-white text-brown-500 border border-cream-200 hover:border-pink-200'
                    }`}
                  >
                    <span>{allergy.emoji}</span>
                    <span>{allergy.label}</span>
                    {selectedAllergies.includes(allergy.id) && <span>✕</span>}
                  </button>
                ))}
              </div>
            </Card>

            {/* 食材入力 */}
            <Card variant="warm" className="p-4">
              <h3 className="font-bold text-brown-700 mb-3 flex items-center gap-2">
                <span>🥕</span>
                手持ちの食材
              </h3>

              {/* 入力フォーム */}
              <div className="flex gap-2 mb-3">
                <Input
                  value={ingredientInput}
                  onChange={(e) => setIngredientInput(e.target.value)}
                  placeholder="食材を入力"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addIngredient(ingredientInput);
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={() => addIngredient(ingredientInput)}
                  variant="secondary"
                  className="px-4"
                >
                  追加
                </Button>
              </div>

              {/* 候補ボタン */}
              <div className="flex flex-wrap gap-2 mb-4">
                {INGREDIENT_SUGGESTIONS.filter(s => !ingredients.includes(s)).slice(0, 8).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => addIngredient(suggestion)}
                    className="px-3 py-1 text-sm bg-cream-100 text-brown-500 rounded-full hover:bg-pink-100 transition-colors"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>

              {/* 選択した食材 */}
              {ingredients.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-cream-200">
                  {ingredients.map((ingredient) => (
                    <span
                      key={ingredient}
                      className="px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-sm flex items-center gap-1"
                    >
                      {ingredient}
                      <button
                        onClick={() => removeIngredient(ingredient)}
                        className="hover:text-pink-800"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {/* 生成ボタン */}
            <Button
              onClick={generateRecipe}
              loading={loading}
              disabled={ingredients.length === 0}
              className="w-full"
            >
              🍳 AIでレシピを生成
            </Button>

            {/* 生成されたレシピ */}
            {recipe && (
              <Card variant="warm" className="p-4">
                {/* アレルギー注意表示 */}
                {recipe.allergiesExcluded.length > 0 && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm text-yellow-700">
                      ⚠️ アレルギー登録により、以下の食材を除外しています：
                      <span className="font-bold ml-1">
                        {recipe.allergiesExcluded.join('、')}
                      </span>
                    </p>
                  </div>
                )}

                {/* レシピヘッダー */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-brown-700">{recipe.name}</h3>
                    <p className="text-sm text-brown-400 mt-1">{recipe.description}</p>
                  </div>
                  <button
                    onClick={saveRecipe}
                    disabled={saving}
                    className="flex items-center gap-1 px-4 py-2 bg-pink-100 text-pink-600 rounded-full hover:bg-pink-200 transition-colors font-bold text-sm"
                  >
                    {saving ? '保存中...' : '❤️ 保存'}
                  </button>
                </div>

                {/* 食事量の目安 */}
                <div className="mb-4 p-4 bg-mint-50 border border-mint-200 rounded-xl">
                  <h4 className="font-bold text-brown-700 mb-2 flex items-center gap-2">
                    <span>📊</span>
                    このレシピの目安量
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-brown-400">体重</p>
                      <p className="font-bold text-brown-700 text-lg">{recipe.weightKg}kg</p>
                    </div>
                    <div>
                      <p className="text-brown-400">1食の目安量</p>
                      <p className="font-bold text-pink-600 text-lg">約{recipe.portionSize}g</p>
                    </div>
                    <div>
                      <p className="text-brown-400">1食のカロリー</p>
                      <p className="font-bold text-brown-700">{recipe.caloriesPerMeal}kcal</p>
                    </div>
                    <div>
                      <p className="text-brown-400">1日の必要量</p>
                      <p className="font-bold text-brown-700">{recipe.dailyCalories}kcal</p>
                    </div>
                  </div>
                </div>

                {/* 材料 */}
                <div className="mb-4">
                  <h4 className="font-bold text-brown-700 mb-2">📝 材料</h4>
                  <ul className="space-y-1">
                    {recipe.ingredients.map((ingredient, idx) => (
                      <li key={idx} className="text-brown-600 flex items-center gap-2">
                        <span className="w-2 h-2 bg-pink-300 rounded-full"></span>
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 作り方 */}
                <div className="mb-4">
                  <h4 className="font-bold text-brown-700 mb-2">👩‍🍳 作り方</h4>
                  <ol className="space-y-2">
                    {recipe.steps.map((step, idx) => (
                      <li key={idx} className="text-brown-600 flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </Card>
            )}

            {/* 安全注意表示 */}
            <div className="p-4 bg-cream-50 rounded-2xl border border-cream-200">
              <p className="text-xs text-brown-400 text-center leading-relaxed">
                ⚠️ このレシピは一般的な情報です。<br />
                犬の健康状態やアレルギーについては獣医師にご相談ください。<br />
                初めての食材は少量から試してください。
              </p>
            </div>
          </div>
        )}

        {/* マイレシピタブ */}
        {activeTab === 'saved' && (
          <div className="space-y-4">
            {savedRecipes.length > 0 ? (
              savedRecipes.map((savedRecipe) => (
                <Card key={savedRecipe.id} variant="warm" className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-brown-700">{savedRecipe.name}</h3>
                      <p className="text-xs text-brown-400 mt-1">{savedRecipe.description}</p>
                    </div>
                    <button
                      onClick={() => deleteRecipe(savedRecipe.id)}
                      className="text-brown-300 hover:text-red-500 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="text-sm text-brown-500 mb-3">
                    <span className="inline-block bg-mint-100 text-mint-600 px-2 py-1 rounded-full text-xs mr-2">
                      1食: 約{savedRecipe.portionSize}g
                    </span>
                    <span className="inline-block bg-pink-100 text-pink-600 px-2 py-1 rounded-full text-xs">
                      {savedRecipe.caloriesPerServing}kcal
                    </span>
                  </div>

                  {/* 材料プレビュー */}
                  <div className="text-sm text-brown-400">
                    材料: {savedRecipe.ingredients.slice(0, 3).join('、')}
                    {savedRecipe.ingredients.length > 3 && '...'}
                  </div>

                  <p className="text-xs text-brown-300 mt-2">
                    保存日: {new Date(savedRecipe.savedAt).toLocaleDateString('ja-JP')}
                  </p>
                </Card>
              ))
            ) : (
              <Card variant="warm" className="p-8 text-center">
                <div className="text-5xl mb-4">📖</div>
                <p className="font-bold text-brown-700 mb-2">保存したレシピはありません</p>
                <p className="text-sm text-brown-400">
                  気に入ったレシピを「❤️ 保存」してここに追加しましょう
                </p>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-cream-200 safe-area-inset-bottom z-40">
        <div className="max-w-4xl mx-auto flex justify-around py-2">
          <Link href="/dashboard" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1">ホーム</span>
          </Link>
          <Link href="/walk" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">🚶</span>
            <span className="text-xs mt-1">散歩</span>
          </Link>
          <Link href="/recipe" className="flex flex-col items-center py-2 px-4 text-pink-500">
            <span className="text-xl">🍳</span>
            <span className="text-xs mt-1 font-bold">レシピ</span>
          </Link>
          <Link href="/goods" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">🛍️</span>
            <span className="text-xs mt-1">グッズ</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">⚙️</span>
            <span className="text-xs mt-1">設定</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
