'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BreedAutocomplete } from '@/components/BreedAutocomplete';

type StepType =
  | 'breed'
  | 'birthDate'
  | 'dogSize'
  | 'hasDisease'
  | 'visitFrequency'
  | 'livingEnv'
  | 'walkFrequency'
  | 'multiDog'
  | 'anxietyLevel'
  // 見直しユーザー向け追加質問
  | 'hasCurrentInsurance'
  | 'currentInsuranceCost'
  | 'insuranceConcern';

interface StepConfig {
  id: StepType;
  question: string;
  subText?: string;
  type: 'text' | 'date' | 'select' | 'scale';
  placeholder?: string;
  options?: { label: string; value: string; description?: string }[];
  field: string;
  forReviewingOnly?: boolean;
}

const STEPS: StepConfig[] = [
  // 基本質問（全ユーザー共通）
  {
    id: 'breed',
    question: 'ワンちゃんの犬種を教えてください',
    subText: 'わからない場合はスキップしてOK',
    type: 'text',
    placeholder: '例: トイプードル、柴犬、ミックス',
    field: 'breed',
  },
  {
    id: 'birthDate',
    question: 'ワンちゃんの生年月日は？',
    subText: 'だいたいでOKです',
    type: 'date',
    field: 'birthDate',
  },
  {
    id: 'dogSize',
    question: 'ワンちゃんのサイズは？',
    type: 'select',
    options: [
      { label: '小型犬', value: 'small', description: 'チワワ、トイプードルなど' },
      { label: '中型犬', value: 'medium', description: '柴犬、コーギーなど' },
      { label: '大型犬', value: 'large', description: 'ゴールデン、ラブラドールなど' },
      { label: 'わからない', value: 'unknown' },
    ],
    field: 'dogSize',
  },
  {
    id: 'hasDisease',
    question: '持病はありますか？',
    subText: '保険加入の可否に関わる場合があります',
    type: 'select',
    options: [
      { label: 'ない', value: 'no' },
      { label: 'ある', value: 'yes' },
      { label: 'わからない', value: 'unknown' },
    ],
    field: 'hasDisease',
  },
  {
    id: 'visitFrequency',
    question: '過去1年の通院回数は？',
    type: 'select',
    options: [
      { label: '0回', value: 'none' },
      { label: '1〜2回', value: 'low' },
      { label: '3回以上', value: 'high' },
      { label: '飼い始めたばかり', value: 'new_owner' },
    ],
    field: 'visitFrequency',
  },
  {
    id: 'livingEnv',
    question: '生活環境は？',
    type: 'select',
    options: [
      { label: '室内のみ', value: 'indoor' },
      { label: '室内 + 庭あり', value: 'indoor_yard' },
      { label: '室外中心', value: 'outdoor' },
    ],
    field: 'livingEnv',
  },
  {
    id: 'walkFrequency',
    question: '散歩の頻度は？',
    type: 'select',
    options: [
      { label: '毎日', value: 'daily' },
      { label: '週3〜5回', value: 'often' },
      { label: '週1〜2回', value: 'sometimes' },
      { label: 'ほぼなし', value: 'rarely' },
    ],
    field: 'walkFrequency',
  },
  {
    id: 'multiDog',
    question: '何頭飼っていますか？',
    subText: '多頭飼い割引がある保険もあります',
    type: 'select',
    options: [
      { label: '1頭のみ', value: '1' },
      { label: '2頭', value: '2' },
      { label: '3頭以上', value: '3+' },
    ],
    field: 'multiDogCount',
  },
  {
    id: 'anxietyLevel',
    question: '医療費の不安度は？',
    subText: '高額な治療費への備えを判断するために',
    type: 'scale',
    field: 'anxietyLevel',
  },
  // 見直しユーザー向け追加質問
  {
    id: 'hasCurrentInsurance',
    question: '現在ペット保険に入っていますか？',
    type: 'select',
    options: [
      { label: '入っている', value: 'yes' },
      { label: '入っていない', value: 'no' },
      { label: 'わからない', value: 'unknown' },
    ],
    field: 'hasCurrentInsurance',
    forReviewingOnly: true,
  },
  {
    id: 'currentInsuranceCost',
    question: '月々いくら払っていますか？',
    type: 'select',
    options: [
      { label: '〜1,000円', value: '~1000' },
      { label: '1,000〜2,000円', value: '1000-2000' },
      { label: '2,000〜3,000円', value: '2000-3000' },
      { label: '3,000円以上', value: '3000+' },
      { label: 'わからない', value: 'unknown' },
    ],
    field: 'currentInsuranceCost',
    forReviewingOnly: true,
  },
  {
    id: 'insuranceConcern',
    question: '今の保険で不満な点は？',
    type: 'select',
    options: [
      { label: '保険料が高い', value: 'expensive' },
      { label: '補償が少ない', value: 'low_coverage' },
      { label: '手続きが面倒', value: 'complicated' },
      { label: '特になし', value: 'none' },
    ],
    field: 'insuranceConcern',
    forReviewingOnly: true,
  },
];

export default function HearingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState('');
  const [dogId, setDogId] = useState<string | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [filteredSteps, setFilteredSteps] = useState<StepConfig[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 犬の情報を取得
        const dogsRes = await fetch('/api/dogs');
        const dogsData = await dogsRes.json();
        if (dogsData.dogs && dogsData.dogs.length > 0) {
          setDogId(dogsData.dogs[dogsData.dogs.length - 1].id);
        }

        // ユーザータイプを取得
        const userTypeRes = await fetch('/api/user/type');
        const userTypeData = await userTypeRes.json();
        setUserType(userTypeData.userType);

        // ユーザータイプに応じてステップをフィルター
        const steps = STEPS.filter(
          (step) => !step.forReviewingOnly || userTypeData.userType === 'reviewing'
        );
        setFilteredSteps(steps);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // デフォルトは全ユーザー向けの質問のみ
        setFilteredSteps(STEPS.filter((step) => !step.forReviewingOnly));
      }
    };

    if (session) {
      fetchData();
    }
  }, [session]);

  if (status === 'loading' || filteredSteps.length === 0) {
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

  const currentStepConfig = filteredSteps[currentStep];
  const progress = ((currentStep + 1) / filteredSteps.length) * 100;

  const handleNext = async (value: string) => {
    const newAnswers = { ...answers, [currentStepConfig.field]: value };
    setAnswers(newAnswers);
    setInputValue('');

    if (currentStep === filteredSteps.length - 1) {
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

  const handleScaleSelect = (value: number) => {
    handleNext(value.toString());
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
        dogSize: finalAnswers.dogSize || null,
        hasDisease: finalAnswers.hasDisease === 'yes' ? true : finalAnswers.hasDisease === 'no' ? false : null,
        visitFrequency: finalAnswers.visitFrequency || null,
        livingEnv: finalAnswers.livingEnv || null,
        walkFrequency: finalAnswers.walkFrequency || null,
        isMultiDog: finalAnswers.multiDogCount !== '1',
        multiDogCount: parseInt(finalAnswers.multiDogCount) || 1,
        anxietyLevel: parseInt(finalAnswers.anxietyLevel) || null,
        // 見直しユーザー向け
        hasCurrentInsurance: finalAnswers.hasCurrentInsurance === 'yes' ? true : finalAnswers.hasCurrentInsurance === 'no' ? false : null,
        currentInsuranceCost: finalAnswers.currentInsuranceCost || null,
        insuranceConcern: finalAnswers.insuranceConcern || null,
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
              {currentStep + 1} / {filteredSteps.length}
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
                  これであなたに合った保険をご提案できます。
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => router.push('/insurance')}
                    className="w-full"
                  >
                    おすすめ保険を見る
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                    className="w-full"
                  >
                    ダッシュボードへ
                  </Button>
                </div>
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
                  {currentStepConfig.subText && (
                    <p className="text-sm text-gray-500 mt-2">
                      {currentStepConfig.subText}
                    </p>
                  )}
                </div>

                {/* テキスト入力（犬種はオートコンプリート） */}
                {currentStepConfig.type === 'text' && (
                  <div className="space-y-4">
                    {currentStepConfig.id === 'breed' ? (
                      <BreedAutocomplete
                        value={inputValue}
                        onChange={setInputValue}
                        onSelect={(breed) => {
                          setInputValue(breed);
                        }}
                        placeholder={currentStepConfig.placeholder}
                        className="[&_input]:border-warm-300 [&_input]:focus:border-primary-400 [&_input]:focus:ring-primary-200 [&_input]:bg-white [&_input]:text-gray-900 [&_ul]:bg-white [&_ul]:border-warm-200 [&_li]:text-gray-700 [&_li:hover]:bg-primary-50"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={currentStepConfig.placeholder}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-warm-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 outline-none transition-all duration-200 bg-white text-center text-lg"
                      />
                    )}
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
                        key={option.value}
                        onClick={() => handleSelectOption(option.value)}
                        disabled={loading}
                        className="w-full p-4 text-left rounded-xl border-2 border-warm-200 hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 disabled:opacity-50"
                      >
                        <span className="font-medium text-primary-900">
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="block text-sm text-gray-500 mt-1">
                            {option.description}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* 5段階スケール */}
                {currentStepConfig.type === 'scale' && (
                  <div className="space-y-6">
                    <div className="flex justify-between text-sm text-gray-500 px-2">
                      <span>心配ない</span>
                      <span>とても心配</span>
                    </div>
                    <div className="flex justify-center gap-3">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          onClick={() => handleScaleSelect(value)}
                          disabled={loading}
                          className="w-14 h-14 rounded-full border-2 border-warm-300 hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 text-lg font-bold text-primary-900 disabled:opacity-50"
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <span key={value} className="text-xl">
                          {value <= 2 ? '😊' : value === 3 ? '😐' : '😟'}
                        </span>
                      ))}
                    </div>
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
