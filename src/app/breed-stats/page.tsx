'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

interface BreedStat {
  breed: string;
  count: number;
  change: number;
  percentage: number;
}

interface RegionStat {
  region: string;
  topBreed: string;
  totalCount: number;
}

interface AgeStat {
  ageGroup: string;
  percentage: number;
}

interface StatsData {
  totalDogs: number;
  lastUpdated: string;
  breedRanking: BreedStat[];
  regionStats: RegionStat[];
  ageStats: AgeStat[];
  trending: {
    breed: string;
    growthRate: string;
    reason: string;
  };
}

export default function BreedStatsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ranking' | 'region' | 'age'>('ranking');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/breed-stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
      setLoading(false);
    };

    if (status === 'authenticated') {
      fetchStats();
      // 30秒ごとに更新
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const getRankBadge = (index: number) => {
    if (index === 0) return { emoji: '🥇', color: 'text-yellow-400' };
    if (index === 1) return { emoji: '🥈', color: 'text-gray-300' };
    if (index === 2) return { emoji: '🥉', color: 'text-amber-600' };
    return { emoji: `${index + 1}`, color: 'text-dark-400' };
  };

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* ヘッダー */}
      <header className="header p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-dark-50 mb-2">犬種分布</h2>
          <p className="text-dark-400">
            全国のわんライフユーザーの犬種ランキング
          </p>
        </div>

        {stats && (
          <>
            {/* 統計サマリー */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="text-center">
                <p className="text-3xl font-bold gradient-text">
                  {stats.totalDogs.toLocaleString()}
                </p>
                <p className="text-sm text-dark-400">登録わんこ数</p>
              </Card>
              <Card className="text-center">
                <p className="text-3xl font-bold text-feature-health">
                  {stats.breedRanking.length}+
                </p>
                <p className="text-sm text-dark-400">犬種</p>
              </Card>
            </div>

            {/* トレンド */}
            <Card className="mb-6 bg-gradient-to-r from-accent/10 to-accent/5 border-accent/30">
              <div className="flex items-center gap-4">
                <div className="text-3xl">📈</div>
                <div>
                  <p className="text-sm text-accent">今月のトレンド</p>
                  <p className="font-bold text-dark-100">
                    {stats.trending.breed}{' '}
                    <span className="text-feature-health">{stats.trending.growthRate}</span>
                  </p>
                  <p className="text-xs text-dark-400 mt-1">{stats.trending.reason}</p>
                </div>
              </div>
            </Card>

            {/* タブ */}
            <div className="tab-list mb-6">
              <button
                className={`tab-item ${activeTab === 'ranking' ? 'tab-item-active' : ''}`}
                onClick={() => setActiveTab('ranking')}
              >
                全国ランキング
              </button>
              <button
                className={`tab-item ${activeTab === 'region' ? 'tab-item-active' : ''}`}
                onClick={() => setActiveTab('region')}
              >
                地域別
              </button>
              <button
                className={`tab-item ${activeTab === 'age' ? 'tab-item-active' : ''}`}
                onClick={() => setActiveTab('age')}
              >
                年齢層
              </button>
            </div>

            {/* ランキング */}
            {activeTab === 'ranking' && (
              <div className="space-y-3">
                {stats.breedRanking.map((breed, index) => {
                  const badge = getRankBadge(index);
                  return (
                    <Card key={breed.breed} variant="feature" className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${badge.color} w-10 text-center`}>
                          {badge.emoji}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-dark-100">{breed.breed}</p>
                          <p className="text-sm text-dark-400">
                            {breed.count.toLocaleString()}頭 ({breed.percentage}%)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${breed.change > 0 ? 'text-feature-health' : 'text-red-400'}`}>
                            {breed.change > 0 ? '+' : ''}{breed.change}
                          </p>
                          <p className="text-xs text-dark-500">今週</p>
                        </div>
                      </div>
                      {/* プログレスバー */}
                      <div className="mt-3 progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${breed.percentage * 5}%` }}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* 地域別 */}
            {activeTab === 'region' && (
              <div className="space-y-3">
                {stats.regionStats.map((region) => (
                  <Card key={region.region} variant="feature" className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-dark-100">{region.region}</p>
                        <p className="text-sm text-dark-400">
                          人気No.1: {region.topBreed}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-accent">
                          {region.totalCount.toLocaleString()}
                        </p>
                        <p className="text-xs text-dark-500">頭</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* 年齢層 */}
            {activeTab === 'age' && (
              <div className="space-y-4">
                {stats.ageStats.map((age) => (
                  <Card key={age.ageGroup} variant="feature" className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-dark-100">{age.ageGroup}</p>
                      <p className="font-bold text-accent">{age.percentage}%</p>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${age.percentage}%` }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* 更新時刻 */}
            <p className="text-center text-xs text-dark-500 mt-6">
              最終更新: {new Date(stats.lastUpdated).toLocaleString('ja-JP')}
            </p>
          </>
        )}

        {/* 注意書き */}
        <div className="disclaimer mt-6">
          <p>
            ※ このデータはわんライフユーザーの登録情報に基づいています。
            実際の全国的な犬種分布とは異なる場合があります。
          </p>
        </div>
      </main>

      {/* ボトムナビゲーション */}
      <nav className="bottom-nav">
        <div className="max-w-4xl mx-auto flex justify-around">
          <Link href="/dashboard" className="bottom-nav-item">
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
    </div>
  );
}
