'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VaccineCard } from '@/components/VaccineCard';
import { NotificationSetup } from '@/components/NotificationSetup';

interface Dog {
  id: string;
  name: string;
  breed?: string;
  birthDate?: string;
  adoptedAt?: string;
  dogSize?: string;
  hasVisitedVet?: boolean;
  mainConcern?: string;
  vaccineSchedules: VaccineScheduleData[];
}

interface VaccineScheduleData {
  id: string;
  type: string;
  scheduledDate: string;
  completed: boolean;
}

// 選択中の犬IDをlocalStorageから取得
const getSelectedDogId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('selectedDogId');
};

// 選択中の犬IDをlocalStorageに保存
const setSelectedDogId = (id: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('selectedDogId', id);
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogIndex, setSelectedDogIndex] = useState(0);
  const [showDogSelector, setShowDogSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated' && !hasFetched.current) {
      hasFetched.current = true;

      const fetchData = async () => {
        try {
          const res = await fetch('/api/dogs');
          const data = await res.json();
          if (data.dogs) {
            setDogs(data.dogs);
            if (data.dogs.length === 0) {
              router.push('/onboarding');
              return;
            }
            // localStorageから選択中の犬を復元
            const savedDogId = getSelectedDogId();
            if (savedDogId) {
              const index = data.dogs.findIndex((d: Dog) => d.id === savedDogId);
              if (index >= 0) {
                setSelectedDogIndex(index);
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch dogs:', error);
        }
        setLoading(false);
      };

      fetchData();
    }
  }, [status, router]);

  // 犬を切り替え
  const handleSelectDog = (index: number) => {
    setSelectedDogIndex(index);
    setSelectedDogId(dogs[index].id);
    setShowDogSelector(false);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce-soft">🐕</div>
          <div className="spinner mx-auto" />
          <p className="mt-4 text-brown-400 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const dog = dogs[selectedDogIndex];
  const upcomingVaccines = dog?.vaccineSchedules?.filter((v) => !v.completed) || [];
  const isPremium = session.user.subscriptionStatus === 'active' || session.user.subscriptionStatus === 'trialing';
  const hasMultipleDogs = dogs.length > 1;

  // プレミアム機能のクリックハンドラー
  const handlePremiumFeatureClick = (e: React.MouseEvent, href: string, isPremiumFeature: boolean) => {
    if (isPremiumFeature && !isPremium) {
      e.preventDefault();
      router.push('/premium');
    }
  };

  // メニューアイテム
  const menuItems = [
    {
      href: '/vet',
      icon: '🏥',
      title: 'かかりつけ',
      description: '動物病院管理',
      bgColor: 'bg-mint-50',
      iconBg: 'bg-mint-100',
      isNew: true,
    },
    {
      href: '/community',
      icon: '🐕',
      title: 'ご近所',
      description: '匿名コミュニティ',
      premium: true,
      bgColor: 'bg-pink-50',
      iconBg: 'bg-pink-100',
      isNew: true,
    },
    {
      href: '/voice',
      icon: '🎤',
      title: '鳴き声翻訳',
      description: 'AIで気持ちを翻訳',
      premium: true,
      bgColor: 'bg-lavender-50',
      iconBg: 'bg-lavender-100',
    },
    {
      href: '/vaccine',
      icon: '💉',
      title: 'ワクチン',
      description: 'スケジュール管理',
      badge: upcomingVaccines.length > 0 ? `${upcomingVaccines.length}件` : undefined,
      bgColor: 'bg-mint-50',
      iconBg: 'bg-mint-100',
    },
    {
      href: '/insurance-compare',
      icon: '🛡️',
      title: '保険見直し',
      description: '診断&比較',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      isNew: true,
    },
    {
      href: '/walk',
      icon: '🚶',
      title: '散歩',
      description: 'ルート提案',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
    },
    {
      href: '/events',
      icon: '🎉',
      title: 'イベント',
      description: '展示会・パピパ',
      bgColor: 'bg-lavender-50',
      iconBg: 'bg-lavender-100',
      isNew: true,
    },
    {
      href: '/places',
      icon: '📍',
      title: '周辺施設',
      description: '病院・ドッグラン',
      bgColor: 'bg-peach-50',
      iconBg: 'bg-peach-100',
    },
    {
      href: '/restaurants',
      icon: '🍽️',
      title: 'ペット飲食店',
      description: '同伴OKのお店',
      bgColor: 'bg-peach-50',
      iconBg: 'bg-peach-100',
    },
    {
      href: '/family',
      icon: '👨‍👩‍👧',
      title: '家族共有',
      description: 'お世話情報シェア',
      bgColor: 'bg-pink-50',
      iconBg: 'bg-pink-100',
    },
    {
      href: '/breed-stats',
      icon: '📊',
      title: '犬種分布',
      description: '全国ランキング',
      bgColor: 'bg-cream-100',
      iconBg: 'bg-cream-200',
    },
    {
      href: '/sns',
      icon: '📸',
      title: 'SNS投稿',
      description: '投稿文生成',
      premium: true,
      bgColor: 'bg-pink-50',
      iconBg: 'bg-pink-100',
    },
    {
      href: '/goods',
      icon: '🎁',
      title: 'グッズ',
      description: 'おすすめ情報',
      bgColor: 'bg-pink-50',
      iconBg: 'bg-pink-100',
    },
    {
      href: '/recipe',
      icon: '🍳',
      title: 'AIレシピ',
      description: '手作りごはん',
      premium: true,
      bgColor: 'bg-peach-50',
      iconBg: 'bg-peach-100',
      isNew: true,
    },
    {
      href: '/food',
      icon: '🍖',
      title: 'フード見直し',
      description: 'AIおすすめ',
      premium: true,
      bgColor: 'bg-peach-50',
      iconBg: 'bg-peach-100',
    },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* ヘッダー */}
      <header className="header p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </div>
          <Link href="/settings" className="text-brown-400 hover:text-accent transition-colors p-2 rounded-full hover:bg-cream-100">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-6">
        {/* ウェルカムメッセージ - 犬カード */}
        {dog && (
          <div className="mb-6 relative">
            <button
              onClick={() => setShowDogSelector(!showDogSelector)}
              className="w-full bg-gradient-to-r from-pink-100 via-cream-100 to-peach-100 rounded-3xl p-5 shadow-card border border-cream-200 text-left hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-4xl shadow-sm border-2 border-cream-200">
                  🐕
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-brown-800">
                      {dog.name}ちゃん
                    </h2>
                    {hasMultipleDogs && (
                      <span className="text-brown-400 text-sm">
                        ▼ 切り替え
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-brown-500">
                    {dog.breed || '犬種未設定'}
                    {dog.dogSize && ` ・ ${getSizeLabel(dog.dogSize)}`}
                    {dog.birthDate && ` ・ ${calculateAge(new Date(dog.birthDate))}`}
                  </p>
                </div>
                {isPremium && (
                  <span className="premium-badge">Premium</span>
                )}
              </div>
            </button>

            {/* 犬セレクター（ドロップダウン） */}
            {showDogSelector && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-cream-200 z-50 overflow-hidden">
                {dogs.map((d, index) => (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDog(index)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-cream-50 transition-colors text-left ${
                      index === selectedDogIndex ? 'bg-accent/10' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-cream-100 rounded-full flex items-center justify-center text-xl">
                      🐕
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-brown-700">{d.name}ちゃん</p>
                      <p className="text-xs text-brown-400">
                        {d.breed || '犬種未設定'}
                      </p>
                    </div>
                    {index === selectedDogIndex && (
                      <span className="text-accent">✓</span>
                    )}
                  </button>
                ))}
                {/* 犬を追加ボタン */}
                <Link
                  href="/dogs/add"
                  className="w-full p-4 flex items-center gap-3 hover:bg-mint-50 transition-colors border-t border-cream-200"
                >
                  <div className="w-10 h-10 bg-mint-100 rounded-full flex items-center justify-center text-xl">
                    ➕
                  </div>
                  <p className="font-bold text-mint-600">新しい犬を追加</p>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* トライアル/プレミアム表示 */}
        {session.user.subscriptionStatus === 'trialing' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-lavender-50 to-pink-50 border-2 border-lavender-200 rounded-2xl">
            <p className="text-sm text-lavender-700">
              <span className="font-bold">無料トライアル中</span>
              <span className="ml-2 text-lavender-500">
                すべての機能をお試しいただけます
              </span>
            </p>
          </div>
        )}

        {/* メインメニュー */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.premium && !isPremium ? '/premium' : item.href}
              onClick={(e) => handlePremiumFeatureClick(e, item.href, !!item.premium)}
            >
              <div className={`${item.bgColor} rounded-3xl p-4 relative hover:-translate-y-1 transition-all duration-300 hover:shadow-card-hover border border-white/50 ${item.premium && !isPremium ? 'opacity-90' : ''}`}>
                {item.isNew && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-accent to-peach-400 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                    NEW
                  </span>
                )}
                {/* プレミアムバッジ（非課金ユーザー用） */}
                {item.premium && !isPremium && (
                  <span className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1">
                    <span>👑</span>
                    <span>Premium</span>
                  </span>
                )}
                <div className="text-center">
                  <div className={`w-12 h-12 ${item.iconBg} rounded-2xl mx-auto mb-2 flex items-center justify-center text-2xl shadow-sm`}>
                    {item.icon}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <h3 className="font-bold text-brown-700 text-sm">
                      {item.title}
                    </h3>
                    {item.premium && isPremium && (
                      <span className="bg-gradient-premium text-brown-800 text-[8px] px-1.5 py-0.5 rounded-full font-bold">P</span>
                    )}
                  </div>
                  <p className="text-xs text-brown-400">
                    {item.description}
                  </p>
                  {item.badge && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full font-medium">
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 直近のワクチン予定 */}
        {upcomingVaccines.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brown-700 flex items-center gap-2">
                <span>💉</span>
                直近のワクチン予定
              </h3>
              <Link
                href="/vaccine"
                className="text-sm text-accent hover:text-accent-dark font-medium"
              >
                すべて見る →
              </Link>
            </div>
            <div className="space-y-4">
              {upcomingVaccines.slice(0, 2).map((vaccine) => (
                <VaccineCard
                  key={vaccine.id}
                  type={vaccine.type}
                  scheduledDate={new Date(vaccine.scheduledDate)}
                  completed={vaccine.completed}
                />
              ))}
            </div>
          </div>
        )}

        {/* ワクチン未登録の場合 */}
        {dog && upcomingVaccines.length === 0 && (
          <Card className="mb-8 bg-gradient-to-br from-mint-50 to-cream-50 border-mint-200">
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📅</div>
              <h3 className="font-bold text-brown-700 mb-2">
                ワクチンスケジュールを作成しましょう
              </h3>
              <p className="text-sm text-brown-400 mb-4">
                {dog.name}ちゃんに必要なワクチンの予定を管理できます
              </p>
              <Link href="/vaccine">
                <Button>スケジュールを作成</Button>
              </Link>
            </div>
          </Card>
        )}

        {/* クイックアクション */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link href="/walk">
            <div className="bg-gradient-to-r from-blue-100 to-blue-50 rounded-3xl p-4 border border-blue-200 hover:-translate-y-1 transition-all duration-300 hover:shadow-card-hover">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                  🚶
                </div>
                <div>
                  <h3 className="font-bold text-brown-700">今日の散歩</h3>
                  <p className="text-xs text-brown-400">ルートを提案</p>
                </div>
              </div>
            </div>
          </Link>
          <Link
            href={isPremium ? '/voice' : '/premium'}
            onClick={(e) => handlePremiumFeatureClick(e, '/voice', true)}
          >
            <div className={`bg-gradient-to-r from-lavender-100 to-lavender-50 rounded-3xl p-4 border border-lavender-200 hover:-translate-y-1 transition-all duration-300 hover:shadow-card-hover relative ${!isPremium && 'opacity-90'}`}>
              {!isPremium && (
                <span className="absolute -top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1">
                  <span>👑</span>
                  <span>Premium</span>
                </span>
              )}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                  🎤
                </div>
                <div>
                  <h3 className="font-bold text-brown-700 flex items-center gap-1">
                    鳴き声翻訳
                  </h3>
                  <p className="text-xs text-brown-400">AIで気持ちを翻訳</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* 不安なこと */}
        {dog?.mainConcern && (
          <Card className="mb-8 bg-gradient-to-br from-cream-50 to-pink-50 border-cream-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💭</span>
              <div>
                <h3 className="font-bold text-brown-700 mb-2">
                  あなたの心配ごと
                </h3>
                <p className="text-brown-600">{dog.mainConcern}</p>
                <p className="text-sm text-brown-400 mt-3">
                  この不安を解消できるよう、わんライフがサポートします
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 注意書き */}
        <div className="disclaimer">
          <p>
            ※ わんライフは獣医療の代替ではありません。
            健康上の問題がある場合は、必ず獣医師にご相談ください。
          </p>
        </div>
      </main>

      {/* ボトムナビゲーション */}
      <nav className="bottom-nav">
        <div className="max-w-4xl mx-auto flex justify-around">
          <Link href="/dashboard" className="bottom-nav-item bottom-nav-item-active">
            <span className="text-xl">🏠</span>
            <span>ホーム</span>
          </Link>
          <Link href="/walk" className="bottom-nav-item">
            <span className="text-xl">🚶</span>
            <span>散歩</span>
          </Link>
          <Link href="/voice" className="bottom-nav-item">
            <span className="text-xl">🎤</span>
            <span>翻訳</span>
          </Link>
          <Link href="/family" className="bottom-nav-item">
            <span className="text-xl">👨‍👩‍👧</span>
            <span>家族</span>
          </Link>
          <Link href="/settings" className="bottom-nav-item">
            <span className="text-xl">⚙️</span>
            <span>設定</span>
          </Link>
        </div>
      </nav>

      {/* 通知セットアップ */}
      <NotificationSetup />
    </div>
  );
}

function calculateAge(birthDate: Date): string {
  const now = new Date();
  const months =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth());

  if (months < 12) {
    return `${months}ヶ月`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return `${years}歳`;
  }

  return `${years}歳${remainingMonths}ヶ月`;
}

function getSizeLabel(size: string): string {
  switch (size) {
    case 'small':
      return '小型犬';
    case 'medium':
      return '中型犬';
    case 'large':
      return '大型犬';
    default:
      return '';
  }
}
