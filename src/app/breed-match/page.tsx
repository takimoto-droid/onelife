'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// 質問の型定義
interface Question {
  id: string;
  question: string;
  subText?: string;
  icon: string;
  options: {
    label: string;
    value: string;
    icon?: string;
    description?: string;
  }[];
}

// AI推薦結果の型定義
interface BreedRecommendation {
  name: string;
  image: string;
  matchScore: number;
  characteristics: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  exerciseLevel: 'low' | 'medium' | 'high';
  size: 'small' | 'medium' | 'large';
  sheddingLevel: 'low' | 'medium' | 'high';
  description: string;
  reasonForYou: string;
  goodFor: string[];
  cautions: string[];
  monthlyInsuranceCost: string;
}

// 質問リスト（拡張版）
const QUESTIONS: Question[] = [
  {
    id: 'housing',
    question: '住居タイプを教えてください',
    subText: '犬種によって向き不向きがあります',
    icon: '🏠',
    options: [
      { label: 'マンション・アパート', value: 'apartment', icon: '🏢', description: '集合住宅にお住まい' },
      { label: '一戸建て', value: 'house', icon: '🏡', description: '戸建てにお住まい' },
    ],
  },
  {
    id: 'houseSize',
    question: '家の広さは？',
    icon: '📐',
    options: [
      { label: 'ワンルーム〜1K', value: 'small', icon: '🚪', description: '一人暮らし向け' },
      { label: '1LDK〜2DK', value: 'medium', icon: '🛋️', description: '2人暮らし向け' },
      { label: '2LDK以上', value: 'large', icon: '🏠', description: 'ファミリー向け' },
    ],
  },
  {
    id: 'hasYard',
    question: '庭はありますか？',
    subText: '大型犬には庭があると理想的です',
    icon: '🌳',
    options: [
      { label: 'はい、庭があります', value: 'true', icon: '🌿' },
      { label: 'いいえ、ありません', value: 'false', icon: '🚫' },
    ],
  },
  {
    id: 'walkTime',
    question: '1日の散歩時間は？',
    subText: '確保できる時間の目安',
    icon: '🚶',
    options: [
      { label: '10分くらい', value: 'short', icon: '⏱️', description: '短めの散歩' },
      { label: '30分くらい', value: 'medium', icon: '⏰', description: '普通の散歩' },
      { label: '1時間以上', value: 'long', icon: '🏃', description: 'しっかり運動' },
    ],
  },
  {
    id: 'preferredSize',
    question: '希望するワンちゃんのサイズは？',
    icon: '🐕',
    options: [
      { label: '小型犬', value: 'small', icon: '🐩', description: '〜10kg' },
      { label: '中型犬', value: 'medium', icon: '🐕', description: '10〜25kg' },
      { label: '大型犬', value: 'large', icon: '🦮', description: '25kg〜' },
      { label: 'こだわりなし', value: 'any', icon: '✨' },
    ],
  },
  {
    id: 'exerciseLevel',
    question: '希望する運動量は？',
    subText: '一緒にアクティブに過ごしたいですか？',
    icon: '🏃',
    options: [
      { label: '少なめがいい', value: 'low', icon: '🛋️', description: 'のんびり過ごしたい' },
      { label: '普通', value: 'medium', icon: '🚶', description: '適度に運動' },
      { label: '多めがいい', value: 'high', icon: '🏃', description: 'アクティブに!' },
    ],
  },
  {
    id: 'sheddingTolerance',
    question: '抜け毛の許容度は？',
    subText: 'お掃除の頻度に関わります',
    icon: '🧹',
    options: [
      { label: '少ない方がいい', value: 'low', icon: '✨', description: '掃除は最小限に' },
      { label: '多少は大丈夫', value: 'medium', icon: '👍', description: '許容範囲内' },
      { label: '気にしない', value: 'high', icon: '💪', description: '抜け毛OK!' },
    ],
  },
  {
    id: 'aloneTime',
    question: '犬の留守番時間は？',
    subText: '日中の不在時間の目安',
    icon: '🏡',
    options: [
      { label: '2時間以内', value: 'short', icon: '🏠', description: '在宅が多い' },
      { label: '4〜6時間', value: 'medium', icon: '⏰', description: '普通の勤務' },
      { label: '8時間以上', value: 'long', icon: '💼', description: 'フルタイム勤務' },
    ],
  },
  {
    id: 'experience',
    question: '犬を飼うのは初めてですか？',
    icon: '🌟',
    options: [
      { label: 'はい、初めてです', value: 'first', icon: '🔰', description: '初心者向けがいい' },
      { label: 'いいえ、経験あります', value: 'experienced', icon: '👍', description: '経験者' },
    ],
  },
  {
    id: 'hasChildren',
    question: 'お子さんはいますか？',
    subText: '子供に優しい犬種を優先します',
    icon: '👶',
    options: [
      { label: 'はい、います', value: 'true', icon: '👨‍👩‍👧' },
      { label: 'いいえ、いません', value: 'false', icon: '👤' },
    ],
  },
];

export default function BreedMatchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<BreedRecommendation[]>([]);
  const [selectedBreed, setSelectedBreed] = useState<BreedRecommendation | null>(null);
  const [error, setError] = useState('');

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full" />
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

  // AI診断を実行
  const analyzeWithAI = async (finalAnswers: Record<string, string>) => {
    setIsAnalyzing(true);
    setError('');

    try {
      // ユーザータイプを保存
      await fetch('/api/user/type', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType: 'want_dog' }),
      });

      // AI APIを呼び出し
      const res = await fetch('/api/ai/breed-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          housing: finalAnswers.housing,
          houseSize: finalAnswers.houseSize,
          walkTime: finalAnswers.walkTime,
          preferredSize: finalAnswers.preferredSize,
          experience: finalAnswers.experience,
          sheddingTolerance: finalAnswers.sheddingTolerance,
          exerciseLevel: finalAnswers.exerciseLevel,
          hasYard: finalAnswers.hasYard === 'true',
          hasChildren: finalAnswers.hasChildren === 'true',
          aloneTime: finalAnswers.aloneTime,
        }),
      });

      const data = await res.json();

      if (data.recommendations && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);
        setSelectedBreed(data.recommendations[0]);
      } else {
        setError('おすすめ犬種を取得できませんでした。もう一度お試しください。');
      }
    } catch (err) {
      console.error('AI recommendation error:', err);
      setError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectOption = async (value: string) => {
    const newAnswers = { ...answers, [QUESTIONS[currentStep].id]: value };
    setAnswers(newAnswers);

    if (currentStep === QUESTIONS.length - 1) {
      // 最後の質問 → AI分析開始
      await analyzeWithAI(newAnswers);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.push('/onboarding');
    }
  };

  const handleRetry = () => {
    setRecommendations([]);
    setSelectedBreed(null);
    setCurrentStep(0);
    setAnswers({});
    setError('');
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return { text: '飼いやすい', color: 'bg-mint-100 text-mint-600' };
      case 'medium': return { text: 'ふつう', color: 'bg-peach-100 text-peach-600' };
      case 'hard': return { text: '上級者向け', color: 'bg-pink-100 text-pink-600' };
      default: return { text: '', color: '' };
    }
  };

  const getExerciseLabel = (level: string) => {
    switch (level) {
      case 'low': return '少なめ（10〜20分/日）';
      case 'medium': return 'ふつう（30分〜1時間/日）';
      case 'high': return '多め（1時間以上/日）';
      default: return '';
    }
  };

  const getSheddingLabel = (level: string) => {
    switch (level) {
      case 'low': return '少ない';
      case 'medium': return '普通';
      case 'high': return '多い';
      default: return '';
    }
  };

  // 分析中の表示
  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 flex items-center justify-center p-4">
        <Card variant="warm" className="max-w-md w-full text-center py-12">
          <div className="space-y-6">
            <div className="text-6xl animate-bounce">🐕</div>
            <div>
              <h2 className="text-xl font-bold text-brown-700 mb-2">
                AIが診断中...
              </h2>
              <p className="text-brown-500">
                あなたの条件に合ったワンちゃんを探しています
              </p>
            </div>
            <div className="flex justify-center gap-2">
              {['🐩', '🐕', '🐶', '🦮', '🐕‍🦺'].map((emoji, i) => (
                <span
                  key={i}
                  className="text-2xl animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                >
                  {emoji}
                </span>
              ))}
            </div>
            <p className="text-sm text-brown-400">
              入力された条件をAIが分析しています
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 flex items-center justify-center p-4">
        <Card variant="warm" className="max-w-md w-full text-center py-12">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-xl font-bold text-brown-700 mb-2">エラーが発生しました</h2>
          <p className="text-brown-500 mb-6">{error}</p>
          <Button onClick={handleRetry}>もう一度試す</Button>
        </Card>
      </div>
    );
  }

  // 結果表示
  if (selectedBreed && recommendations.length > 0) {
    const difficulty = getDifficultyLabel(selectedBreed.difficulty);

    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 pb-24">
        {/* ヘッダー */}
        <header className="bg-white/80 backdrop-blur-md border-b border-cream-200 p-4 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl font-bold gradient-text text-center">AIおすすめ診断結果</h1>
          </div>
        </header>

        <main className="max-w-2xl mx-auto p-4 space-y-6">
          {/* おすすめ犬種タブ */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recommendations.map((breed, index) => (
              <button
                key={breed.name}
                onClick={() => setSelectedBreed(breed)}
                className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition-all ${
                  selectedBreed.name === breed.name
                    ? 'bg-pink-500 text-white'
                    : 'bg-white text-brown-600 hover:bg-pink-50'
                }`}
              >
                <span className="mr-1">{breed.image}</span>
                {index === 0 ? '1位' : index === 1 ? '2位' : '3位'}
              </button>
            ))}
          </div>

          {/* メイン結果カード */}
          <Card variant="warm" className="overflow-hidden">
            <div className="text-center py-6">
              <p className="text-sm text-pink-500 font-medium mb-2">
                {recommendations.indexOf(selectedBreed) === 0 ? 'あなたに最もおすすめ!' : 'おすすめ犬種'}
              </p>
              <div className="text-8xl mb-4">{selectedBreed.image}</div>
              <h2 className="text-3xl font-bold text-brown-700 mb-2">
                {selectedBreed.name}
              </h2>
              <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficulty.color}`}>
                  {difficulty.text}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-lavender-100 text-lavender-600">
                  マッチ度 {selectedBreed.matchScore}%
                </span>
              </div>
              <p className="text-brown-600 leading-relaxed px-4">
                {selectedBreed.description}
              </p>
            </div>
          </Card>

          {/* あなたへのおすすめ理由（AI生成） */}
          <Card variant="warm" className="border-2 border-pink-200 bg-pink-50/50">
            <h3 className="font-bold text-brown-700 mb-3 flex items-center gap-2">
              <span className="text-xl">🤖</span>
              AIからのおすすめ理由
            </h3>
            <p className="text-brown-600 leading-relaxed">
              {selectedBreed.reasonForYou}
            </p>
          </Card>

          {/* 特徴 */}
          <Card variant="warm">
            <h3 className="font-bold text-brown-700 mb-4 flex items-center gap-2">
              <span className="text-xl">✨</span>
              特徴
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedBreed.characteristics.map((char, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-sm"
                >
                  {char}
                </span>
              ))}
            </div>
          </Card>

          {/* 詳細情報 */}
          <Card variant="warm">
            <h3 className="font-bold text-brown-700 mb-4 flex items-center gap-2">
              <span className="text-xl">📋</span>
              詳細情報
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-cream-200">
                <span className="text-brown-500">🏃 必要な運動量</span>
                <span className="font-medium text-brown-700">
                  {getExerciseLabel(selectedBreed.exerciseLevel)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-cream-200">
                <span className="text-brown-500">📏 サイズ</span>
                <span className="font-medium text-brown-700">
                  {selectedBreed.size === 'small' ? '小型犬' : selectedBreed.size === 'medium' ? '中型犬' : '大型犬'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-cream-200">
                <span className="text-brown-500">🧹 抜け毛</span>
                <span className="font-medium text-brown-700">
                  {getSheddingLabel(selectedBreed.sheddingLevel)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-brown-500">💰 保険料目安</span>
                <span className="font-medium text-brown-700">
                  {selectedBreed.monthlyInsuranceCost}/月
                </span>
              </div>
            </div>
          </Card>

          {/* こんな方におすすめ */}
          <Card variant="warm">
            <h3 className="font-bold text-brown-700 mb-4 flex items-center gap-2">
              <span className="text-xl">👍</span>
              こんな方におすすめ
            </h3>
            <div className="space-y-2">
              {selectedBreed.goodFor.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-brown-600">
                  <span className="text-mint-500">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </Card>

          {/* 飼育の注意点 */}
          <Card variant="warm">
            <h3 className="font-bold text-brown-700 mb-4 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              飼育の注意点
            </h3>
            <div className="space-y-2">
              {selectedBreed.cautions.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-brown-600">
                  <span className="text-peach-500">•</span>
                  {item}
                </div>
              ))}
            </div>
          </Card>

          {/* アクションボタン */}
          <div className="space-y-3 pt-4">
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              🏠 ダッシュボードへ
            </Button>
            <Button variant="outline" onClick={handleRetry} className="w-full">
              🔄 もう一度診断する
            </Button>
          </div>

          {/* 注意書き */}
          <div className="text-center text-xs text-brown-400 py-4">
            <p>※ 診断結果はAIによる参考情報です。</p>
            <p>実際にお迎えする際はブリーダーやペットショップでご相談ください。</p>
          </div>
        </main>
      </div>
    );
  }

  // 質問表示
  const currentQuestion = QUESTIONS[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-md border-b border-cream-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold gradient-text">AI犬種診断</h1>
          <span className="text-sm text-brown-500">
            {currentStep + 1} / {QUESTIONS.length}
          </span>
        </div>
      </header>

      {/* プログレスバー */}
      <div className="bg-white border-b border-cream-100">
        <div className="max-w-2xl mx-auto">
          <div className="h-1 bg-cream-200">
            <div
              className="h-full bg-gradient-to-r from-pink-400 to-peach-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Card variant="warm" className="fade-in">
            <div className="text-center mb-8">
              <span className="text-5xl mb-4 block">{currentQuestion.icon}</span>
              <h2 className="text-xl font-bold text-brown-700">
                {currentQuestion.question}
              </h2>
              {currentQuestion.subText && (
                <p className="text-sm text-brown-400 mt-2">
                  {currentQuestion.subText}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelectOption(option.value)}
                  className="w-full p-4 text-left rounded-2xl border-2 border-cream-200 hover:border-pink-300 hover:bg-pink-50 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    {option.icon && (
                      <span className="text-2xl">{option.icon}</span>
                    )}
                    <div>
                      <span className="font-medium text-brown-700 block">
                        {option.label}
                      </span>
                      {option.description && (
                        <span className="text-xs text-brown-400">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <button
            onClick={handleBack}
            className="w-full mt-6 text-center text-brown-400 hover:text-brown-600 text-sm"
          >
            ← 戻る
          </button>
        </div>
      </main>

      {/* 注意書き */}
      <footer className="p-4">
        <div className="max-w-2xl mx-auto text-center text-xs text-brown-400">
          <p>AIがあなたにぴったりの犬種を診断します</p>
        </div>
      </footer>
    </div>
  );
}
