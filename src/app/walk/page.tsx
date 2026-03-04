'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface RouteDestination {
  id: string;
  name: string;
  type: 'park' | 'shopping' | 'other';
  distance: {
    oneWay: number;
    roundTrip: number;
  };
  duration: {
    oneWay: number;
    roundTrip: number;
  };
  isWithinTime: boolean;
  rating?: number;
}

interface WalkRoute {
  id: string;
  name: string;
  description: string;
  totalDistance: number;
  totalDuration: number;
  isWithinTime: boolean;
  destinations: RouteDestination[];
  polyline?: string;
  recommendReason: string;
}

interface WalkHistory {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMin: number | null;
  distanceM: number | null;
}

type WalkPurpose = 'park' | 'shopping' | 'any';

export default function WalkPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [walkTime, setWalkTime] = useState(20);
  const [purpose, setPurpose] = useState<WalkPurpose>('any');
  const [isWalking, setIsWalking] = useState(false);
  const [walkStartTime, setWalkStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [suggestedRoutes, setSuggestedRoutes] = useState<WalkRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<WalkRoute | null>(null);
  const [history, setHistory] = useState<WalkHistory[]>([]);
  const [currentWalkId, setCurrentWalkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dogName, setDogName] = useState<string>('');
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dogsRes = await fetch('/api/dogs');
        const dogsData = await dogsRes.json();
        if (dogsData.dogs && dogsData.dogs.length > 0) {
          setDogName(dogsData.dogs[0].name);
        }

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
      const res = await fetch('/api/walk/route/detailed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMinutes: walkTime,
          purpose,
        }),
      });
      const data = await res.json();
      if (data.routes) {
        setSuggestedRoutes(data.routes);
      }
    } catch (error) {
      console.error('Failed to generate routes:', error);
    }
    setLoading(false);
  }, [walkTime, purpose]);

  const startWalk = async (route: WalkRoute) => {
    setSelectedRoute(route);
    setIsWalking(true);
    setWalkStartTime(new Date());
    setElapsedTime(0);
    setShowMap(true);

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
          distanceM: selectedRoute?.totalDistance || 0,
        }),
      });

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
    setShowMap(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
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

  const getDestinationIcon = (type: string) => {
    switch (type) {
      case 'park':
        return '🌳';
      case 'shopping':
        return '🏪';
      default:
        return '📍';
    }
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
            散歩ナビ
          </h2>
        </div>

        {/* 散歩中の表示 */}
        {isWalking ? (
          <div className="space-y-6">
            {/* 地図プレースホルダー */}
            {showMap && (
              <Card className="overflow-hidden">
                <div
                  ref={mapRef}
                  className="h-64 bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center relative"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-4xl">🗺️</span>
                      <p className="text-sm text-gray-600 mt-2">
                        地図表示エリア
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Google Maps APIキー設定で表示
                      </p>
                    </div>
                  </div>
                  {/* ルート情報オーバーレイ */}
                  <div className="absolute bottom-2 left-2 right-2 bg-white/90 rounded-lg p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-600">🔵 現在地</span>
                      <span className="text-red-600">🔴 {selectedRoute?.destinations[0]?.name}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Card className="text-center">
              <div className="py-6">
                <p className="text-gray-600 mb-2">
                  {dogName}ちゃんとお散歩中
                </p>
                <div className="text-5xl font-bold text-primary-600 mb-4">
                  {formatTime(elapsedTime)}
                </div>
                {selectedRoute && (
                  <div className="mb-6 space-y-2">
                    <p className="text-lg font-medium text-primary-900">
                      {selectedRoute.name}
                    </p>
                    <div className="flex justify-center gap-4 text-sm text-gray-500">
                      <span>目標: {selectedRoute.totalDuration}分</span>
                      <span>{formatDistance(selectedRoute.totalDistance)}</span>
                    </div>
                    {/* 進捗バー */}
                    <div className="w-full bg-warm-200 rounded-full h-2 mt-4">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (elapsedTime / 60 / selectedRoute.totalDuration) * 100)}%`
                        }}
                      />
                    </div>
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

            {/* ルート詳細 */}
            {selectedRoute && (
              <Card>
                <h3 className="font-bold text-primary-900 mb-4">
                  今日のルート詳細
                </h3>
                <div className="space-y-4">
                  {selectedRoute.destinations.map((dest, index) => (
                    <div
                      key={dest.id}
                      className="flex items-start gap-3 p-3 bg-warm-50 rounded-lg"
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-2xl">{getDestinationIcon(dest.type)}</span>
                        {index < selectedRoute.destinations.length - 1 && (
                          <div className="w-0.5 h-8 bg-warm-300 mt-1" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-primary-900">{dest.name}</h4>
                          {dest.isWithinTime ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              ⏱️ 往復可能
                            </span>
                          ) : (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                              ⚠️ 時間超過
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                          <div>
                            <span className="text-gray-400">片道:</span>{' '}
                            {formatDistance(dest.distance.oneWay)} / {dest.duration.oneWay}分
                          </div>
                          <div>
                            <span className="text-gray-400">往復:</span>{' '}
                            {formatDistance(dest.distance.roundTrip)} / {dest.duration.roundTrip}分
                          </div>
                        </div>
                      </div>
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
              <div className="flex items-center justify-center gap-4 mb-4">
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
              <div className="flex justify-center gap-2 mb-4">
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

              {/* 目的地タイプ選択 */}
              <h4 className="font-medium text-gray-700 mb-2 mt-6">目的地</h4>
              <div className="flex gap-2 mb-6">
                {[
                  { value: 'any' as WalkPurpose, label: 'おまかせ', icon: '🎲' },
                  { value: 'park' as WalkPurpose, label: '公園', icon: '🌳' },
                  { value: 'shopping' as WalkPurpose, label: '商店街', icon: '🏪' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPurpose(option.value)}
                    className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                      purpose === option.value
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-warm-200 hover:border-warm-300'
                    }`}
                  >
                    <span className="text-xl">{option.icon}</span>
                    <p className="text-sm font-medium text-primary-900 mt-1">
                      {option.label}
                    </p>
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
                  {suggestedRoutes.map((route, index) => (
                    <Card
                      key={route.id}
                      className={`hover:shadow-md transition-shadow ${
                        !route.isWithinTime ? 'opacity-75' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {index === 0 && route.isWithinTime && (
                            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                              おすすめ
                            </span>
                          )}
                          <h4 className="font-bold text-primary-900">
                            {route.name}
                          </h4>
                        </div>
                        {route.isWithinTime ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            ⏱️ {walkTime}分以内
                          </span>
                        ) : (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            ⚠️ 時間超過
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {route.description}
                      </p>

                      {/* 目的地リスト */}
                      <div className="space-y-2 mb-4">
                        {route.destinations.map((dest) => (
                          <div
                            key={dest.id}
                            className="flex items-center justify-between text-sm bg-warm-50 p-2 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <span>{getDestinationIcon(dest.type)}</span>
                              <span className="font-medium">{dest.name}</span>
                              {dest.rating && (
                                <span className="text-yellow-600 text-xs">
                                  ⭐{dest.rating}
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500 text-xs">
                              往復 {formatDistance(dest.distance.roundTrip)} / {dest.duration.roundTrip}分
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 合計情報 */}
                      <div className="flex items-center justify-between text-sm border-t border-warm-100 pt-3 mb-3">
                        <div className="text-gray-600">
                          合計: {formatDistance(route.totalDistance)} / {route.totalDuration}分
                        </div>
                      </div>

                      {/* おすすめ理由 */}
                      <p className="text-xs text-primary-700 bg-primary-50 p-2 rounded-lg mb-3">
                        💡 {route.recommendReason}
                      </p>

                      <Button
                        onClick={() => startWalk(route)}
                        className="w-full"
                        disabled={!route.isWithinTime}
                      >
                        このルートで散歩開始
                      </Button>
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
                          <span>{formatDistance(walk.distanceM)}</span>
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
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>・犬種や年齢に合わせて時間を調整</li>
                    <li>・暑い日は朝晩の涼しい時間帯に</li>
                    <li>・公園では他のワンちゃんとの交流も</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
