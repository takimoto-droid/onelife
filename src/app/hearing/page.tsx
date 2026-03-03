'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

type StepType = 'breed' | 'birthDate' | 'adoptedAt' | 'vet' | 'concern';

interface StepConfig {
  id: StepType;
  question: string;
  type: 'text' | 'date' | 'select';
  placeholder?: string;
  options?: { label: string; value: string }[];
  field: string;
}

const STEPS: StepConfig[] = [
  {
    id: 'breed',
    question: 'ワンちゃんの犬種を教えてください',
    type: 'text',
    placeholder: '例: トイプードル、柴犬、ミックス',
    field: 'breed',
  },
  {
    id: 'birthDate',
    question: 'ワンちゃんの生年月日は？',
    type: 'date',
    field: 'birthDate',
  },
  {
    id: 'adoptedAt',
    question: 'いつ頃お迎えしましたか？',
    type: 'date',
    field: 'adoptedAt',
  },
  {
    id: 'vet',
    question: '動物病院には行ったことがありますか？',
    type: 'select',
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
    type: 'select',
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
  const [inputValue, setInputValue] = useState('');
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

  const currentStepConfig = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = async (value: string) => {
    const newAnswers = { ...answers, [currentStepConfig.field]: value };
    setAnswers(newAnswers);
    setInputValue('');

    if (currentStep === STEPS.length - 1) {
      setLoading(true);
      try {
        await saveAnswers(newAnswers);
        setIsComplete(true);
      } catch (error) {
        console.error('Failed to save answers:', error);
      }
      setLoading(false);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSelectOption = (value: string) => {
    handleNext(value);
  };

  const handleSubmitInput = () => {
    if (inputValue.trim()) {
      handleNext(inputValue.trim());
    }
  };

  const saveAnswers = async (finalAnswers: Record<string, string>) => {
    if (!dogId) return;

    await fetch('/api/hearing/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dogId,
        breed: finalAnswers.breed || null,
        birthDate: finalAnswers.birthDate || null,
        adoptedAt: finalAnswers.adoptedAt || null,
        hasVisitedVet: finalAnswers.hasVisitedVet === 'yes',
        mainConcern: finalAnswers.mainConcern || null,
      }),
    });
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setInputValue('');
    }
  };

  const handleSkip = () => {
    handleNext('');
  };

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-warm-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-600">わんサポ</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {currentStep + 1} / {STEPS.length}
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
                    {currentStepConfig.question}
                  </h2>
                </div>

                {/* テキスト入力 */}
                {currentStepConfig.type === 'text' && (
                  <div className="space-y-4">
                    <Input
                      type="text"
                      placeholder={currentStepConfig.placeholder}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="text-center"
                    />
                    <Button
                      onClick={handleSubmitInput}
                      disabled={!inputValue.trim() || loading}
                      className="w-full"
                    >
                      次へ
                    </Button>
                    <button
                      onClick={handleSkip}
                      className="w-full text-sm text-gray-500 hover:text-gray-700"
                    >
                      わからない場合はスキップ
                    </button>
                  </div>
                )}

                {/* 日付入力 */}
                {currentStepConfig.type === 'date' && (
                  <div className="space-y-4">
                    <input
                      type="date"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-xl border border-warm-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 outline-none transition-all duration-200 bg-white text-center text-lg"
                    />
                    <Button
                      onClick={handleSubmitInput}
                      disabled={!inputValue || loading}
                      className="w-full"
                    >
                      次へ
                    </Button>
                    <button
                      onClick={handleSkip}
                      className="w-full text-sm text-gray-500 hover:text-gray-700"
                    >
                      わからない場合はスキップ
                    </button>
                  </div>
                )}

                {/* 選択肢 */}
                {currentStepConfig.type === 'select' && (
                  <div className="space-y-3">
                    {currentStepConfig.options?.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => handleSelectOption(option.value)}
                        disabled={loading}
                        className="w-full p-4 text-left rounded-xl border-2 border-warm-200 hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 disabled:opacity-50"
                      >
                        <span className="font-medium text-primary-900">
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
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
