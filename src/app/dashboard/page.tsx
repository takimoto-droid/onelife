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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dogs, setDogs] = useState<Dog[]>([]);
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
          }
        } catch (error) {
          console.error('Failed to fetch dogs:', error);
        }
        setLoading(false);
      };

      fetchData();
    }
  }, [status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const dog = dogs[0];
  const upcomingVaccines = dog?.vaccineSchedules?.filter((v) => !v.completed) || [];
  const isPremium = session.user.subscriptionStatus === 'active';

  // メニューアイテム
  const menuItems = [
    {
      href: '/voice',
      icon: '🎤',
      title: '鳴き声翻訳',
      description: 'AIで気持ちを翻訳',
      premium: true,
      color: 'feature-voice',
    },
    {
      href: '/vaccine',
      icon: '💉',
      title: 'ワクチン',
      description: 'スケジュール管理',
      badge: upcomingVaccines.length > 0 ? `${upcomingVaccines.length}件` : undefined,
      color: 'feature-health',
    },
    {
      href: '/insurance',
      icon: '🏥',
      title: '保険',
      description: 'AIレコメンド',
      color: 'feature-insurance',
    },
    {
      href: '/walk',
      icon: '🚶',
      title: '散歩',
      description: 'ルート提案',
      color: 'feature-walk',
    },
    {
      href: '/places',
      icon: '📍',
      title: '周辺施設',
      description: '病院・ドッグラン',
      color: 'feature-food',
    },
    {
      href: '/restaurants',
      icon: '🍽️',
      title: 'ペット飲食店',
      description: '同伴OKのお店',
      color: 'feature-food',
    },
    {
      href: '/family',
      icon: '👨‍👩‍👧',
      title: '家族共有',
      description: 'お世話情報シェア',
      color: 'feature-family',
    },
    {
      href: '/breed-stats',
      icon: '📊',
      title: '犬種分布',
      description: '全国ランキング',
      color: 'feature-health',
    },
    {
      href: '/sns',
      icon: '📸',
      title: 'SNS投稿',
      description: '投稿文生成',
      color: 'feature-family',
    },
    {
      href: '/goods',
      icon: '🎁',
      title: 'グッズ',
      description: 'おすすめ情報',
      color: 'feature-goods',
    },
  ];

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* ヘッダー */}
      <header className="header p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          <Link href="/settings" className="text-dark-400 hover:text-accent transition-colors">
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
        {/* ウェルカムメッセージ */}
        {dog && (
          <Card className="mb-6 bg-gradient-to-r from-dark-800 to-dark-700">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🐕</div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-dark-50">
                  {dog.name}ちゃんのダッシュボード
                </h2>
                <p className="text-sm text-dark-300">
                  {dog.breed || '犬種未設定'}
                  {dog.dogSize && ` ・ ${getSizeLabel(dog.dogSize)}`}
                  {dog.birthDate && ` ・ ${calculateAge(new Date(dog.birthDate))}`}
                </p>
              </div>
              {isPremium && (
                <span className="premium-badge">Premium</span>
              )}
            </div>
          </Card>
        )}

        {/* トライアル/プレミアム表示 */}
        {session.user.subscriptionStatus === 'trialing' && (
          <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-xl">
            <p className="text-sm text-accent">
              <span className="font-bold">無料トライアル中</span>
              <span className="ml-2 text-dark-300">
                すべての機能をお試しいただけます
              </span>
            </p>
          </div>
        )}

        {/* メインメニュー */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card variant="interactive" className="h-full p-4">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center text-2xl bg-${item.color}/20`}>
                    {item.icon}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <h3 className="font-bold text-dark-100 text-sm">
                      {item.title}
                    </h3>
                    {item.premium && (
                      <span className="premium-badge text-[8px] px-1">P</span>
                    )}
                  </div>
                  <p className="text-xs text-dark-400">
                    {item.description}
                  </p>
                  {item.badge && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* 直近のワクチン予定 */}
        {upcomingVaccines.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-dark-100">
                直近のワクチン予定
              </h3>
              <Link
                href="/vaccine"
                className="text-sm text-accent hover:text-accent-light"
              >
                すべて見る
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
          <Card className="mb-8">
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="font-bold text-dark-100 mb-2">
                ワクチンスケジュールを作成しましょう
              </h3>
              <p className="text-sm text-dark-400 mb-4">
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
            <Card className="bg-gradient-to-r from-feature-walk/20 to-feature-walk/10 border-feature-walk/30">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚶</span>
                <div>
                  <h3 className="font-bold text-dark-100">今日の散歩</h3>
                  <p className="text-xs text-dark-400">ルートを提案</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/voice">
            <Card className={`bg-gradient-to-r from-feature-voice/20 to-feature-voice/10 border-feature-voice/30 ${!isPremium && 'opacity-70'}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎤</span>
                <div>
                  <h3 className="font-bold text-dark-100 flex items-center gap-1">
                    鳴き声翻訳
                    {!isPremium && <span className="premium-badge text-[8px] px-1">P</span>}
                  </h3>
                  <p className="text-xs text-dark-400">AIで気持ちを翻訳</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* 不安なこと */}
        {dog?.mainConcern && (
          <Card className="mb-8 bg-dark-800/50">
            <h3 className="font-bold text-dark-100 mb-2">
              あなたの心配ごと
            </h3>
            <p className="text-dark-300">{dog.mainConcern}</p>
            <p className="text-sm text-dark-400 mt-3">
              この不安を解消できるよう、わんライフがサポートします。
            </p>
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
