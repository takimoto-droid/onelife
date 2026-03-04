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
            // 犬が登録されていない場合はオンボーディングへ
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
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const dog = dogs[0];
  const upcomingVaccines = dog?.vaccineSchedules?.filter((v) => !v.completed) || [];

  // メニューアイテム
  const menuItems = [
    {
      href: '/vaccine',
      icon: '💉',
      title: 'ワクチン',
      description: 'スケジュール管理',
      badge: upcomingVaccines.length > 0 ? `${upcomingVaccines.length}件` : undefined,
    },
    {
      href: '/insurance',
      icon: '🏥',
      title: '保険',
      description: 'AIレコメンド',
    },
    {
      href: '/walk',
      icon: '🚶',
      title: '散歩',
      description: 'ルート提案',
    },
    {
      href: '/places',
      icon: '📍',
      title: '周辺施設',
      description: '病院・ドッグラン',
    },
    {
      href: '/sns',
      icon: '📸',
      title: 'SNS投稿',
      description: '投稿文生成',
    },
    {
      href: '/goods',
      icon: '🎁',
      title: 'グッズ',
      description: 'おすすめ情報',
    },
  ];

  return (
    <div className="min-h-screen bg-warm-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-warm-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary-600">わんサポ</h1>
          <Link href="/settings" className="text-gray-500 hover:text-gray-700">
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
          <Card variant="warm" className="mb-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🐕</div>
              <div>
                <h2 className="text-xl font-bold text-primary-900">
                  {dog.name}ちゃんのダッシュボード
                </h2>
                <p className="text-sm text-gray-600">
                  {dog.breed || '犬種未設定'}
                  {dog.dogSize && ` ・ ${getSizeLabel(dog.dogSize)}`}
                  {dog.birthDate && ` ・ ${calculateAge(new Date(dog.birthDate))}`}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* トライアル表示 */}
        {session.user.subscriptionStatus === 'trialing' && (
          <div className="mb-6 p-4 bg-primary-50 rounded-xl border border-primary-200">
            <p className="text-sm text-primary-800">
              <span className="font-bold">無料トライアル中</span>
              <span className="ml-2">
                すべての機能をお試しいただけます
              </span>
            </p>
          </div>
        )}

        {/* メインメニュー */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="text-center py-2">
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <h3 className="font-bold text-primary-900 text-sm">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                  </p>
                  {item.badge && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
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
              <h3 className="text-lg font-bold text-primary-900">
                直近のワクチン予定
              </h3>
              <Link
                href="/vaccine"
                className="text-sm text-primary-600 hover:underline"
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
              <h3 className="font-bold text-primary-900 mb-2">
                ワクチンスケジュールを作成しましょう
              </h3>
              <p className="text-sm text-gray-600 mb-4">
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
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚶</span>
                <div>
                  <h3 className="font-bold text-green-800">今日の散歩</h3>
                  <p className="text-xs text-green-600">ルートを提案</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/sns">
            <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📸</span>
                <div>
                  <h3 className="font-bold text-pink-800">SNS投稿</h3>
                  <p className="text-xs text-pink-600">AIで投稿文生成</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* 不安なこと */}
        {dog?.mainConcern && (
          <Card variant="warm" className="mb-8">
            <h3 className="font-bold text-primary-900 mb-2">
              あなたの心配ごと
            </h3>
            <p className="text-gray-700">{dog.mainConcern}</p>
            <p className="text-sm text-gray-500 mt-3">
              この不安を解消できるよう、わんサポがサポートします。
            </p>
          </Card>
        )}

        {/* 注意書き */}
        <div className="disclaimer">
          <p>
            ※ わんサポは獣医療の代替ではありません。
            健康上の問題がある場合は、必ず獣医師にご相談ください。
          </p>
        </div>
      </main>

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
