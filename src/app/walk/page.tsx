'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface WalkRoute {
  id: string;
  name: string;
  estimatedMinutes: number;
  distanceM: number;
  description: string;
  waypoints: string[];
}

interface WalkHistory {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMin: number | null;
  distanceM: number | null;
}

export default function WalkPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [walkTime, setWalkTime] = useState(20);
  const [isWalking, setIsWalking] = useState(false);
  const [walkStartTime, setWalkStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [suggestedRoutes, setSuggestedRoutes] = useState<WalkRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<WalkRoute | null>(null);
  const [history, setHistory] = useState<WalkHistory[]>([]);
  const [currentWalkId, setCurrentWalkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dogName, setDogName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 犬の情報を取得
        const dogsRes = await fetch('/api/dogs');
        const dogsData = await dogsRes.json();
        if (dogsData.dogs && dogsData.dogs.length > 0) {
          setDogName(dogsData.dogs[0].name);
        }

        // 散歩履歴を取得
        const historyRes = await fetch('/api/walk/history');
        const historyData = await historyRes.json();
        if (historyData.history) {
          setHistory(historyData.history);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    if (session) {
      fetchData();
    }
  }, [session]);

  // 経過時間の更新
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWalking && walkStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - walkStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWalking, walkStartTime]);

  const generateRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/walk/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: walkTime }),
      });
      const data = await res.json();
      if (data.routes) {
        setSuggestedRoutes(data.routes);
      }
    } catch (error) {
      console.error('Failed to generate routes:', error);
    }
    setLoading(false);
  }, [walkTime]);

  const startWalk = async (route: WalkRoute) => {
    setSelectedRoute(route);
    setIsWalking(true);
    setWalkStartTime(new Date());
    setElapsedTime(0);

    try {
      const res = await fetch('/api/walk/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeId: route.id }),
      });
      const data = await res.json();
      if (data.walkId) {
        setCurrentWalkId(data.walkId);
      }
    } catch (error) {
      console.error('Failed to start walk:', error);
    }
  };

  const endWalk = async () => {
    if (!currentWalkId) return;

    try {
      await fetch('/api/walk/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walkId: currentWalkId,
          durationMin: Math.floor(elapsedTime / 60),
          distanceM: selectedRoute?.distanceM || 0,
        }),
      });

      // 履歴を更新
      const historyRes = await fetch('/api/walk/history');
      const historyData = await historyRes.json();
      if (historyData.history) {
        setHistory(historyData.history);
      }
    } catch (error) {
      console.error('Failed to end walk:', error);
    }

    setIsWalking(false);
    setWalkStartTime(null);
    setSelectedRoute(null);
    setCurrentWalkId(null);
    setElapsedTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  return (
    <div className="min-h-screen bg-warm-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-warm-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold text-primary-600">わんサポ</h1>
          </Link>
          <Link href="/dashboard" className="text-primary-600 text-sm">
            戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🚶</span>
          <h2 className="text-2xl font-bold text-primary-900">
            散歩サポート
          </h2>
        </div>

        {/* 散歩中の表示 */}
        {isWalking ? (
          <div className="space-y-6">
            <Card className="text-center">
              <div className="py-8">
                <p className="text-gray-600 mb-2">
                  {dogName}ちゃんとお散歩中
                </p>
                <div className="text-6xl font-bold text-primary-600 mb-4">
                  {formatTime(elapsedTime)}
                </div>
                {selectedRoute && (
                  <div className="mb-6">
                    <p className="text-lg font-medium text-primary-900">
                      {selectedRoute.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      目標: {selectedRoute.estimatedMinutes}分 / {selectedRoute.distanceM}m
                    </p>
                  </div>
                )}
                <Button
                  onClick={endWalk}
                  variant="outline"
                  className="w-full max-w-xs"
                >
                  散歩を終了する
                </Button>
              </div>
            </Card>

            {/* ルート情報 */}
            {selectedRoute && (
              <Card>
                <h3 className="font-bold text-primary-900 mb-3">
                  今日のルート
                </h3>
                <p className="text-gray-600 mb-4">
                  {selectedRoute.description}
                </p>
                <div className="space-y-2">
                  {selectedRoute.waypoints.map((point, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{point}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* 散歩時間設定 */}
            <Card>
              <h3 className="font-bold text-primary-900 mb-4">
                散歩時間を設定
              </h3>
              <div className="flex items-center justify-center gap-4 mb-6">
                <button
                  onClick={() => setWalkTime(Math.max(10, walkTime - 5))}
                  className="w-12 h-12 rounded-full border-2 border-warm-300 hover:border-primary-400 text-xl font-bold text-primary-900"
                >
                  -
                </button>
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary-600">
                    {walkTime}
                  </span>
                  <span className="text-lg text-gray-500 ml-1">分</span>
                </div>
                <button
                  onClick={() => setWalkTime(Math.min(60, walkTime + 5))}
                  className="w-12 h-12 rounded-full border-2 border-warm-300 hover:border-primary-400 text-xl font-bold text-primary-900"
                >
                  +
                </button>
              </div>
              <div className="flex justify-center gap-2 mb-6">
                {[10, 15, 20, 30, 45].map((time) => (
                  <button
                    key={time}
                    onClick={() => setWalkTime(time)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      walkTime === time
                        ? 'bg-primary-500 text-white'
                        : 'bg-warm-200 text-gray-700 hover:bg-warm-300'
                    }`}
                  >
                    {time}分
                  </button>
                ))}
              </div>
              <Button
                onClick={generateRoutes}
                loading={loading}
                className="w-full"
              >
                ルートを提案してもらう
              </Button>
            </Card>

            {/* 提案ルート */}
            {suggestedRoutes.length > 0 && (
              <div>
                <h3 className="font-bold text-primary-900 mb-3">
                  おすすめルート
                </h3>
                <div className="space-y-4">
                  {suggestedRoutes.map((route) => (
                    <Card
                      key={route.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => startWalk(route)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-primary-900">
                            {route.name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {route.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>⏱️ {route.estimatedMinutes}分</span>
                            <span>📍 {route.distanceM}m</span>
                          </div>
                        </div>
                        <Button size="sm">選択</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 散歩履歴 */}
            {history.length > 0 && (
              <Card>
                <h3 className="font-bold text-primary-900 mb-4">
                  最近の散歩
                </h3>
                <div className="space-y-3">
                  {history.slice(0, 5).map((walk) => (
                    <div
                      key={walk.id}
                      className="flex items-center justify-between py-2 border-b border-warm-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(walk.startedAt)}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        {walk.durationMin && (
                          <span className="mr-3">{walk.durationMin}分</span>
                        )}
                        {walk.distanceM && (
                          <span>{walk.distanceM}m</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ヒント */}
            <Card variant="warm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h3 className="font-bold text-primary-900 mb-1">
                    散歩のコツ
                  </h3>
                  <p className="text-sm text-gray-700">
                    犬種や年齢に合わせて散歩時間を調整しましょう。
                    子犬やシニア犬は短めに、活発な犬種は長めがおすすめです。
                    暑い日は朝晩の涼しい時間帯に散歩しましょう。
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
