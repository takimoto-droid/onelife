'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLocation } from '@/contexts/LocationContext';
import { LocationRequired, LocationErrorBanner } from '@/components/LocationRequest';

interface Place {
  id: string;
  name: string;
  address: string;
  phone?: string;
  distance: number;
  rating?: number;
  reviewCount?: number;
  openNow?: boolean;
  type: 'vet' | 'dogrun' | 'petshop' | 'trimming' | 'cafe';
  features?: string[];
}

type PlaceType = 'all' | 'vet' | 'dogrun' | 'petshop' | 'trimming' | 'cafe';

const PLACE_TYPES: { value: PlaceType; label: string; emoji: string }[] = [
  { value: 'all', label: 'すべて', emoji: '📍' },
  { value: 'vet', label: '動物病院', emoji: '🏥' },
  { value: 'dogrun', label: 'ドッグラン', emoji: '🐕' },
  { value: 'petshop', label: 'ペットショップ', emoji: '🛒' },
  { value: 'trimming', label: 'トリミング', emoji: '✂️' },
  { value: 'cafe', label: 'ペットカフェ', emoji: '☕' },
];

const SEARCH_RADIUS_OPTIONS = [
  { value: 1, label: '1km' },
  { value: 3, label: '3km' },
  { value: 5, label: '5km' },
  { value: 10, label: '10km' },
];

// モック施設データ
const MOCK_PLACES: Place[] = [
  { id: 'p1', name: '代々木動物病院', address: '東京都渋谷区代々木1-2-3', phone: '03-1234-5678', distance: 350, rating: 4.5, reviewCount: 128, openNow: true, type: 'vet' },
  { id: 'p2', name: '渋谷ペットクリニック', address: '東京都渋谷区神南1-4-5', phone: '03-2345-6789', distance: 850, rating: 4.8, reviewCount: 256, openNow: true, type: 'vet' },
  { id: 'p3', name: '代々木公園ドッグラン', address: '東京都渋谷区代々木神園町', distance: 500, rating: 4.2, reviewCount: 89, openNow: true, type: 'dogrun', features: ['大型犬OK', '水飲み場'] },
  { id: 'p4', name: '駒沢ドッグラン', address: '東京都世田谷区駒沢公園1-1', distance: 2100, rating: 4.6, reviewCount: 312, openNow: true, type: 'dogrun', features: ['大型犬OK', '小型犬エリア'] },
  { id: 'p5', name: 'ペットショップ渋谷', address: '東京都渋谷区道玄坂2-3-4', distance: 720, rating: 4.0, reviewCount: 45, openNow: true, type: 'petshop' },
  { id: 'p6', name: 'わんわんトリミング', address: '東京都渋谷区恵比寿1-2-3', distance: 1200, rating: 4.7, reviewCount: 178, openNow: false, type: 'trimming' },
  { id: 'p7', name: 'ドッグカフェ PAWS', address: '東京都渋谷区神宮前3-4-5', distance: 980, rating: 4.4, reviewCount: 203, openNow: true, type: 'cafe', features: ['室内OK', '大型犬OK'] },
  { id: 'p8', name: 'さくら動物病院', address: '東京都渋谷区恵比寿2-3-4', phone: '03-3456-7890', distance: 1500, rating: 4.2, reviewCount: 89, openNow: true, type: 'vet' },
  { id: 'p9', name: '目黒ドッグパーク', address: '東京都目黒区中目黒1-2-3', distance: 3200, rating: 4.5, reviewCount: 156, openNow: true, type: 'dogrun' },
  { id: 'p10', name: 'ペットサロン HAPPY', address: '東京都渋谷区広尾1-2-3', distance: 4500, rating: 4.8, reviewCount: 234, openNow: true, type: 'trimming' },
];

export default function PlacesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 位置情報（コンテキストから取得）
  const {
    location,
    loading: locationLoading,
    error: locationError,
    isLocationReady,
    requestLocation,
    refreshLocation,
    setManualLocation,
  } = useLocation();

  const [placeType, setPlaceType] = useState<PlaceType>('all');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchRadius, setSearchRadius] = useState(1); // km
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showRadiusSelector, setShowRadiusSelector] = useState(false);

  // 施設検索
  const searchPlaces = useCallback(async (radius: number = searchRadius) => {
    if (!location) return;

    setLoading(true);
    setHasSearched(true);

    // モックデータをフィルタリング（実際はAPIを呼び出す）
    await new Promise(resolve => setTimeout(resolve, 500)); // シミュレーション

    let filtered = MOCK_PLACES.filter(p => p.distance <= radius * 1000);

    if (placeType !== 'all') {
      filtered = filtered.filter(p => p.type === placeType);
    }

    // 距離でソート
    filtered.sort((a, b) => a.distance - b.distance);

    setPlaces(filtered);
    setLoading(false);
  }, [location, placeType, searchRadius]);

  // 位置情報取得後に自動検索
  useEffect(() => {
    if (isLocationReady && !hasSearched) {
      searchPlaces();
    }
  }, [isLocationReady, hasSearched, searchPlaces]);

  // フィルター変更時に再検索
  useEffect(() => {
    if (hasSearched) {
      searchPlaces();
    }
  }, [placeType]);

  // 検索範囲を変更
  const handleRadiusChange = (radius: number) => {
    setSearchRadius(radius);
    setShowRadiusSelector(false);
    searchPlaces(radius);
  };

  // Googleマップで経路を開く
  const openGoogleMaps = (place: Place) => {
    if (!location) return;

    const origin = `${location.latitude},${location.longitude}`;
    const destination = encodeURIComponent(place.address);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
    window.open(url, '_blank');
  };

  // 電話発信
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // 距離表示
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // タイプのアイコン
  const getTypeIcon = (type: string) => {
    const found = PLACE_TYPES.find(t => t.value === type);
    return found?.emoji || '📍';
  };

  // タイプのラベル
  const getTypeLabel = (type: string) => {
    const found = PLACE_TYPES.find(t => t.value === type);
    return found?.label || '';
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
          <h2 className="text-2xl font-bold text-dark-50 mb-2">📍 周辺施設</h2>
          <p className="text-dark-400">
            近くの動物病院・ドッグラン・ペットショップ
          </p>
        </div>

        {/* 位置情報が必要な場合 */}
        {!isLocationReady && !locationLoading && !locationError && (
          <LocationRequired
            onRequestLocation={requestLocation}
            onManualSelect={setManualLocation}
            loading={locationLoading}
            featureName="周辺施設検索"
          />
        )}

        {/* 位置情報エラー */}
        {locationError && (
          <LocationErrorBanner
            error={locationError}
            onRetry={requestLocation}
            onManualSelect={() => setManualLocation(35.6581, 139.7017)}
            loading={locationLoading}
          />
        )}

        {/* 位置情報取得成功 */}
        {isLocationReady && (
          <>
            {/* 現在地表示 */}
            <div className="flex items-center justify-between mb-4 p-3 bg-feature-walk/10 border border-feature-walk/30 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-feature-walk">📍</span>
                <span className="text-sm text-dark-300">
                  現在地から検索中
                  {location?.source === 'manual' && '（手動設定）'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRadiusSelector(true)}
                  className="text-xs bg-dark-700 text-dark-300 px-2 py-1 rounded-full"
                >
                  {searchRadius}km圏内
                </button>
                <button
                  onClick={() => refreshLocation()}
                  className="text-xs text-accent hover:underline"
                  disabled={locationLoading}
                >
                  更新
                </button>
              </div>
            </div>

            {/* カテゴリフィルター */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
              {PLACE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setPlaceType(type.value)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                    placeType === type.value
                      ? 'bg-accent text-dark-900'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  }`}
                >
                  <span>{type.emoji}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>

            {/* ローディング */}
            {loading && (
              <div className="text-center py-12">
                <div className="spinner mx-auto mb-4" />
                <p className="text-dark-400">検索中...</p>
              </div>
            )}

            {/* 検索結果 */}
            {!loading && hasSearched && (
              <>
                {places.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-dark-400">
                      {searchRadius}km圏内に{places.length}件見つかりました
                    </p>
                    {places.map((place) => (
                      <Card
                        key={place.id}
                        className="cursor-pointer hover:ring-1 hover:ring-accent/50 transition-all"
                        onClick={() => setSelectedPlace(place)}
                      >
                        <div className="flex items-start gap-4">
                          {/* アイコン */}
                          <div className="w-12 h-12 rounded-xl bg-dark-600 flex items-center justify-center text-2xl flex-shrink-0">
                            {getTypeIcon(place.type)}
                          </div>

                          {/* 情報 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs bg-dark-600 text-dark-300 px-2 py-0.5 rounded">
                                {getTypeLabel(place.type)}
                              </span>
                              {place.openNow !== undefined && (
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  place.openNow
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-dark-600 text-dark-400'
                                }`}>
                                  {place.openNow ? '営業中' : '営業時間外'}
                                </span>
                              )}
                            </div>

                            <h3 className="font-bold text-dark-100 mb-1">{place.name}</h3>
                            <p className="text-sm text-dark-400 mb-2">{place.address}</p>

                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-accent font-medium">
                                {formatDistance(place.distance)}
                              </span>
                              {place.rating && (
                                <span className="text-dark-300">
                                  ⭐ {place.rating} ({place.reviewCount})
                                </span>
                              )}
                            </div>

                            {place.features && place.features.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {place.features.map((f, i) => (
                                  <span key={i} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  /* 結果なし */
                  <div className="text-center py-12">
                    <span className="text-4xl mb-4 block">🔍</span>
                    <p className="text-dark-300 mb-2">
                      近くに施設が見つかりませんでした
                    </p>
                    <p className="text-sm text-dark-500 mb-6">
                      検索範囲を広げてお試しください
                    </p>

                    {/* 範囲拡張ボタン */}
                    <div className="flex flex-wrap justify-center gap-2">
                      {SEARCH_RADIUS_OPTIONS.filter(r => r.value > searchRadius).map((option) => (
                        <Button
                          key={option.value}
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRadiusChange(option.value)}
                        >
                          {option.label}に広げる
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* 注意書き */}
        <div className="disclaimer mt-8">
          <p>
            ※ 施設情報は変更される場合があります。
            営業時間・定休日は事前にご確認ください。
          </p>
        </div>
      </main>

      {/* 検索範囲選択モーダル */}
      {showRadiusSelector && (
        <div
          className="fixed inset-0 bg-dark-900/90 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowRadiusSelector(false)}
        >
          <div
            className="bg-dark-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-dark-100 mb-4 text-center">
              検索範囲を選択
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {SEARCH_RADIUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleRadiusChange(option.value)}
                  className={`py-3 rounded-xl font-medium transition-colors ${
                    searchRadius === option.value
                      ? 'bg-accent text-dark-900'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 施設詳細モーダル */}
      {selectedPlace && (
        <div
          className="fixed inset-0 bg-dark-900/90 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedPlace(null)}
        >
          <div
            className="bg-dark-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* ヘッダー */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-dark-600 flex items-center justify-center text-2xl">
                    {getTypeIcon(selectedPlace.type)}
                  </div>
                  <div>
                    <span className="text-xs bg-dark-600 text-dark-300 px-2 py-0.5 rounded">
                      {getTypeLabel(selectedPlace.type)}
                    </span>
                    <h3 className="text-lg font-bold text-dark-100 mt-1">
                      {selectedPlace.name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="text-dark-400 hover:text-dark-200 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* 情報 */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-dark-200">
                  <span className="text-xl">📍</span>
                  <span>{selectedPlace.address}</span>
                </div>
                <div className="flex items-center gap-3 text-dark-200">
                  <span className="text-xl">🚶</span>
                  <span>現在地から{formatDistance(selectedPlace.distance)}</span>
                </div>
                {selectedPlace.rating && (
                  <div className="flex items-center gap-3 text-dark-200">
                    <span className="text-xl">⭐</span>
                    <span>{selectedPlace.rating} ({selectedPlace.reviewCount}件の口コミ)</span>
                  </div>
                )}
                {selectedPlace.phone && (
                  <div className="flex items-center gap-3 text-dark-200">
                    <span className="text-xl">📞</span>
                    <span>{selectedPlace.phone}</span>
                  </div>
                )}
              </div>

              {/* 特徴 */}
              {selectedPlace.features && selectedPlace.features.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-dark-400 mb-2">特徴</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlace.features.map((f, i) => (
                      <span key={i} className="text-sm bg-accent/10 text-accent px-3 py-1 rounded-full">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex gap-3">
                <Button
                  onClick={() => openGoogleMaps(selectedPlace)}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-1 inline" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  地図で見る
                </Button>
                {selectedPlace.phone && (
                  <Button
                    variant="secondary"
                    onClick={() => handleCall(selectedPlace.phone!)}
                    className="flex-1"
                  >
                    <span className="mr-1">📞</span>
                    電話する
                  </Button>
                )}
              </div>

              {/* かかりつけ登録（動物病院の場合） */}
              {selectedPlace.type === 'vet' && (
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <Link href="/vet">
                    <Button variant="outline" className="w-full">
                      🏥 かかりつけ病院として登録
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
