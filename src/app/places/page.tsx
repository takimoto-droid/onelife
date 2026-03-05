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

const PLACE_TYPES: { value: PlaceType; label: string; emoji: string; bgColor: string }[] = [
  { value: 'all', label: 'すべて', emoji: '📍', bgColor: 'bg-cream-100' },
  { value: 'vet', label: '動物病院', emoji: '🏥', bgColor: 'bg-mint-100' },
  { value: 'dogrun', label: 'ドッグラン', emoji: '🐕', bgColor: 'bg-blue-100' },
  { value: 'petshop', label: 'ペットショップ', emoji: '🛒', bgColor: 'bg-peach-100' },
  { value: 'trimming', label: 'トリミング', emoji: '✂️', bgColor: 'bg-lavender-100' },
  { value: 'cafe', label: 'ペットカフェ', emoji: '☕', bgColor: 'bg-pink-100' },
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
  const [searchRadius, setSearchRadius] = useState(1);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showRadiusSelector, setShowRadiusSelector] = useState(false);

  const searchPlaces = useCallback(async (radius: number = searchRadius) => {
    if (!location) return;

    setLoading(true);
    setHasSearched(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    let filtered = MOCK_PLACES.filter(p => p.distance <= radius * 1000);

    if (placeType !== 'all') {
      filtered = filtered.filter(p => p.type === placeType);
    }

    filtered.sort((a, b) => a.distance - b.distance);

    setPlaces(filtered);
    setLoading(false);
  }, [location, placeType, searchRadius]);

  useEffect(() => {
    if (isLocationReady && !hasSearched) {
      searchPlaces();
    }
  }, [isLocationReady, hasSearched, searchPlaces]);

  useEffect(() => {
    if (hasSearched) {
      searchPlaces();
    }
  }, [placeType]);

  const handleRadiusChange = (radius: number) => {
    setSearchRadius(radius);
    setShowRadiusSelector(false);
    searchPlaces(radius);
  };

  const openGoogleMaps = (place: Place) => {
    if (!location) return;

    const origin = `${location.latitude},${location.longitude}`;
    const destination = encodeURIComponent(place.address);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
    window.open(url, '_blank');
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getTypeInfo = (type: string) => {
    return PLACE_TYPES.find(t => t.value === type) || PLACE_TYPES[0];
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce-soft">📍</div>
          <div className="spinner mx-auto" />
        </div>
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen pb-24">
      {/* ヘッダー */}
      <header className="header p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <Link href="/dashboard">
              <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
            </Link>
          </div>
          <Link href="/dashboard" className="text-accent font-medium text-sm">
            戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-peach-100 rounded-full mb-3">
            <span className="text-3xl">📍</span>
          </div>
          <h2 className="text-2xl font-bold text-brown-700 mb-2">周辺施設</h2>
          <p className="text-brown-400">
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
            <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 border border-blue-200 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-blue-500">📍</span>
                <span className="text-sm text-brown-500">
                  現在地から検索中
                  {location?.source === 'manual' && '（手動設定）'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRadiusSelector(true)}
                  className="text-xs bg-white text-brown-600 px-3 py-1.5 rounded-full border border-cream-200 shadow-sm"
                >
                  {searchRadius}km圏内
                </button>
                <button
                  onClick={() => refreshLocation()}
                  className="text-xs text-accent font-medium hover:underline"
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
                  className={`flex items-center gap-1 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                    placeType === type.value
                      ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-sm'
                      : `${type.bgColor} text-brown-600 hover:shadow-sm`
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
                <p className="text-brown-400">検索中...</p>
              </div>
            )}

            {/* 検索結果 */}
            {!loading && hasSearched && (
              <>
                {places.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-brown-400">
                      {searchRadius}km圏内に{places.length}件見つかりました
                    </p>
                    {places.map((place) => {
                      const typeInfo = getTypeInfo(place.type);
                      return (
                        <Card
                          key={place.id}
                          className="cursor-pointer hover:shadow-card-hover transition-all bg-white"
                          onClick={() => setSelectedPlace(place)}
                        >
                          <div className="flex items-start gap-4">
                            {/* アイコン */}
                            <div className={`w-12 h-12 rounded-2xl ${typeInfo.bgColor} flex items-center justify-center text-2xl flex-shrink-0 shadow-sm`}>
                              {typeInfo.emoji}
                            </div>

                            {/* 情報 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs ${typeInfo.bgColor} text-brown-600 px-2 py-0.5 rounded-full`}>
                                  {typeInfo.label}
                                </span>
                                {place.openNow !== undefined && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    place.openNow
                                      ? 'bg-mint-100 text-mint-700'
                                      : 'bg-cream-100 text-brown-400'
                                  }`}>
                                    {place.openNow ? '営業中' : '営業時間外'}
                                  </span>
                                )}
                              </div>

                              <h3 className="font-bold text-brown-700 mb-1">{place.name}</h3>
                              <p className="text-sm text-brown-400 mb-2">{place.address}</p>

                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-accent font-medium">
                                  {formatDistance(place.distance)}
                                </span>
                                {place.rating && (
                                  <span className="text-brown-500">
                                    ⭐ {place.rating} ({place.reviewCount})
                                  </span>
                                )}
                              </div>

                              {place.features && place.features.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {place.features.map((f, i) => (
                                    <span key={i} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  /* 結果なし */
                  <div className="text-center py-12">
                    <span className="text-5xl mb-4 block">🔍</span>
                    <p className="text-brown-500 mb-2">
                      近くに施設が見つかりませんでした
                    </p>
                    <p className="text-sm text-brown-400 mb-6">
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
          className="fixed inset-0 bg-brown-900/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowRadiusSelector(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 shadow-soft-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-brown-700 mb-4 text-center">
              検索範囲を選択
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {SEARCH_RADIUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleRadiusChange(option.value)}
                  className={`py-3 rounded-2xl font-medium transition-all ${
                    searchRadius === option.value
                      ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-sm'
                      : 'bg-cream-50 text-brown-600 hover:bg-cream-100'
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
          className="fixed inset-0 bg-brown-900/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedPlace(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto shadow-soft-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* ヘッダー */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl ${getTypeInfo(selectedPlace.type).bgColor} flex items-center justify-center text-2xl shadow-sm`}>
                    {getTypeInfo(selectedPlace.type).emoji}
                  </div>
                  <div>
                    <span className={`text-xs ${getTypeInfo(selectedPlace.type).bgColor} text-brown-600 px-2 py-0.5 rounded-full`}>
                      {getTypeInfo(selectedPlace.type).label}
                    </span>
                    <h3 className="text-lg font-bold text-brown-700 mt-1">
                      {selectedPlace.name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="text-brown-400 hover:text-brown-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* 情報 */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-brown-600">
                  <span className="text-xl">📍</span>
                  <span>{selectedPlace.address}</span>
                </div>
                <div className="flex items-center gap-3 text-brown-600">
                  <span className="text-xl">🚶</span>
                  <span>現在地から{formatDistance(selectedPlace.distance)}</span>
                </div>
                {selectedPlace.rating && (
                  <div className="flex items-center gap-3 text-brown-600">
                    <span className="text-xl">⭐</span>
                    <span>{selectedPlace.rating} ({selectedPlace.reviewCount}件の口コミ)</span>
                  </div>
                )}
                {selectedPlace.phone && (
                  <div className="flex items-center gap-3 text-brown-600">
                    <span className="text-xl">📞</span>
                    <span>{selectedPlace.phone}</span>
                  </div>
                )}
              </div>

              {/* 特徴 */}
              {selectedPlace.features && selectedPlace.features.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-brown-400 mb-2">特徴</p>
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
                <div className="mt-4 pt-4 border-t border-cream-200">
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
