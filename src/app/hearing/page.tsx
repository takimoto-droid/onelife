'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Question {
  id: string;
  question: string;
  options: { label: string; value: string }[];
  field: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'breed',
    question: 'ワンちゃんの犬種を教えてください',
    options: [
      { label: 'トイプードル', value: 'トイプードル' },
      { label: 'チワワ', value: 'チワワ' },
      { label: '柴犬', value: '柴犬' },
      { label: 'ミニチュアダックスフンド', value: 'ミニチュアダックスフンド' },
      { label: 'フレンチブルドッグ', value: 'フレンチブルドッグ' },
      { label: 'その他・ミックス', value: 'ミックス' },
      { label: 'わからない', value: '' },
    ],
    field: 'breed',
  },
  {
    id: 'age',
    question: 'ワンちゃんの年齢は？',
    options: [
      { label: '3ヶ月未満', value: '2months' },
      { label: '3〜6ヶ月', value: '4months' },
      { label: '6ヶ月〜1歳', value: '9months' },
      { label: '1〜3歳', value: '2years' },
      { label: '3〜7歳', value: '5years' },
      { label: '7歳以上', value: '8years' },
      { label: 'わからない', value: '' },
    ],
    field: 'birthDate',
  },
  {
    id: 'adopted',
    question: 'いつ頃お迎えしましたか？',
    options: [
      { label: '1週間以内', value: '1week' },
      { label: '1ヶ月以内', value: '1month' },
      { label: '3ヶ月以内', value: '3months' },
      { label: '半年以内', value: '6months' },
      { label: '1年以内', value: '1year' },
      { label: '1年以上前', value: 'over1year' },
    ],
    field: 'adoptedAt',
  },
  {
    id: 'vet',
    question: '動物病院には行ったことがありますか？',
    options: [
      { label: 'はい、行ったことがある', value: 'yes' },
      { label: 'いいえ、まだない', value: 'no' },
      { label: 'これから予定している', value: 'planning' },
    ],
    field: 'hasVisitedVet',
  },
  {
    id: 'concern',
    question: '今、一番気になっていることは？',
    options: [
      { label: '健康管理・病気のこと', value: '健康管理や病気のことが心配' },
      { label: 'しつけ・トレーニング', value: 'しつけやトレーニングのやり方がわからない' },
      { label: 'ワクチン・予防接種', value: 'ワクチンや予防接種のスケジュールが不安' },
      { label: '食事・栄養', value: '食事や栄養管理が不安' },
      { label: '保険・費用', value: 'ペット保険や費用のことが気になる' },
      { label: '特にない', value: '特に大きな不安はない' },
    ],
    field: 'mainConcern',
  },
];

export default function HearingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dogId, setDogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const fetchDog = async () => {
      try {
        const res = await fetch('/api/dogs');
        const data = await res.json();
        if (data.dogs && data.dogs.length > 0) {
          setDogId(data.dogs[data.dogs.length - 1].id);
        }
      } catch (error) {
        console.error('Failed to fetch dog:', error);
      }
    };

    if (session) {
      fetchDog();
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full" />
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  const currentQuestion = QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

  const handleSelect = async (value: string) => {
    const newAnswers = { ...answers, [currentQuestion.field]: value };
    setAnswers(newAnswers);

    // 最後の質問の場合は保存して完了
    if (currentStep === QUESTIONS.length - 1) {
      setLoading(true);
      try {
        await saveAnswers(newAnswers);
        setIsComplete(true);
      } catch (error) {
        console.error('Failed to save answers:', error);
      }
      setLoading(false);
    } else {
      // 次の質問へ
      setCurrentStep(currentStep + 1);
    }
  };

  const saveAnswers = async (finalAnswers: Record<string, string>) => {
    if (!dogId) return;

    // 年齢を誕生日に変換
    let birthDate = null;
    if (finalAnswers.birthDate) {
      const now = new Date();
      const ageMap: Record<string, number> = {
        '2months': 2,
        '4months': 4,
        '9months': 9,
        '2years': 24,
        '5years': 60,
        '8years': 96,
      };
      const months = ageMap[finalAnswers.birthDate];
      if (months) {
        birthDate = new Date(now);
        birthDate.setMonth(birthDate.getMonth() - months);
      }
    }

    // お迎え日を変換
    let adoptedAt = null;
    if (finalAnswers.adoptedAt) {
      const now = new Date();
      const adoptedMap: Record<string, number> = {
        '1week': 7,
        '1month': 30,
        '3months': 90,
        '6months': 180,
        '1year': 365,
        'over1year': 400,
      };
      const days = adoptedMap[finalAnswers.adoptedAt];
      if (days) {
        adoptedAt = new Date(now);
        adoptedAt.setDate(adoptedAt.getDate() - days);
      }
    }

    // ヒアリング結果を保存
    await fetch('/api/hearing/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dogId,
        breed: finalAnswers.breed || null,
        birthDate: birthDate?.toISOString() || null,
        adoptedAt: adoptedAt?.toISOString() || null,
        hasVisitedVet: finalAnswers.hasVisitedVet === 'yes',
        mainConcern: finalAnswers.mainConcern || null,
      }),
    });
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-warm-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-600">わんサポ</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {currentStep + 1} / {QUESTIONS.length}
            </span>
          </div>
        </div>
      </header>

      {/* プログレスバー */}
      <div className="bg-white border-b border-warm-100">
        <div className="max-w-2xl mx-auto">
          <div className="h-1 bg-warm-200">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          {isComplete ? (
            <Card className="text-center fade-in">
              <div className="py-8">
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-2xl font-bold text-primary-900 mb-4">
                  ヒアリング完了！
                </h2>
                <p className="text-gray-600 mb-8">
                  ありがとうございます！
                  <br />
                  これであなたに合ったサポートができます。
                </p>
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="w-full"
                >
                  ダッシュボードへ
                </Button>
              </div>
            </Card>
          ) : (
            <div className="fade-in">
              <Card className="mb-6">
                <div className="text-center mb-8">
                  <p className="text-sm text-primary-600 mb-2">
                    質問 {currentStep + 1}
                  </p>
                  <h2 className="text-xl font-bold text-primary-900">
                    {currentQuestion.question}
                  </h2>
                </div>

                <div className="space-y-3">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => handleSelect(option.value)}
                      disabled={loading}
                      className="w-full p-4 text-left rounded-xl border-2 border-warm-200 hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 disabled:opacity-50"
                    >
                      <span className="font-medium text-primary-900">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="w-full text-center text-gray-500 hover:text-gray-700 text-sm"
                >
                  前の質問に戻る
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 注意書き */}
      <footer className="p-4">
        <div className="disclaimer max-w-2xl mx-auto">
          <p>
            ※ 入力いただいた情報は、あなたに合ったサポートを提供するために使用します。
          </p>
        </div>
      </footer>
    </div>
  );
}
