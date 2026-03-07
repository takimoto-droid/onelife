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
  }[];
}

// 犬種情報の型定義
interface BreedInfo {
  id: string;
  name: string;
  image: string;
  matchScore?: number;
  characteristics: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  exerciseLevel: 'low' | 'medium' | 'high';
  size: 'small' | 'medium' | 'large';
  description: string;
  goodFor: string[];
  cautions: string[];
  monthlyInsuranceCost: string;
  // マッチング用のスコア属性
  apartmentFriendly: number; // マンション向き度 1-5
  smallSpaceFriendly: number; // 狭い部屋OK度 1-5
  lowExercise: number; // 運動量少なめOK度 1-5
  independentLevel: number; // 留守番OK度 1-5
  beginnerFriendly: number; // 初心者向き度 1-5
}

// 保険情報の型定義
interface InsuranceInfo {
  id: string;
  name: string;
  company: string;
  monthlyPrice: string;
  features: string[];
  url: string;
  recommended: boolean;
}

// 質問リスト
const QUESTIONS: Question[] = [
  {
    id: 'housing',
    question: '住居タイプを教えてください',
    subText: '犬種によって向き不向きがあります',
    icon: '🏠',
    options: [
      { label: 'マンション・アパート', value: 'apartment', icon: '🏢' },
      { label: '一戸建て', value: 'house', icon: '🏡' },
    ],
  },
  {
    id: 'space',
    question: '家の広さは？',
    icon: '📐',
    options: [
      { label: 'ワンルーム〜1K', value: 'studio', icon: '🚪' },
      { label: '1LDK〜2DK', value: '1ldk', icon: '🛋️' },
      { label: '2LDK以上', value: '2ldk_plus', icon: '🏠' },
    ],
  },
  {
    id: 'walkTime',
    question: '散歩に使える時間は？',
    subText: '1日あたりの目安です',
    icon: '🚶',
    options: [
      { label: '10分くらい', value: 'short', icon: '⏱️' },
      { label: '30分くらい', value: 'medium', icon: '⏰' },
      { label: '1時間以上', value: 'long', icon: '🏃' },
    ],
  },
  {
    id: 'homeTime',
    question: '日中のお家時間は？',
    subText: '留守番の時間に関わります',
    icon: '🏡',
    options: [
      { label: '在宅が多い', value: 'home', icon: '🏠' },
      { label: '日中は不在が多い', value: 'away', icon: '💼' },
    ],
  },
  {
    id: 'preferredSize',
    question: '希望するワンちゃんのサイズは？',
    icon: '🐕',
    options: [
      { label: '小型犬', value: 'small', icon: '🐩' },
      { label: '中型犬', value: 'medium', icon: '🐕' },
      { label: '大型犬', value: 'large', icon: '🦮' },
      { label: 'こだわりなし', value: 'any', icon: '✨' },
    ],
  },
  {
    id: 'experience',
    question: '犬を飼うのは初めてですか？',
    icon: '🌟',
    options: [
      { label: 'はい、初めてです', value: 'first', icon: '🔰' },
      { label: 'いいえ、経験あります', value: 'experienced', icon: '👍' },
    ],
  },
];

// 犬種データベース
const BREED_DATABASE: BreedInfo[] = [
  {
    id: 'toy_poodle',
    name: 'トイプードル',
    image: '🐩',
    characteristics: ['賢い', '抜け毛が少ない', '社交的', 'しつけやすい'],
    difficulty: 'easy',
    exerciseLevel: 'medium',
    size: 'small',
    description: '日本で最も人気の犬種。抜け毛が少なくマンションでも飼いやすい。賢くてしつけもしやすいので初心者にもおすすめ。',
    goodFor: ['初心者', 'マンション住まい', 'アレルギーが心配な方'],
    cautions: ['定期的なトリミングが必要', '毛玉ができやすい', '膝の病気に注意'],
    monthlyInsuranceCost: '2,000〜3,500円',
    apartmentFriendly: 5,
    smallSpaceFriendly: 4,
    lowExercise: 3,
    independentLevel: 3,
    beginnerFriendly: 5,
  },
  {
    id: 'shiba',
    name: '柴犬',
    image: '🐕',
    characteristics: ['忠実', '清潔好き', '独立心がある', '賢い'],
    difficulty: 'medium',
    exerciseLevel: 'medium',
    size: 'medium',
    description: '日本の伝統的な犬種。忠実で家族を大切にする。独立心があり留守番も得意。清潔好きでトイレトレーニングがしやすい。',
    goodFor: ['一人暮らし', '日中不在が多い方', '日本犬が好きな方'],
    cautions: ['換毛期の抜け毛が多い', 'しつけに根気が必要', '他の犬が苦手な子も'],
    monthlyInsuranceCost: '2,500〜4,000円',
    apartmentFriendly: 3,
    smallSpaceFriendly: 3,
    lowExercise: 2,
    independentLevel: 5,
    beginnerFriendly: 3,
  },
  {
    id: 'chihuahua',
    name: 'チワワ',
    image: '🐶',
    characteristics: ['小さい', '甘えん坊', '警戒心が強い', '活発'],
    difficulty: 'easy',
    exerciseLevel: 'low',
    size: 'small',
    description: '世界最小の犬種。運動量が少なくてOKで、狭い部屋でも飼いやすい。甘えん坊で飼い主にべったり。',
    goodFor: ['ワンルーム暮らし', '運動が苦手な方', '小さい犬が好きな方'],
    cautions: ['骨折しやすい', '寒さに弱い', '吠えやすい子も'],
    monthlyInsuranceCost: '1,800〜3,000円',
    apartmentFriendly: 5,
    smallSpaceFriendly: 5,
    lowExercise: 5,
    independentLevel: 2,
    beginnerFriendly: 4,
  },
  {
    id: 'shih_tzu',
    name: 'シーズー',
    image: '🦁',
    characteristics: ['穏やか', '人懐っこい', '吠えにくい', '落ち着いている'],
    difficulty: 'easy',
    exerciseLevel: 'low',
    size: 'small',
    description: '穏やかで落ち着いた性格。吠えにくいのでマンションに最適。人懐っこく、子供やお年寄りとも相性◎',
    goodFor: ['マンション住まい', '静かな犬が欲しい方', '家族で飼いたい方'],
    cautions: ['暑さに弱い', '目の病気に注意', '毎日のブラッシングが必要'],
    monthlyInsuranceCost: '2,000〜3,500円',
    apartmentFriendly: 5,
    smallSpaceFriendly: 5,
    lowExercise: 5,
    independentLevel: 4,
    beginnerFriendly: 5,
  },
  {
    id: 'miniature_dachshund',
    name: 'ミニチュアダックスフンド',
    image: '🌭',
    characteristics: ['活発', '好奇心旺盛', '甘えん坊', '遊び好き'],
    difficulty: 'easy',
    exerciseLevel: 'medium',
    size: 'small',
    description: '胴長短足の愛らしい姿が人気。活発で遊び好き、好奇心旺盛。家族と一緒にいるのが大好き。',
    goodFor: ['活発な犬が欲しい方', '子供がいる家庭', 'アウトドア好きな方'],
    cautions: ['腰の病気（ヘルニア）に注意', '吠えやすい子も', '太りやすい'],
    monthlyInsuranceCost: '2,200〜3,800円',
    apartmentFriendly: 4,
    smallSpaceFriendly: 4,
    lowExercise: 3,
    independentLevel: 3,
    beginnerFriendly: 4,
  },
];

// 保険データベース
const INSURANCE_DATABASE: Record<string, InsuranceInfo[]> = {
  default: [
    {
      id: 'anicom',
      name: 'どうぶつ健保ふぁみりぃ',
      company: 'アニコム損保',
      monthlyPrice: '2,560円〜',
      features: ['窓口精算OK', '全国6,400以上の病院で対応', '24時間健康相談'],
      url: 'https://www.anicom-sompo.co.jp/',
      recommended: true,
    },
    {
      id: 'ipet',
      name: 'うちの子',
      company: 'アイペット損保',
      monthlyPrice: '2,480円〜',
      features: ['窓口精算OK', '補償割合70%プランあり', 'ペット賠償責任特約'],
      url: 'https://www.ipet-ins.com/',
      recommended: true,
    },
    {
      id: 'ps',
      name: 'PS保険',
      company: 'ペットメディカルサポート',
      monthlyPrice: '1,600円〜',
      features: ['保険料が安い', '免責金額なし', '補償割合100%プランあり'],
      url: 'https://pshoken.co.jp/',
      recommended: false,
    },
  ],
};

export default function BreedMatchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<BreedInfo | null>(null);
  const [allResults, setAllResults] = useState<BreedInfo[]>([]);

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

  // マッチングスコアを計算
  const calculateMatchScore = (breed: BreedInfo, answers: Record<string, string>): number => {
    let score = 0;
    let maxScore = 0;

    // 住居タイプ
    if (answers.housing === 'apartment') {
      score += breed.apartmentFriendly;
      maxScore += 5;
    } else {
      score += 5; // 一戸建ては全犬種OK
      maxScore += 5;
    }

    // 家の広さ
    if (answers.space === 'studio') {
      score += breed.smallSpaceFriendly;
      maxScore += 5;
    } else if (answers.space === '1ldk') {
      score += Math.min(breed.smallSpaceFriendly + 1, 5);
      maxScore += 5;
    } else {
      score += 5;
      maxScore += 5;
    }

    // 散歩時間
    if (answers.walkTime === 'short') {
      score += breed.lowExercise;
      maxScore += 5;
    } else if (answers.walkTime === 'medium') {
      score += 4;
      maxScore += 5;
    } else {
      score += 5;
      maxScore += 5;
    }

    // 在宅時間
    if (answers.homeTime === 'away') {
      score += breed.independentLevel;
      maxScore += 5;
    } else {
      score += 5;
      maxScore += 5;
    }

    // 希望サイズ
    if (answers.preferredSize !== 'any') {
      if (answers.preferredSize === breed.size) {
        score += 5;
      } else {
        score += 1;
      }
      maxScore += 5;
    }

    // 飼育経験
    if (answers.experience === 'first') {
      score += breed.beginnerFriendly;
      maxScore += 5;
    } else {
      score += 5;
      maxScore += 5;
    }

    return Math.round((score / maxScore) * 100);
  };

  // 診断結果を計算
  const analyzeResults = (finalAnswers: Record<string, string>) => {
    const scoredBreeds = BREED_DATABASE.map(breed => ({
      ...breed,
      matchScore: calculateMatchScore(breed, finalAnswers),
    })).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    setAllResults(scoredBreeds);
    setResult(scoredBreeds[0]);
  };

  const handleSelectOption = async (value: string) => {
    const newAnswers = { ...answers, [QUESTIONS[currentStep].id]: value };
    setAnswers(newAnswers);

    if (currentStep === QUESTIONS.length - 1) {
      // 最後の質問 → 分析開始
      setIsAnalyzing(true);

      // ユーザータイプを保存
      try {
        await fetch('/api/user/type', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userType: 'want_dog' }),
        });
      } catch (error) {
        console.error('Failed to save user type:', error);
      }

      // 分析演出
      setTimeout(() => {
        analyzeResults(newAnswers);
        setIsAnalyzing(false);
      }, 2000);
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

  const handleGoToDashboard = () => {
    router.push('/dashboard');
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

  // ローディング中
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full" />
      </div>
    );
  }

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
                あなたにぴったりのワンちゃんを探しています
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
          </div>
        </Card>
      </div>
    );
  }

  // 結果表示
  if (result) {
    const difficulty = getDifficultyLabel(result.difficulty);
    const insurances = INSURANCE_DATABASE.default;

    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 pb-24">
        {/* ヘッダー */}
        <header className="bg-white/80 backdrop-blur-md border-b border-cream-200 p-4 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl font-bold gradient-text text-center">診断結果</h1>
          </div>
        </header>

        <main className="max-w-2xl mx-auto p-4 space-y-6">
          {/* メイン結果カード */}
          <Card variant="warm" className="overflow-hidden">
            <div className="text-center py-6">
              <p className="text-sm text-pink-500 font-medium mb-2">
                あなたにおすすめのワンちゃん
              </p>
              <div className="text-8xl mb-4">{result.image}</div>
              <h2 className="text-3xl font-bold text-brown-700 mb-2">
                {result.name}
              </h2>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficulty.color}`}>
                  {difficulty.text}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-lavender-100 text-lavender-600">
                  マッチ度 {result.matchScore}%
                </span>
              </div>
              <p className="text-brown-600 leading-relaxed px-4">
                {result.description}
              </p>
            </div>
          </Card>

          {/* 特徴 */}
          <Card variant="warm">
            <h3 className="font-bold text-brown-700 mb-4 flex items-center gap-2">
              <span className="text-xl">✨</span>
              特徴
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.characteristics.map((char, i) => (
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
                  {getExerciseLabel(result.exerciseLevel)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-cream-200">
                <span className="text-brown-500">📏 サイズ</span>
                <span className="font-medium text-brown-700">
                  {result.size === 'small' ? '小型犬' : result.size === 'medium' ? '中型犬' : '大型犬'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-brown-500">💰 保険料目安</span>
                <span className="font-medium text-brown-700">
                  {result.monthlyInsuranceCost}/月
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
              {result.goodFor.map((item, i) => (
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
              {result.cautions.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-brown-600">
                  <span className="text-peach-500">•</span>
                  {item}
                </div>
              ))}
            </div>
          </Card>

          {/* おすすめペット保険 */}
          <Card variant="warm">
            <h3 className="font-bold text-brown-700 mb-4 flex items-center gap-2">
              <span className="text-xl">🏥</span>
              {result.name}におすすめのペット保険
            </h3>
            <div className="space-y-4">
              {insurances.map((insurance) => (
                <div
                  key={insurance.id}
                  className={`p-4 rounded-2xl border-2 ${
                    insurance.recommended
                      ? 'border-pink-300 bg-pink-50'
                      : 'border-cream-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      {insurance.recommended && (
                        <span className="text-xs bg-pink-400 text-white px-2 py-0.5 rounded-full mb-1 inline-block">
                          おすすめ
                        </span>
                      )}
                      <h4 className="font-bold text-brown-700">{insurance.name}</h4>
                      <p className="text-sm text-brown-500">{insurance.company}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-pink-600">{insurance.monthlyPrice}</p>
                      <p className="text-xs text-brown-400">月額</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {insurance.features.map((feature, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 bg-cream-100 text-brown-500 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                  <a
                    href={insurance.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2 px-4 bg-white border border-pink-300 text-pink-600 rounded-xl text-sm font-medium hover:bg-pink-50 transition-colors"
                  >
                    公式サイトで詳細を見る →
                  </a>
                </div>
              ))}
            </div>
          </Card>

          {/* 他の候補 */}
          {allResults.length > 1 && (
            <Card variant="warm">
              <h3 className="font-bold text-brown-700 mb-4 flex items-center gap-2">
                <span className="text-xl">🐾</span>
                他にもおすすめ
              </h3>
              <div className="space-y-3">
                {allResults.slice(1, 4).map((breed) => (
                  <div
                    key={breed.id}
                    className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl"
                  >
                    <span className="text-3xl">{breed.image}</span>
                    <div className="flex-1">
                      <p className="font-medium text-brown-700">{breed.name}</p>
                      <p className="text-xs text-brown-400">
                        {breed.characteristics.slice(0, 2).join(' / ')}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-lavender-600">
                      {breed.matchScore}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* アクションボタン */}
          <div className="space-y-3 pt-4">
            <Button onClick={handleGoToDashboard} className="w-full">
              🏠 ダッシュボードへ
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setAllResults([]);
                setCurrentStep(0);
                setAnswers({});
              }}
              className="w-full"
            >
              🔄 もう一度診断する
            </Button>
          </div>

          {/* 注意書き */}
          <div className="text-center text-xs text-brown-400 py-4">
            <p>※ 診断結果は参考情報です。実際にお迎えする際は</p>
            <p>ブリーダーやペットショップでよくご相談ください。</p>
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
          <h1 className="text-xl font-bold gradient-text">犬種診断</h1>
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
                  className="w-full p-4 text-left rounded-2xl border-2 border-cream-200 hover:border-pink-300 hover:bg-pink-50 transition-all duration-200 flex items-center gap-3"
                >
                  {option.icon && (
                    <span className="text-2xl">{option.icon}</span>
                  )}
                  <span className="font-medium text-brown-700">
                    {option.label}
                  </span>
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
          <p>入力いただいた情報は、おすすめ犬種の診断に使用します</p>
        </div>
      </footer>
    </div>
  );
}
