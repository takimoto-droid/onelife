'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type StepType =
  | 'ownershipDuration'
  | 'dogAge'
  | 'digestiveIssue'
  | 'diarrhea'
  | 'appetite'
  | 'healthChange';

interface StepConfig {
  id: StepType;
  question: string;
  subText?: string;
  options: { label: string; value: string; description?: string }[];
  field: string;
}

const STEPS: StepConfig[] = [
  {
    id: 'ownershipDuration',
    question: 'ワンちゃんを飼い始めてどのくらいですか？',
    subText: 'フード選びの経験に合わせてご提案します',
    options: [
      { label: '飼い始めたばかり', value: 'new', description: '1ヶ月未満' },
      { label: '1年未満', value: 'under1year', description: 'まだ慣れている途中' },
      { label: '1〜3年', value: '1to3years', description: '少し慣れてきた' },
      { label: '3年以上', value: 'over3years', description: 'ベテラン飼い主さん' },
    ],
    field: 'ownershipDuration',
  },
  {
    id: 'dogAge',
    question: 'ワンちゃんの年齢は？',
    subText: '年齢に合ったフードをご提案します',
    options: [
      { label: 'パピー（1歳未満）', value: 'puppy', description: '成長期の子犬' },
      { label: 'ヤング（1〜3歳）', value: 'young', description: '元気いっぱいの時期' },
      { label: 'アダルト（4〜7歳）', value: 'adult', description: '落ち着いた成犬' },
      { label: 'シニア（8歳以上）', value: 'senior', description: '穏やかなシニア期' },
    ],
    field: 'dogAge',
  },
  {
    id: 'digestiveIssue',
    question: 'お腹をくだしやすいですか？',
    subText: '消化ケアが必要なフードを検討します',
    options: [
      { label: 'よくある', value: 'often', description: '頻繁にお腹を壊す' },
      { label: 'たまにある', value: 'sometimes', description: '時々調子が悪くなる' },
      { label: 'ほとんどない', value: 'rarely', description: 'お腹は丈夫' },
      { label: 'わからない', value: 'unknown' },
    ],
    field: 'digestiveIssue',
  },
  {
    id: 'diarrhea',
    question: '最近、下痢が多いですか？',
    subText: '獣医師への相談が必要な場合もお伝えします',
    options: [
      { label: 'はい、続いている', value: 'yes', description: '1週間以上続いている' },
      { label: '最近1〜2回あった', value: 'recent', description: '一時的なもの' },
      { label: 'いいえ', value: 'no', description: '下痢はしていない' },
      { label: 'わからない', value: 'unknown' },
    ],
    field: 'diarrhea',
  },
  {
    id: 'appetite',
    question: '食いつきはいかがですか？',
    subText: '食欲に合わせた提案をします',
    options: [
      { label: 'よく食べる', value: 'good', description: '食欲旺盛' },
      { label: '普通', value: 'normal', description: '適度に食べる' },
      { label: 'ムラがある', value: 'picky', description: '好き嫌いがある' },
      { label: '食べない', value: 'poor', description: '食欲がない' },
    ],
    field: 'appetite',
  },
  {
    id: 'healthChange',
    question: '最近気になる体調変化はありますか？',
    subText: 'フードで改善できる場合があります',
    options: [
      { label: '皮膚・かゆみ', value: 'skin', description: 'フケ、かゆがる' },
      { label: '毛並み', value: 'coat', description: '毛ツヤが悪い、抜け毛' },
      { label: '体重', value: 'weight', description: '太りすぎ、痩せすぎ' },
      { label: '特になし', value: 'none', description: '元気です' },
    ],
    field: 'healthChange',
  },
];

interface FoodRecommendation {
  rank: number;
  food: {
    id: string;
    name: string;
    brand: string;
    category: string;
    price: string;
    rating: number;
    features: string[];
    amazonUrl?: string;
  };
  reason: string;
  goodFor: string[];
  caution: string[];
  suitableFor: string;
}

interface RecommendationResult {
  recommendations: FoodRecommendation[];
  advice: string;
  disclaimer: string;
}

export default function FoodPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // Check premium status
  const [isPremium, setIsPremium] = useState(true);

  useEffect(() => {
    const checkPremium = async () => {
      try {
        const res = await fetch('/api/user/subscription');
        const data = await res.json();
        setIsPremium(data.subscriptionStatus === 'active' || data.subscriptionStatus === 'trialing');
      } catch {
        setIsPremium(true); // Default to true for demo
      }
    };
    if (session) {
      checkPremium();
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-dark-600 border-t-accent rounded-full" />
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  const currentStepConfig = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleSelectOption = async (value: string) => {
    const newAnswers = { ...answers, [currentStepConfig.field]: value };
    setAnswers(newAnswers);

    if (currentStep === STEPS.length - 1) {
      // Final step - get recommendations
      setLoading(true);
      try {
        const processedAnswers = {
          ownershipDuration: newAnswers.ownershipDuration,
          dogAge: newAnswers.dogAge,
          digestiveIssue: newAnswers.digestiveIssue === 'often' || newAnswers.digestiveIssue === 'sometimes',
          diarrhea: newAnswers.diarrhea === 'yes' || newAnswers.diarrhea === 'recent',
          appetite: newAnswers.appetite,
          healthChange: newAnswers.healthChange,
        };

        const res = await fetch('/api/food/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(processedAnswers),
        });
        const data = await res.json();
        setResult(data);
      } catch (error) {
        console.error('Failed to get recommendations:', error);
      }
      setLoading(false);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setAnswers({});
    setResult(null);
    setExpandedCard(null);
  };

  const getDifficultyColor = (category: string) => {
    switch (category) {
      case 'スタンダード':
        return 'bg-green-500/20 text-green-400';
      case 'プレミアム':
        return 'bg-blue-500/20 text-blue-400';
      case '超プレミアム':
        return 'bg-purple-500/20 text-purple-400';
      case '療法食':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-dark-600 text-dark-300';
    }
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '1';
      case 2:
        return '2';
      case 3:
        return '3';
      default:
        return rank.toString();
    }
  };

  // Premium gate
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-dark-900">
        <header className="bg-dark-800 border-b border-dark-700 p-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button onClick={() => router.back()} className="text-dark-400 hover:text-dark-200">
              &lt; 戻る
            </button>
            <h1 className="text-lg font-bold text-dark-100">ドッグフード見直しAI</h1>
            <div className="w-12" />
          </div>
        </header>
        <main className="p-4 flex items-center justify-center min-h-[80vh]">
          <Card className="max-w-md text-center">
            <div className="py-8">
              <span className="text-5xl mb-6 block">premium</span>
              <h2 className="text-xl font-bold text-dark-100 mb-4">
                プレミアム機能です
              </h2>
              <p className="text-dark-400 mb-6">
                ドッグフード見直しAIは有料会員限定の機能です。
                アップグレードすると、AIによるフード提案を受けられます。
              </p>
              <Button onClick={() => router.push('/settings')}>
                プランを確認する
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => (result ? handleRestart() : router.back())}
            className="text-dark-400 hover:text-dark-200"
          >
            {result ? 'やり直す' : '< 戻る'}
          </button>
          <h1 className="text-lg font-bold text-dark-100">ドッグフード見直しAI</h1>
          <div className="w-12" />
        </div>
      </header>

      {/* Progress bar */}
      {!result && (
        <div className="bg-dark-800 border-b border-dark-700">
          <div className="max-w-2xl mx-auto">
            <div className="h-1 bg-dark-700">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-4">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="animate-spin w-12 h-12 border-4 border-dark-600 border-t-accent rounded-full mb-4" />
              <p className="text-dark-300">AIがおすすめフードを分析中...</p>
            </div>
          ) : result ? (
            // Results display
            <div className="fade-in space-y-6">
              {/* Header section */}
              <div className="text-center mb-8">
                <span className="text-4xl block mb-4">AI</span>
                <h2 className="text-xl font-bold text-dark-100 mb-2">
                  おすすめドッグフード
                </h2>
                <p className="text-dark-400 text-sm">
                  ヒアリング結果をもとにAIが選びました
                </p>
              </div>

              {/* Advice banner */}
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-xl">light</span>
                  <div>
                    <p className="text-dark-200 text-sm font-medium">アドバイス</p>
                    <p className="text-dark-400 text-sm mt-1">{result.advice}</p>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-4">
                {result.recommendations.map((rec, index) => (
                  <Card
                    key={rec.food.id}
                    className={`cursor-pointer transition-all duration-300 ${
                      expandedCard === index ? 'ring-2 ring-accent' : ''
                    }`}
                    onClick={() => setExpandedCard(expandedCard === index ? null : index)}
                  >
                    {/* Rank badge */}
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          rec.rank === 1
                            ? 'bg-accent text-dark-900'
                            : rec.rank === 2
                            ? 'bg-dark-500 text-dark-100'
                            : 'bg-dark-600 text-dark-200'
                        }`}
                      >
                        {getRankEmoji(rec.rank)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${getDifficultyColor(
                              rec.food.category
                            )}`}
                          >
                            {rec.food.category}
                          </span>
                          <span className="text-dark-500 text-xs">{rec.food.brand}</span>
                        </div>
                        <h3 className="font-bold text-dark-100 mb-1">{rec.food.name}</h3>
                        <p className="text-accent text-sm mb-2">{rec.reason}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-500">star</span>
                            <span className="text-dark-300 text-sm">{rec.food.rating}</span>
                          </div>
                          <span className="text-dark-400 text-sm">{rec.food.price}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expandedCard === index && (
                      <div className="mt-4 pt-4 border-t border-dark-700 space-y-4">
                        {/* Features */}
                        <div>
                          <p className="text-dark-400 text-xs mb-2">特徴</p>
                          <div className="flex flex-wrap gap-2">
                            {rec.food.features.map((feature) => (
                              <span
                                key={feature}
                                className="px-2 py-1 bg-dark-700 rounded-full text-xs text-dark-200"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Good for */}
                        <div>
                          <p className="text-dark-400 text-xs mb-2">こんな方におすすめ</p>
                          <ul className="space-y-1">
                            {rec.goodFor.map((item) => (
                              <li
                                key={item}
                                className="text-sm text-dark-300 flex items-center gap-2"
                              >
                                <span className="text-green-500">check</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Caution */}
                        <div>
                          <p className="text-dark-400 text-xs mb-2">注意点</p>
                          <ul className="space-y-1">
                            {rec.caution.map((item) => (
                              <li
                                key={item}
                                className="text-sm text-dark-400 flex items-center gap-2"
                              >
                                <span className="text-yellow-500">warn</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Suitable for */}
                        <div className="bg-dark-700/50 rounded-lg p-3">
                          <p className="text-sm text-dark-200">
                            <span className="text-accent font-medium">ぴったりな方：</span>
                            {rec.suitableFor}
                          </p>
                        </div>

                        {/* Amazon Button */}
                        {rec.food.amazonUrl && (
                          <a
                            href={rec.food.amazonUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-[#FF9900] hover:bg-[#FFa820] text-dark-900 font-bold rounded-xl transition-colors"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                            </svg>
                            Amazonで見る
                          </a>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="mt-8 p-4 bg-dark-800 rounded-xl">
                <p className="text-xs text-dark-500 text-center">{result.disclaimer}</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={handleRestart} className="flex-1">
                  もう一度診断
                </Button>
                <Button onClick={() => router.push('/dashboard')} className="flex-1">
                  ホームに戻る
                </Button>
              </div>
            </div>
          ) : (
            // Hearing questions
            <div className="fade-in flex flex-col items-center justify-center min-h-[70vh]">
              <Card className="w-full max-w-md">
                <div className="text-center mb-6">
                  <span className="text-sm text-accent mb-2 block">
                    質問 {currentStep + 1} / {STEPS.length}
                  </span>
                  <h2 className="text-lg font-bold text-dark-100">
                    {currentStepConfig.question}
                  </h2>
                  {currentStepConfig.subText && (
                    <p className="text-sm text-dark-400 mt-2">{currentStepConfig.subText}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {currentStepConfig.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSelectOption(option.value)}
                      className="w-full p-4 text-left rounded-xl border-2 border-dark-600 hover:border-accent hover:bg-accent/5 transition-all duration-200"
                    >
                      <span className="font-medium text-dark-100">{option.label}</span>
                      {option.description && (
                        <span className="block text-sm text-dark-400 mt-1">
                          {option.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="w-full text-center text-dark-400 hover:text-dark-200 text-sm mt-6"
                  >
                    前の質問に戻る
                  </button>
                )}
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Footer disclaimer */}
      <footer className="p-4">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-dark-500 text-center">
            ※ この情報は一般的な参考情報です。ワンちゃんの健康状態によっては獣医師に相談されることをおすすめします。
          </p>
        </div>
      </footer>
    </div>
  );
}
