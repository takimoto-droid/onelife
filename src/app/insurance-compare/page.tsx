'use client';

import { useState, useEffect } from 'react';
// Auth removed - using localStorage
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  DOG_BREEDS,
  VISIT_FREQUENCY_OPTIONS,
} from '@/lib/affiliate';

// 保険データ
interface InsuranceData {
  id: string;
  name: string;
  company: string;
  monthlyPrice: { small: number; medium: number; large: number };
  coveragePercent: number;
  seniorAcceptable: boolean;
  diseaseAcceptable: boolean;
  features: string[];
  url: string;
}

const INSURANCES: InsuranceData[] = [
  {
    id: 'anicom',
    name: 'どうぶつ健保ふぁみりぃ',
    company: 'アニコム損害保険',
    monthlyPrice: { small: 2500, medium: 3200, large: 4000 },
    coveragePercent: 70,
    seniorAcceptable: true,
    diseaseAcceptable: false,
    features: ['業界最大手', '窓口精算対応', '24時間相談'],
    url: 'https://www.anicom-sompo.co.jp/',
  },
  {
    id: 'ipet',
    name: 'うちの子',
    company: 'アイペット損害保険',
    monthlyPrice: { small: 2200, medium: 2800, large: 3500 },
    coveragePercent: 70,
    seniorAcceptable: true,
    diseaseAcceptable: false,
    features: ['窓口精算対応', 'フルカバー', '保険料安定'],
    url: 'https://www.ipet-ins.com/',
  },
  {
    id: 'ps',
    name: 'PS保険',
    company: 'ペットメディカルサポート',
    monthlyPrice: { small: 1500, medium: 2000, large: 2500 },
    coveragePercent: 50,
    seniorAcceptable: true,
    diseaseAcceptable: true,
    features: ['業界最安クラス', '歯科治療対象', '免責金額なし'],
    url: 'https://pshoken.co.jp/',
  },
  {
    id: 'fpc',
    name: 'FPCフリーペットほけん',
    company: 'FPC',
    monthlyPrice: { small: 1200, medium: 1600, large: 2000 },
    coveragePercent: 50,
    seniorAcceptable: false,
    diseaseAcceptable: false,
    features: ['業界最安', 'シンプル', '値上がり小'],
    url: 'https://www.fpc-pet.co.jp/',
  },
  {
    id: 'petfamily',
    name: 'げんきナンバーわんスリム',
    company: 'ペット＆ファミリー損害保険',
    monthlyPrice: { small: 1800, medium: 2300, large: 2800 },
    coveragePercent: 70,
    seniorAcceptable: true,
    diseaseAcceptable: false,
    features: ['シニア安心', '大手グループ', '保険料安定'],
    url: 'https://www.petfamilyins.co.jp/',
  },
];

// 最適な保険を選ぶ関数
function selectBestInsurance(data: DiagnosisData): { insurance: InsuranceData; reason: string } {
  const age = parseInt(data.age) || 0;
  const weight = parseFloat(data.weight) || 5;
  const hasCondition = data.hasCondition;
  const visitFrequency = data.visitFrequency;

  // サイズ判定
  const size: 'small' | 'medium' | 'large' = weight < 10 ? 'small' : weight < 25 ? 'medium' : 'large';

  // フィルタリング
  let candidates = INSURANCES.filter(ins => {
    if (age >= 7 && !ins.seniorAcceptable) return false;
    if (hasCondition && !ins.diseaseAcceptable) return false;
    return true;
  });

  if (candidates.length === 0) {
    candidates = [INSURANCES[2]]; // PS保険（持病OK）
  }

  // スコアリング
  let bestInsurance = candidates[0];
  let bestScore = 0;
  let reason = '';

  for (const ins of candidates) {
    let score = 0;

    // 通院頻度が高い→補償率重視
    if (visitFrequency === 'high' || visitFrequency === 'medium') {
      if (ins.coveragePercent >= 70) score += 30;
    }

    // 通院頻度が低い→コスパ重視
    if (visitFrequency === 'low' || visitFrequency === 'none') {
      if (ins.monthlyPrice[size] <= 1800) score += 30;
    }

    // シニア犬
    if (age >= 7 && ins.seniorAcceptable) {
      score += 20;
    }

    // 持病あり
    if (hasCondition && ins.diseaseAcceptable) {
      score += 25;
    }

    // 若い犬→コスパ重視
    if (age < 3) {
      if (ins.monthlyPrice[size] <= 2000) score += 15;
    }

    if (score > bestScore) {
      bestScore = score;
      bestInsurance = ins;
    }
  }

  // 理由生成
  if (hasCondition) {
    reason = `持病があっても加入しやすく、${bestInsurance.features[0]}が特徴です`;
  } else if (age >= 7) {
    reason = `シニア犬でも安心して加入でき、${bestInsurance.features[0]}が魅力です`;
  } else if (visitFrequency === 'high' || visitFrequency === 'medium') {
    reason = `通院が多めなので補償${bestInsurance.coveragePercent}%の手厚いプランがおすすめです`;
  } else {
    reason = `コストパフォーマンスが良く、${bestInsurance.features[0]}が特徴です`;
  }

  return { insurance: bestInsurance, reason };
}

// ================================================
// 保険比較診断ページ（マネタイズ機能）
// ================================================
//
// 【フロー】
// 1. ユーザーが犬の情報を入力
// 2. 診断結果画面を表示
// 3. 「おすすめ保険を比較する」ボタンで外部サイトへ送客
//
// 【マネタイズ】
// - 比較サイトで資料請求/見積もり/契約が発生した場合に紹介手数料
// ================================================

type Step = 'input' | 'result';

interface DiagnosisData {
  breed: string;
  age: string;
  weight: string;
  visitFrequency: string;
  hasCondition: boolean;
}

export default function InsuranceComparePage() {
  // Auth removed
  const router = useRouter();

  const [step, setStep] = useState<Step>('input');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [data, setData] = useState<DiagnosisData>({
    breed: '',
    age: '',
    weight: '',
    visitFrequency: '',
    hasCondition: false,
  });
  const [recommendedInsurance, setRecommendedInsurance] = useState<{ insurance: InsuranceData; reason: string } | null>(null);

  // 既存の犬情報を取得
  useEffect(() => {
    const fetchDogInfo = async () => {
      try {
        const res = await fetch('/api/dogs');
        const result = await res.json();
        if (result.dogs && result.dogs.length > 0) {
          const dog = result.dogs[0];
          setData(prev => ({
            ...prev,
            breed: dog.breed || '',
            age: dog.birthDate ? calculateAge(new Date(dog.birthDate)).toString() : '',
          }));
        }
      } catch (error) {
        console.error('Failed to fetch dog info:', error);
      }
    };

    fetchDogInfo();
  }, []);

  // 年齢計算
  const calculateAge = (birthDate: Date): number => {
    const now = new Date();
    const years = now.getFullYear() - birthDate.getFullYear();
    const months = now.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && now.getDate() < birthDate.getDate())) {
      return years - 1;
    }
    return years;
  };

  // 診断完了時に最適な保険を選択
  const completeDiagnosis = () => {
    const result = selectBestInsurance(data);
    setRecommendedInsurance(result);
    setStep('result');
  };

  // 保険サイトへ遷移
  const handleInsuranceClick = () => {
    if (recommendedInsurance) {
      window.open(recommendedInsurance.insurance.url, '_blank', 'noopener,noreferrer');
    }
  };

  // ローディング
  if (false) { // Auth loading check removed
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full" />
      </div>
    );
  }

  // 未ログイン
  if (false) { // Auth check removed
    router.push('/');
    return null;
  }

  // 質問項目の定義
  const questionTitles = [
    'ワンちゃんの犬種は？',
    'ワンちゃんの年齢は？',
    'ワンちゃんの体重は？',
    '過去1年の通院頻度は？',
    '持病はありますか？',
  ];

  const totalQuestions = questionTitles.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      completeDiagnosis();
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const canProceed = () => {
    switch (currentQuestion) {
      case 0: // breed
        return data.breed !== '';
      case 1: // age
        return data.age !== '' && parseInt(data.age) >= 0;
      case 2: // weight
        return data.weight !== '' && parseFloat(data.weight) > 0;
      case 3: // visitFrequency
        return data.visitFrequency !== '';
      case 4: // hasCondition
        return true; // booleanなので常にtrue
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-blue-50 pb-24">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-md border-b border-cream-200 p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
          <Link href="/insurance" className="text-pink-500 text-sm hover:text-pink-600">
            戻る
          </Link>
        </div>
      </header>

      {/* 入力ステップ */}
      {step === 'input' && (
        <main className="max-w-2xl mx-auto p-4 py-6">
          {/* タイトル */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-brown-700 mb-2 flex items-center justify-center gap-2">
              <span>🛡️</span>
              保険見直し診断
            </h2>
            <p className="text-brown-400">
              簡単な質問に答えて最適な保険を見つけましょう
            </p>
          </div>

          {/* プログレスバー */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-brown-400 mb-2">
              <span>質問 {currentQuestion + 1} / {totalQuestions}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-400 to-blue-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 質問カード */}
          <Card variant="warm" className="p-6 mb-6">
            <h3 className="text-xl font-bold text-brown-700 mb-6 text-center">
              {questionTitles[currentQuestion]}
            </h3>

            {/* Q1: 犬種選択 */}
            {currentQuestion === 0 && (
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {DOG_BREEDS.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setData(prev => ({ ...prev, breed: option }));
                      setTimeout(handleNext, 200);
                    }}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      data.breed === option
                        ? 'bg-gradient-to-r from-pink-400 to-blue-400 text-white shadow-soft'
                        : 'bg-cream-100 text-brown-600 hover:bg-pink-100'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* Q2: 年齢入力 */}
            {currentQuestion === 1 && (
              <div className="flex items-center justify-center gap-3">
                <input
                  type="number"
                  value={data.age}
                  onChange={(e) => setData(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="3"
                  className="w-24 px-4 py-3 text-center text-2xl font-bold border-2 border-cream-200 rounded-xl focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none"
                  min="0"
                  max="30"
                />
                <span className="text-xl text-brown-500 font-bold">歳</span>
              </div>
            )}

            {/* Q3: 体重入力 */}
            {currentQuestion === 2 && (
              <div className="flex items-center justify-center gap-3">
                <input
                  type="number"
                  value={data.weight}
                  onChange={(e) => setData(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="5"
                  className="w-24 px-4 py-3 text-center text-2xl font-bold border-2 border-cream-200 rounded-xl focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none"
                  min="0"
                  max="100"
                />
                <span className="text-xl text-brown-500 font-bold">kg</span>
              </div>
            )}

            {/* Q4: 通院頻度 */}
            {currentQuestion === 3 && (
              <div className="space-y-3">
                {VISIT_FREQUENCY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setData(prev => ({ ...prev, visitFrequency: option.value }));
                      setTimeout(handleNext, 200);
                    }}
                    className={`w-full p-4 text-left rounded-xl transition-all ${
                      data.visitFrequency === option.value
                        ? 'bg-gradient-to-r from-pink-400 to-blue-400 text-white shadow-soft'
                        : 'bg-cream-100 text-brown-600 hover:bg-pink-100'
                    }`}
                  >
                    <p className="font-bold">{option.label}</p>
                    <p className={`text-sm ${data.visitFrequency === option.value ? 'text-white/80' : 'text-brown-400'}`}>
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Q5: 持病の有無 */}
            {currentQuestion === 4 && (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setData(prev => ({ ...prev, hasCondition: true }));
                    setTimeout(handleNext, 200);
                  }}
                  className={`flex-1 max-w-32 p-4 rounded-xl font-bold transition-all ${
                    data.hasCondition === true
                      ? 'bg-gradient-to-r from-pink-400 to-blue-400 text-white shadow-soft'
                      : 'bg-cream-100 text-brown-600 hover:bg-pink-100'
                  }`}
                >
                  はい
                </button>
                <button
                  onClick={() => {
                    setData(prev => ({ ...prev, hasCondition: false }));
                    setTimeout(handleNext, 200);
                  }}
                  className={`flex-1 max-w-32 p-4 rounded-xl font-bold transition-all ${
                    data.hasCondition === false
                      ? 'bg-gradient-to-r from-pink-400 to-blue-400 text-white shadow-soft'
                      : 'bg-cream-100 text-brown-600 hover:bg-pink-100'
                  }`}
                >
                  いいえ
                </button>
              </div>
            )}
          </Card>

          {/* ナビゲーション */}
          <div className="flex gap-4">
            {currentQuestion > 0 && (
              <Button
                variant="secondary"
                onClick={handleBack}
                className="flex-1"
              >
                戻る
              </Button>
            )}
            {(currentQuestion === 1 || currentQuestion === 2) && (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1"
              >
                {currentQuestion === totalQuestions - 1 ? '診断結果を見る' : '次へ'}
              </Button>
            )}
          </div>
        </main>
      )}

      {/* 結果画面 */}
      {step === 'result' && (
        <main className="max-w-2xl mx-auto p-4 py-6">
          {/* 結果タイトル */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-pink-100 to-blue-100 rounded-full mb-4">
              <span className="text-4xl">🎉</span>
            </div>
            <h2 className="text-2xl font-bold text-brown-700 mb-2">
              診断完了！
            </h2>
            <p className="text-brown-400">
              あなたの犬に合う保険をチェックしましょう
            </p>
          </div>

          {/* 入力サマリー */}
          <Card variant="warm" className="p-4 mb-6">
            <h3 className="font-bold text-brown-700 mb-3 flex items-center gap-2">
              <span>🐕</span>
              入力内容
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-cream-50 rounded-lg p-3">
                <p className="text-brown-400 text-xs">犬種</p>
                <p className="font-bold text-brown-700">{data.breed || '未入力'}</p>
              </div>
              <div className="bg-cream-50 rounded-lg p-3">
                <p className="text-brown-400 text-xs">年齢</p>
                <p className="font-bold text-brown-700">{data.age ? `${data.age}歳` : '未入力'}</p>
              </div>
              <div className="bg-cream-50 rounded-lg p-3">
                <p className="text-brown-400 text-xs">体重</p>
                <p className="font-bold text-brown-700">{data.weight ? `${data.weight}kg` : '未入力'}</p>
              </div>
              <div className="bg-cream-50 rounded-lg p-3">
                <p className="text-brown-400 text-xs">通院頻度</p>
                <p className="font-bold text-brown-700">
                  {VISIT_FREQUENCY_OPTIONS.find(o => o.value === data.visitFrequency)?.label || '未入力'}
                </p>
              </div>
            </div>
          </Card>

          {/* おすすめ保険カード */}
          {recommendedInsurance && (
            <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-pink-50 border-2 border-blue-200">
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 text-sm font-bold px-4 py-1 rounded-full mb-4">
                  <span>🥇</span> あなたに最適な保険
                </div>
              </div>

              {/* 保険詳細 */}
              <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-brown-800">
                      {recommendedInsurance.insurance.name}
                    </h3>
                    <p className="text-sm text-brown-500">{recommendedInsurance.insurance.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      ¥{recommendedInsurance.insurance.monthlyPrice.small.toLocaleString()}〜
                    </p>
                    <p className="text-xs text-brown-400">/ 月</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <span className="bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full">
                    補償 {recommendedInsurance.insurance.coveragePercent}%
                  </span>
                  {recommendedInsurance.insurance.seniorAcceptable && (
                    <span className="bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
                      シニアOK
                    </span>
                  )}
                </div>

                {/* おすすめ理由 */}
                <div className="p-3 bg-yellow-50 rounded-xl mb-4">
                  <p className="text-sm text-brown-700">
                    <span className="font-bold">💡 おすすめ理由：</span>
                    {recommendedInsurance.reason}
                  </p>
                </div>

                {/* 特徴 */}
                <div className="flex flex-wrap gap-2">
                  {recommendedInsurance.insurance.features.map((feature, i) => (
                    <span key={i} className="bg-cream-100 text-brown-600 text-xs px-3 py-1 rounded-full">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTAボタン */}
              <Button
                onClick={handleInsuranceClick}
                className="w-full py-4 text-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <span className="flex items-center justify-center gap-2">
                  <span>🛡️</span>
                  {recommendedInsurance.insurance.name}の公式サイトへ
                </span>
              </Button>

              <p className="text-xs text-brown-400 mt-3 text-center">
                {recommendedInsurance.insurance.company}の公式サイトに移動します
              </p>
            </Card>
          )}

          {/* 注意事項 */}
          <Card variant="warm" className="p-4 mb-6">
            <h4 className="font-bold text-brown-700 mb-2 flex items-center gap-2">
              <span>💡</span>
              保険選びのポイント
            </h4>
            <ul className="space-y-2 text-sm text-brown-600">
              <li className="flex items-start gap-2">
                <span className="text-pink-400">•</span>
                <span>補償割合（50%/70%/100%）と保険料のバランスを確認</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-400">•</span>
                <span>通院・入院・手術の補償範囲をチェック</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-400">•</span>
                <span>年齢や持病による加入制限を事前に確認</span>
              </li>
            </ul>
          </Card>

          {/* やり直しボタン */}
          <div className="flex gap-4">
            <Button
              variant="secondary"
              onClick={() => {
                setStep('input');
                setCurrentQuestion(0);
                setRecommendedInsurance(null);
              }}
              className="flex-1"
            >
              もう一度診断する
            </Button>
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full">
                ホームに戻る
              </Button>
            </Link>
          </div>

          {/* 免責事項 */}
          <div className="mt-8 p-4 bg-cream-50 rounded-2xl">
            <p className="text-xs text-brown-400 text-center leading-relaxed">
              ※ このページは保険の比較・検討をサポートするものであり、
              特定の保険商品を推奨するものではありません。
              保険への加入はご自身の判断と責任のもとで行ってください。
              当アプリは保険の販売・仲介を行っておりません。
            </p>
          </div>
        </main>
      )}

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
          <Link href="/insurance-compare" className="flex flex-col items-center py-2 px-4 text-pink-500">
            <span className="text-xl">🛡️</span>
            <span className="text-xs mt-1 font-bold">保険</span>
          </Link>
          <Link href="/community" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">💬</span>
            <span className="text-xs mt-1">コミュニティ</span>
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
