'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useGeolocation, GeoLocation } from '@/hooks/useGeolocation';
import { LocationErrorBanner } from '@/components/LocationErrorModal';

interface Waypoint {
  name: string;
  type: 'start' | 'destination' | 'landmark' | 'turn';
  description: string;
  distanceFromStart: number;
  durationFromStart: number;
}

interface RouteDestination {
  id: string;
  name: string;
  type: 'park' | 'shopping' | 'other';
  distance: { oneWay: number; roundTrip: number };
  duration: { oneWay: number; roundTrip: number };
  isWithinTime: boolean;
  rating?: number;
  description?: string;
  features?: string[];
  landmark?: string;
}

interface WalkRoute {
  id: string;
  name: string;
  description: string;
  totalDistance: number;
  totalDuration: number;
  isWithinTime: boolean;
  destinations: RouteDestination[];
  waypoints: Waypoint[];
  recommendReason: string;
  difficulty: 'easy' | 'normal' | 'challenging';
  scenery: string[];
  tips: string;
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

  // 位置情報フック
  const {
    location,
    error: locationError,
    loading: locationLoading,
    getCurrentLocation,
    setManualLocation,
  } = useGeolocation();

  // 状態管理
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
  const [hasViewedRoute, setHasViewedRoute] = useState<Set<string>>(new Set());

  // 初期データ取得
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
      // 位置情報を自動取得
      getCurrentLocation();
    }
  }, [session, getCurrentLocation]);

  // 散歩タイマー
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

  // ルート生成
  const generateRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/walk/route/detailed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMinutes: walkTime,
          purpose,
          latitude: location?.latitude,
          longitude: location?.longitude,
        }),
      });
      const data = await res.json();
      if (data.routes) {
        setSuggestedRoutes(data.routes);
        setHasViewedRoute(new Set()); // リセット
      }
    } catch (error) {
      console.error('Failed to generate routes:', error);
    }
    setLoading(false);
  }, [walkTime, purpose, location]);

  // 散歩開始
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

  // 散歩終了
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
  };

  // ユーティリティ関数
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
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
      case 'park': return '🌳';
      case 'shopping': return '🏪';
      default: return '📍';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return { text: 'やさしい', color: 'text-feature-health' };
      case 'normal': return { text: 'ふつう', color: 'text-accent' };
      case 'challenging': return { text: 'しっかり', color: 'text-feature-voice' };
      default: return { text: '', color: '' };
    }
  };

  const handleManualLocation = (loc: GeoLocation) => {
    setManualLocation(loc);
  };

  // Googleマップで経路を開く
  const openGoogleMaps = (route: WalkRoute) => {
    if (!location) return;

    // 目的地を取得
    const destination = route.destinations[0];
    if (!destination) return;

    // Google Maps URLを構築（徒歩モード）
    // 実際のAPIでは目的地の座標を使用するが、デモではプレースホルダー
    const origin = `${location.latitude},${location.longitude}`;

    // 目的地名で検索（実際の実装では座標を使用）
    const destinationQuery = encodeURIComponent(destination.name);

    // 経由地がある場合
    const waypoints = route.destinations.slice(1).map(d => encodeURIComponent(d.name)).join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destinationQuery}&travelmode=walking`;

    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }

    // 新しいタブで開く
    window.open(url, '_blank');

    // ルートを確認済みとしてマーク
    setHasViewedRoute(prev => new Set([...prev, route.id]));
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* ヘッダー */}
      <header className="header p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
          <Link href="/dashboard" className="text-accent text-sm">
            戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-dark-50 mb-2">散歩ナビ</h2>
          <p className="text-dark-400">
            {dogName ? `${dogName}ちゃんとの散歩ルートを提案` : '散歩ルートを提案'}
          </p>
        </div>

        {/* 位置情報エラー表示 */}
        {locationError && (
          <LocationErrorBanner
            error={locationError}
            onRetry={getCurrentLocation}
            onManualSelect={handleManualLocation}
            loading={locationLoading}
          />
        )}

        {/* 位置情報取得成功表示 */}
        {location && !locationError && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-feature-walk/10 border border-feature-walk/30 rounded-lg">
            <span className="text-feature-walk">📍</span>
            <span className="text-sm text-dark-300">現在地を取得しました</span>
            <button
              onClick={getCurrentLocation}
              className="ml-auto text-xs text-accent hover:underline"
            >
              更新
            </button>
          </div>
        )}

        {/* 散歩中の表示 */}
        {isWalking ? (
          <div className="space-y-6">
            {/* 地図エリア */}
            <Card className="overflow-hidden p-0">
              <div className="h-48 bg-gradient-to-br from-feature-walk/20 to-dark-700 flex items-center justify-center relative">
                <div className="text-center">
                  <span className="text-4xl">🗺️</span>
                  <p className="text-sm text-dark-300 mt-2">地図表示エリア</p>
                </div>
                {selectedRoute && (
                  <div className="absolute bottom-2 left-2 right-2 bg-dark-800/90 backdrop-blur-sm rounded-lg p-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-300">目的地</span>
                      <span className="text-accent font-medium">
                        {selectedRoute.destinations[0]?.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* タイマー */}
            <Card className="text-center">
              <p className="text-dark-400 mb-2">
                {dogName}ちゃんとお散歩中
              </p>
              <div className="text-5xl font-bold gradient-text mb-4">
                {formatTime(elapsedTime)}
              </div>
              {selectedRoute && (
                <div className="mb-6">
                  <p className="text-lg font-medium text-dark-100">{selectedRoute.name}</p>
                  <div className="flex justify-center gap-4 text-sm text-dark-400 mt-2">
                    <span>目標: {selectedRoute.totalDuration}分</span>
                    <span>{formatDistance(selectedRoute.totalDistance)}</span>
                  </div>
                  <div className="progress-bar mt-4">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(100, (elapsedTime / 60 / selectedRoute.totalDuration) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}
              <Button onClick={endWalk} variant="outline" className="w-full max-w-xs">
                散歩を終了する
              </Button>
            </Card>

            {/* ウェイポイント */}
            {selectedRoute && (
              <Card>
                <h3 className="font-bold text-dark-100 mb-4">ルートガイド</h3>
                <div className="space-y-3">
                  {selectedRoute.waypoints.map((wp, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          wp.type === 'start' ? 'bg-feature-walk text-white' :
                          wp.type === 'destination' ? 'bg-accent text-dark-900' :
                          'bg-dark-600 text-dark-300'
                        }`}>
                          {wp.type === 'start' ? '🚶' :
                           wp.type === 'destination' ? '🎯' :
                           wp.type === 'landmark' ? '📍' : '↗️'}
                        </div>
                        {index < selectedRoute.waypoints.length - 1 && (
                          <div className="w-0.5 h-8 bg-dark-600 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="font-medium text-dark-100">{wp.name}</p>
                        <p className="text-xs text-dark-400">{wp.description}</p>
                        {wp.distanceFromStart > 0 && (
                          <p className="text-xs text-dark-500 mt-1">
                            {formatDistance(wp.distanceFromStart)} / {wp.durationFromStart}分
                          </p>
                        )}
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
              <h3 className="font-bold text-dark-100 mb-4">散歩時間を設定</h3>
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => setWalkTime(Math.max(10, walkTime - 5))}
                  className="w-12 h-12 rounded-full border-2 border-dark-600 hover:border-accent text-xl font-bold text-dark-200 transition-colors"
                >
                  -
                </button>
                <div className="text-center">
                  <span className="text-4xl font-bold gradient-text">{walkTime}</span>
                  <span className="text-lg text-dark-400 ml-1">分</span>
                </div>
                <button
                  onClick={() => setWalkTime(Math.min(60, walkTime + 5))}
                  className="w-12 h-12 rounded-full border-2 border-dark-600 hover:border-accent text-xl font-bold text-dark-200 transition-colors"
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
                        ? 'bg-accent text-dark-900'
                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                    }`}
                  >
                    {time}分
                  </button>
                ))}
              </div>

              {/* 目的地タイプ選択 */}
              <h4 className="font-medium text-dark-300 mb-2 mt-6">目的地</h4>
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
                        ? 'border-accent bg-accent/10'
                        : 'border-dark-600 hover:border-dark-500'
                    }`}
                  >
                    <span className="text-xl">{option.icon}</span>
                    <p className="text-sm font-medium text-dark-200 mt-1">{option.label}</p>
                  </button>
                ))}
              </div>

              <Button
                onClick={generateRoutes}
                loading={loading}
                className="w-full"
                disabled={!location && !locationError}
              >
                ルートを提案してもらう
              </Button>

              {!location && !locationError && (
                <p className="text-xs text-dark-500 text-center mt-2">
                  位置情報を取得中です...
                </p>
              )}
            </Card>

            {/* 提案ルート一覧 */}
            {suggestedRoutes.length > 0 && (
              <div>
                <h3 className="font-bold text-dark-100 mb-3">
                  おすすめルート（{suggestedRoutes.length}件）
                </h3>
                <div className="space-y-4">
                  {suggestedRoutes.map((route, index) => {
                    const difficulty = getDifficultyLabel(route.difficulty);
                    const canStart = hasViewedRoute.has(route.id);

                    return (
                      <Card key={route.id} className={!route.isWithinTime ? 'opacity-75' : ''}>
                        {/* ヘッダー */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {index === 0 && route.isWithinTime && (
                              <span className="bg-accent text-dark-900 text-xs font-bold px-2 py-0.5 rounded-full">
                                おすすめ
                              </span>
                            )}
                            <h4 className="font-bold text-dark-100">{route.name}</h4>
                          </div>
                          <span className={`text-xs ${difficulty.color}`}>
                            {difficulty.text}
                          </span>
                        </div>

                        {/* 説明 */}
                        <p className="text-sm text-dark-400 mb-3">{route.description}</p>

                        {/* 目的地 */}
                        <div className="space-y-2 mb-4">
                          {route.destinations.map((dest) => (
                            <div
                              key={dest.id}
                              className="flex items-center justify-between text-sm bg-dark-700/50 p-2 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <span>{getDestinationIcon(dest.type)}</span>
                                <span className="font-medium text-dark-200">{dest.name}</span>
                                {dest.rating && (
                                  <span className="text-accent text-xs">★{dest.rating}</span>
                                )}
                              </div>
                              <div className="text-dark-500 text-xs">
                                往復 {formatDistance(dest.distance.roundTrip)} / {dest.duration.roundTrip}分
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 合計情報 */}
                        <div className="flex items-center justify-between text-sm border-t border-dark-600 pt-3 mb-3">
                          <div className="text-dark-400">
                            合計: {formatDistance(route.totalDistance)} / {route.totalDuration}分
                          </div>
                          {route.isWithinTime ? (
                            <span className="text-xs bg-feature-health/20 text-feature-health px-2 py-1 rounded-full">
                              {walkTime}分以内
                            </span>
                          ) : (
                            <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
                              時間超過
                            </span>
                          )}
                        </div>

                        {/* 見どころ */}
                        {route.scenery.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {route.scenery.slice(0, 4).map((s, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-dark-700 text-dark-400 rounded-full">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* ボタン */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => openGoogleMaps(route)}
                              className="flex-1"
                            >
                              <svg className="w-4 h-4 mr-1 inline" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                              </svg>
                              ルートを見てみる
                            </Button>
                          </div>
                          <Button
                            onClick={() => startWalk(route)}
                            className="w-full"
                            disabled={!canStart || !route.isWithinTime}
                          >
                            {canStart ? 'このルートで散歩開始' : 'まずルートを確認'}
                          </Button>
                        </div>

                        {!canStart && (
                          <p className="text-xs text-dark-500 text-center mt-2">
                            「ルートを見てみる」でGoogleマップを確認後、散歩を開始できます
                          </p>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 散歩履歴 */}
            {history.length > 0 && suggestedRoutes.length === 0 && (
              <Card>
                <h3 className="font-bold text-dark-100 mb-4">最近の散歩</h3>
                <div className="space-y-3">
                  {history.slice(0, 5).map((walk) => (
                    <div
                      key={walk.id}
                      className="flex items-center justify-between py-2 border-b border-dark-600 last:border-0"
                    >
                      <p className="text-sm font-medium text-dark-200">
                        {formatDate(walk.startedAt)}
                      </p>
                      <div className="text-right text-sm text-dark-400">
                        {walk.durationMin && <span className="mr-3">{walk.durationMin}分</span>}
                        {walk.distanceM && <span>{formatDistance(walk.distanceM)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

      </main>

      {/* ボトムナビゲーション */}
      <nav className="bottom-nav">
        <div className="max-w-4xl mx-auto flex justify-around">
          <Link href="/dashboard" className="bottom-nav-item">
            <span className="text-xl">🏠</span>
            <span>ホーム</span>
          </Link>
          <Link href="/walk" className="bottom-nav-item bottom-nav-item-active">
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
