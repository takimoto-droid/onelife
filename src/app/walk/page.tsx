'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLocation } from '@/contexts/LocationContext';
import { LocationRequired, LocationErrorBanner } from '@/components/LocationRequest';

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

  // 位置情報（コンテキストから取得）
  const {
    location,
    error: locationError,
    loading: locationLoading,
    isLocationReady,
    requestLocation,
    refreshLocation,
    setManualLocation,
    clearError,
  } = useLocation();

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
      // 位置情報を自動取得（キャッシュがなければ）
      if (!isLocationReady) {
        requestLocation();
      }
    }
  }, [session, isLocationReady, requestLocation]);

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
      case 'easy': return { text: 'やさしい', color: 'text-mint-500' };
      case 'normal': return { text: 'ふつう', color: 'text-peach-500' };
      case 'challenging': return { text: 'しっかり', color: 'text-pink-500' };
      default: return { text: '', color: '' };
    }
  };

  // 手動で位置を設定
  const handleManualLocation = (lat: number, lng: number) => {
    setManualLocation(lat, lng);
    clearError();
  };

  // 位置情報がない場合の表示
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  // Googleマップで経路を開く（片道ナビ）
  const openGoogleMaps = (route: WalkRoute) => {
    if (!location) return;

    // 最終目的地を取得（片道ナビなので最後の目的地へ）
    const finalDestination = route.destinations[route.destinations.length - 1];
    if (!finalDestination) return;

    // Google Maps URLを構築（徒歩モード）
    const origin = `${location.latitude},${location.longitude}`;

    // 目的地名で検索
    const destinationQuery = encodeURIComponent(finalDestination.name);

    // 複数の経由地がある場合（コンボルートなど）
    const intermediateStops = route.destinations.slice(0, -1);
    const waypoints = intermediateStops.map(d => encodeURIComponent(d.name)).join('|');

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
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 pb-24">
      {/* ヘッダー */}
      <header className="header p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
          <Link href="/dashboard" className="text-pink-500 text-sm hover:text-pink-600">
            戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-brown-700 mb-2">🚶 散歩ナビ</h2>
          <p className="text-brown-500">
            {dogName ? `${dogName}ちゃんとの散歩ルートを提案` : '散歩ルートを提案'}
          </p>
        </div>

        {/* 位置情報が必要な場合 */}
        {!isLocationReady && !locationLoading && !locationError && (
          <LocationRequired
            onRequestLocation={requestLocation}
            onManualSelect={handleManualLocation}
            loading={locationLoading}
            featureName="散歩ナビ"
          />
        )}

        {/* 位置情報エラー表示 */}
        {locationError && (
          <LocationErrorBanner
            error={locationError}
            onRetry={requestLocation}
            onManualSelect={() => setShowLocationSelector(true)}
            loading={locationLoading}
          />
        )}

        {/* 手動地域選択モーダル */}
        {showLocationSelector && (
          <div className="fixed inset-0 bg-brown-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card variant="warm" className="max-w-sm w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-brown-700">📍 地域を選択</h3>
                <button
                  onClick={() => setShowLocationSelector(false)}
                  className="text-brown-400 hover:text-brown-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {[
                  { name: '渋谷区', lat: 35.6619, lng: 139.7041 },
                  { name: '新宿区', lat: 35.6938, lng: 139.7034 },
                  { name: '港区', lat: 35.6581, lng: 139.7514 },
                  { name: '目黒区', lat: 35.6414, lng: 139.6982 },
                  { name: '世田谷区', lat: 35.6461, lng: 139.6531 },
                  { name: '品川区', lat: 35.6090, lng: 139.7302 },
                  { name: '杉並区', lat: 35.6994, lng: 139.6366 },
                  { name: '中野区', lat: 35.7078, lng: 139.6638 },
                  { name: '練馬区', lat: 35.7355, lng: 139.6517 },
                ].map((area) => (
                  <button
                    key={area.name}
                    onClick={() => {
                      handleManualLocation(area.lat, area.lng);
                      setShowLocationSelector(false);
                    }}
                    className="p-3 text-sm bg-white hover:bg-pink-50 border border-cream-200 hover:border-pink-200 rounded-xl text-brown-600 transition-colors"
                  >
                    {area.name}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* 位置情報取得成功表示 */}
        {isLocationReady && !locationError && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-mint-50 border border-mint-200 rounded-2xl">
            <span className="text-lg">📍</span>
            <span className="text-sm text-brown-600">
              現在地を取得しました
              {location?.source === 'manual' && '（手動設定）'}
              {location?.source === 'ip' && '（おおよその位置）'}
            </span>
            <button
              onClick={refreshLocation}
              className="ml-auto text-xs text-pink-500 hover:text-pink-600 font-medium"
              disabled={locationLoading}
            >
              {locationLoading ? '取得中...' : '🔄 更新'}
            </button>
          </div>
        )}

        {/* 散歩中の表示 */}
        {isWalking ? (
          <div className="space-y-6">
            {/* 地図エリア */}
            <Card variant="warm" className="overflow-hidden p-0">
              <div className="h-48 bg-gradient-to-br from-mint-100 to-pink-100 flex items-center justify-center relative">
                <div className="text-center">
                  <span className="text-5xl">🗺️</span>
                  <p className="text-sm text-brown-400 mt-2">お散歩中...</p>
                </div>
                {selectedRoute && (
                  <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-2xl p-3 shadow-soft">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-brown-500">🎯 目的地</span>
                      <span className="text-pink-600 font-bold">
                        {selectedRoute.destinations[selectedRoute.destinations.length - 1]?.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* タイマー */}
            <Card variant="warm" className="text-center">
              <p className="text-brown-500 mb-2 flex items-center justify-center gap-2">
                <span className="text-xl">🐕</span>
                {dogName}ちゃんとお散歩中
              </p>
              <div className="text-6xl font-bold gradient-text mb-4">
                {formatTime(elapsedTime)}
              </div>
              {selectedRoute && (
                <div className="mb-6">
                  <p className="text-lg font-bold text-brown-700">{selectedRoute.name}</p>
                  <div className="flex justify-center gap-4 text-sm text-brown-400 mt-2">
                    <span>🎯 目標: {selectedRoute.totalDuration}分</span>
                    <span>📏 {formatDistance(selectedRoute.totalDistance)}</span>
                  </div>
                  <div className="mt-4 h-3 bg-cream-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-400 to-peach-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (elapsedTime / 60 / selectedRoute.totalDuration) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}
              <Button onClick={endWalk} variant="outline" className="w-full max-w-xs">
                🏠 散歩を終了する
              </Button>
            </Card>

            {/* ウェイポイント */}
            {selectedRoute && (
              <Card variant="warm">
                <h3 className="font-bold text-brown-700 mb-4">📋 ルートガイド</h3>
                <div className="space-y-3">
                  {selectedRoute.waypoints.map((wp, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-soft ${
                          wp.type === 'start' ? 'bg-mint-100 text-mint-600' :
                          wp.type === 'destination' ? 'bg-pink-100 text-pink-600' :
                          'bg-cream-100 text-brown-500'
                        }`}>
                          {wp.type === 'start' ? '🚶' :
                           wp.type === 'destination' ? '🎯' :
                           wp.type === 'landmark' ? '📍' : '↗️'}
                        </div>
                        {index < selectedRoute.waypoints.length - 1 && (
                          <div className="w-0.5 h-8 bg-cream-200 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="font-medium text-brown-700">{wp.name}</p>
                        <p className="text-xs text-brown-400">{wp.description}</p>
                        {wp.distanceFromStart > 0 && (
                          <p className="text-xs text-brown-300 mt-1">
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
            <Card variant="warm">
              <h3 className="font-bold text-brown-700 mb-4 text-center">⏰ 散歩時間を設定</h3>
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => setWalkTime(Math.max(10, walkTime - 5))}
                  className="w-12 h-12 rounded-full border-2 border-pink-200 hover:border-pink-400 hover:bg-pink-50 text-xl font-bold text-pink-400 transition-colors"
                >
                  -
                </button>
                <div className="text-center">
                  <span className="text-5xl font-bold gradient-text">{walkTime}</span>
                  <span className="text-lg text-brown-400 ml-1">分</span>
                </div>
                <button
                  onClick={() => setWalkTime(Math.min(60, walkTime + 5))}
                  className="w-12 h-12 rounded-full border-2 border-pink-200 hover:border-pink-400 hover:bg-pink-50 text-xl font-bold text-pink-400 transition-colors"
                >
                  +
                </button>
              </div>
              <div className="flex justify-center gap-2 mb-6">
                {[10, 15, 20, 30, 45].map((time) => (
                  <button
                    key={time}
                    onClick={() => setWalkTime(time)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      walkTime === time
                        ? 'bg-gradient-to-r from-pink-400 to-peach-400 text-white shadow-soft'
                        : 'bg-cream-100 text-brown-500 hover:bg-cream-200'
                    }`}
                  >
                    {time}分
                  </button>
                ))}
              </div>

              {/* 目的地タイプ選択 */}
              <h4 className="font-medium text-brown-600 mb-3 mt-6 text-center">🎯 目的地タイプ</h4>
              <div className="flex gap-3 mb-6">
                {[
                  { value: 'any' as WalkPurpose, label: 'おまかせ', icon: '🎲' },
                  { value: 'park' as WalkPurpose, label: '公園', icon: '🌳' },
                  { value: 'shopping' as WalkPurpose, label: '商店街', icon: '🏪' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPurpose(option.value)}
                    className={`flex-1 py-4 rounded-2xl border-2 transition-all ${
                      purpose === option.value
                        ? 'border-pink-300 bg-pink-50 shadow-soft'
                        : 'border-cream-200 bg-white hover:border-pink-200 hover:bg-cream-50'
                    }`}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <p className={`text-sm font-medium mt-1 ${
                      purpose === option.value ? 'text-pink-600' : 'text-brown-500'
                    }`}>{option.label}</p>
                  </button>
                ))}
              </div>

              <Button
                onClick={generateRoutes}
                loading={loading}
                className="w-full"
                disabled={!location && !locationError}
              >
                ✨ ルートを提案してもらう
              </Button>

              {!location && !locationError && (
                <p className="text-xs text-brown-400 text-center mt-2">
                  📍 位置情報を取得中です...
                </p>
              )}
            </Card>

            {/* 提案ルート一覧 */}
            {suggestedRoutes.length > 0 && (
              <div>
                <h3 className="font-bold text-brown-700 mb-3 flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  おすすめルート（{suggestedRoutes.length}件）
                </h3>
                <div className="space-y-4">
                  {suggestedRoutes.map((route, index) => {
                    const difficulty = getDifficultyLabel(route.difficulty);
                    const canStart = hasViewedRoute.has(route.id);

                    return (
                      <Card key={route.id} variant="warm" className={!route.isWithinTime ? 'opacity-75' : ''}>
                        {/* おすすめバッジ */}
                        {index === 0 && route.isWithinTime && (
                          <div className="flex justify-center -mt-2 mb-3">
                            <span className="bg-gradient-to-r from-pink-400 to-peach-400 text-white text-xs font-bold px-4 py-1 rounded-full shadow-soft">
                              🌟 イチオシ！
                            </span>
                          </div>
                        )}

                        {/* ルート名（大きく表示） */}
                        <div className="text-center mb-4">
                          <h4 className="text-xl font-bold text-brown-700 mb-2">
                            {route.name}
                          </h4>
                          <p className="text-sm text-brown-500 leading-relaxed">
                            {route.description}
                          </p>
                        </div>

                        {/* 距離・時間・難易度 */}
                        <div className="flex items-center justify-center gap-4 mb-4 py-3 bg-cream-50 rounded-2xl">
                          <div className="text-center">
                            <p className="text-xs text-brown-400 mb-1">距離</p>
                            <p className="font-bold text-brown-600">{formatDistance(route.totalDistance)}</p>
                          </div>
                          <div className="w-px h-8 bg-cream-200" />
                          <div className="text-center">
                            <p className="text-xs text-brown-400 mb-1">時間</p>
                            <p className="font-bold text-brown-600">{route.totalDuration}分</p>
                          </div>
                          <div className="w-px h-8 bg-cream-200" />
                          <div className="text-center">
                            <p className="text-xs text-brown-400 mb-1">難易度</p>
                            <p className={`font-bold ${difficulty.color}`}>{difficulty.text}</p>
                          </div>
                        </div>

                        {/* 目的地 */}
                        <div className="space-y-2 mb-4">
                          {route.destinations.map((dest) => (
                            <div
                              key={dest.id}
                              className="flex items-center justify-between text-sm bg-white/60 p-3 rounded-xl border border-cream-200"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getDestinationIcon(dest.type)}</span>
                                <div>
                                  <span className="font-medium text-brown-700">{dest.name}</span>
                                  {dest.rating && (
                                    <span className="text-pink-500 text-xs ml-2">★{dest.rating}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-brown-400 text-xs">
                                片道 {formatDistance(dest.distance.oneWay)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 見どころタグ */}
                        {route.scenery.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4 justify-center">
                            {route.scenery.slice(0, 4).map((s, i) => (
                              <span key={i} className="text-xs px-3 py-1 bg-mint-100 text-mint-600 rounded-full">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 時間内かどうか */}
                        <div className="flex justify-center mb-4">
                          {route.isWithinTime ? (
                            <span className="text-xs bg-mint-100 text-mint-600 px-3 py-1 rounded-full">
                              ✓ {walkTime}分以内で往復できます
                            </span>
                          ) : (
                            <span className="text-xs bg-peach-100 text-peach-600 px-3 py-1 rounded-full">
                              ⏰ 少し時間に余裕を持って
                            </span>
                          )}
                        </div>

                        {/* ボタン */}
                        <div className="space-y-2">
                          <Button
                            variant="mint"
                            onClick={() => openGoogleMaps(route)}
                            className="w-full"
                          >
                            <svg className="w-5 h-5 mr-2 inline" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            Googleマップでルートを見る
                          </Button>
                          <Button
                            onClick={() => startWalk(route)}
                            className="w-full"
                            disabled={!canStart || !route.isWithinTime}
                          >
                            {canStart ? '🐾 このルートで散歩スタート！' : 'まずルートを確認してね'}
                          </Button>
                        </div>

                        {!canStart && (
                          <p className="text-xs text-brown-400 text-center mt-2">
                            👆 まずGoogleマップでルートを確認してください
                          </p>
                        )}

                        {/* おすすめポイント */}
                        {route.tips && (
                          <div className="mt-4 pt-3 border-t border-cream-200">
                            <p className="text-xs text-brown-400 flex items-start gap-2">
                              <span className="text-base">💡</span>
                              <span>{route.tips}</span>
                            </p>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 散歩履歴 */}
            {history.length > 0 && suggestedRoutes.length === 0 && (
              <Card variant="warm">
                <h3 className="font-bold text-brown-700 mb-4 flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  最近の散歩
                </h3>
                <div className="space-y-3">
                  {history.slice(0, 5).map((walk) => (
                    <div
                      key={walk.id}
                      className="flex items-center justify-between py-3 px-3 bg-cream-50 rounded-xl"
                    >
                      <p className="text-sm font-medium text-brown-600">
                        {formatDate(walk.startedAt)}
                      </p>
                      <div className="text-right text-sm text-brown-400 flex items-center gap-3">
                        {walk.durationMin && <span>⏱️ {walk.durationMin}分</span>}
                        {walk.distanceM && <span>📏 {formatDistance(walk.distanceM)}</span>}
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-cream-200 safe-area-inset-bottom z-40">
        <div className="max-w-4xl mx-auto flex justify-around py-2">
          <Link href="/dashboard" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1">ホーム</span>
          </Link>
          <Link href="/walk" className="flex flex-col items-center py-2 px-4 text-pink-500">
            <span className="text-xl">🚶</span>
            <span className="text-xs mt-1 font-bold">散歩</span>
          </Link>
          <Link href="/voice" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">🎤</span>
            <span className="text-xs mt-1">翻訳</span>
          </Link>
          <Link href="/family" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">👨‍👩‍👧</span>
            <span className="text-xs mt-1">家族</span>
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
