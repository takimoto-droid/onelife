'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  generateAffiliateUrl,
  trackAffiliateClick,
  AFFILIATE_DISPLAY,
  DOG_BREEDS,
  VISIT_FREQUENCY_OPTIONS,
  DogInfoForAffiliate,
} from '@/lib/affiliate';

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
  const { data: session, status } = useSession();
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
  const [affiliateUrl, setAffiliateUrl] = useState<string>('');

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

    if (session) {
      fetchDogInfo();
    }
  }, [session]);

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

  // 診断完了時にアフィリエイトURLを生成
  const completeDiagnosis = () => {
    const dogInfo: DogInfoForAffiliate = {
      breed: data.breed,
      age: parseInt(data.age) || 0,
      weight: parseFloat(data.weight) || 0,
      visitFrequency: data.visitFrequency,
      hasCondition: data.hasCondition,
    };

    const url = generateAffiliateUrl(dogInfo);
    setAffiliateUrl(url);
    setStep('result');
  };

  // 外部サイトへ遷移
  const handleAffiliateClick = () => {
    // トラッキング
    trackAffiliateClick('insurance_comparison', {
      breed: data.breed,
      age: parseInt(data.age) || 0,
      weight: parseFloat(data.weight) || 0,
      visitFrequency: data.visitFrequency,
      hasCondition: data.hasCondition,
    });

    // 新しいタブで開く
    window.open(affiliateUrl, '_blank', 'noopener,noreferrer');
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

          {/* メインCTAカード */}
          <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-pink-50 border-2 border-blue-200">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-soft mb-4">
                <span className="text-3xl">🛡️</span>
              </div>
              <h3 className="text-xl font-bold text-brown-700 mb-2">
                あなたの犬に合う保険をチェック
              </h3>
              <p className="text-brown-500 mb-4">
                おすすめの保険を比較して、最適な保険を見つけましょう。
              </p>

              {/* メリット表示 */}
              <div className="bg-white/80 rounded-xl p-4 mb-6">
                <ul className="space-y-2 text-left">
                  {AFFILIATE_DISPLAY.insurance.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-brown-600">
                      <span className="text-green-500">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 無料説明 */}
              <p className="text-sm text-blue-600 font-medium mb-4">
                🆓 {AFFILIATE_DISPLAY.insurance.description}
              </p>

              {/* メインCTAボタン */}
              <Button
                onClick={handleAffiliateClick}
                className="w-full py-4 text-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <span className="flex items-center justify-center gap-2">
                  <span>🔍</span>
                  {AFFILIATE_DISPLAY.insurance.ctaText}
                </span>
              </Button>

              <p className="text-xs text-brown-400 mt-3">
                外部の保険比較サイトに移動します
              </p>
            </div>
          </Card>

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
              }}
              className="flex-1"
            >
              もう一度診断する
            </Button>
            <Link href="/insurance" className="flex-1">
              <Button variant="outline" className="w-full">
                保険一覧を見る
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
