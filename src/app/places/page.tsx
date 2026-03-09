'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// ================================================
// 周辺施設検索ページ
// ================================================
//
// 【処理フロー】
// 1. スマホのGPSで現在地取得（latitude, longitude）
// 2. 検索範囲を選択（500m〜10km）
// 3. APIに座標と範囲を送信
// 4. Haversine公式で距離計算
// 5. 距離が近い順に表示
// 6. Google Mapリンクで経路案内
// ================================================

interface Place {
  id: string;
  name: string;
  address: string;
  distance: number;
  distanceText: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  openNow?: boolean;
  type: 'vet' | 'dogrun' | 'petshop' | 'trimming' | 'cafe' | 'walkspot';
  features?: string[];
  hours?: string;
  mapUrl: string;
}

type PlaceType = 'all' | 'vet' | 'dogrun' | 'petshop' | 'trimming' | 'cafe' | 'walkspot';

// 施設タイプ定義
const PLACE_TYPES: { value: PlaceType; label: string; emoji: string; bgColor: string }[] = [
  { value: 'all', label: 'すべて', emoji: '📍', bgColor: 'bg-cream-100' },
  { value: 'vet', label: '動物病院', emoji: '🏥', bgColor: 'bg-mint-100' },
  { value: 'dogrun', label: 'ドッグラン', emoji: '🐕', bgColor: 'bg-blue-100' },
  { value: 'cafe', label: 'ドッグカフェ', emoji: '☕', bgColor: 'bg-pink-100' },
  { value: 'petshop', label: 'ペットショップ', emoji: '🛒', bgColor: 'bg-peach-100' },
  { value: 'trimming', label: 'トリミング', emoji: '✂️', bgColor: 'bg-lavender-100' },
  { value: 'walkspot', label: '散歩スポット', emoji: '🌳', bgColor: 'bg-mint-100' },
];

// 検索範囲オプション
const RADIUS_OPTIONS = [
  { value: 500, label: '500m' },
  { value: 1000, label: '1km' },
  { value: 3000, label: '3km' },
  { value: 5000, label: '5km' },
  { value: 10000, label: '10km' },
];

export default function PlacesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 位置情報
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 検索条件
  const [placeType, setPlaceType] = useState<PlaceType>('all');
  const [searchRadius, setSearchRadius] = useState(1000); // デフォルト1km

  // 検索結果
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [dataSource, setDataSource] = useState<'google' | 'mock' | null>(null);

  // UI状態
  const [showRadiusSelector, setShowRadiusSelector] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // ================================================
  // GPS位置情報を取得（高精度モード - 複数回試行）
  // ================================================
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('お使いのブラウザは位置情報に対応していません');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);
    setHasSearched(false);
    setLocationAccuracy(null);

    // watchPositionで継続的に位置情報を取得（精度が向上する）
    let bestAccuracy = Infinity;
    let bestLocation: { latitude: number; longitude: number } | null = null;
    let attempts = 0;
    const maxAttempts = 5;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        attempts++;
        console.log(`[GPS] 試行${attempts}: ${latitude}, ${longitude} (精度: ${accuracy}m)`);

        // より精度の高い位置情報を保持
        if (accuracy < bestAccuracy) {
          bestAccuracy = accuracy;
          bestLocation = { latitude, longitude };
          setLocationAccuracy(accuracy);
        }

        // 十分な精度が得られたか、最大試行回数に達したら確定
        if (accuracy < 100 || attempts >= maxAttempts) {
          navigator.geolocation.clearWatch(watchId);
          if (bestLocation) {
            console.log(`[GPS] 確定: ${bestLocation.latitude}, ${bestLocation.longitude} (精度: ${bestAccuracy}m)`);
            setLocation(bestLocation);
          }
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error('[GPS] エラー:', error);
        navigator.geolocation.clearWatch(watchId);
        let message = '位置情報を取得できませんでした';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = '位置情報の使用が許可されていません。\n\niPhone: 設定 → Safari → 位置情報 → 許可\nAndroid: 設定 → アプリ → ブラウザ → 位置情報';
            break;
          case error.POSITION_UNAVAILABLE:
            message = '位置情報を取得できませんでした。GPSをオンにしてください。';
            break;
          case error.TIMEOUT:
            message = '位置情報の取得がタイムアウトしました。再度お試しください。';
            break;
        }
        setLocationError(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,  // 高精度モード（GPSを優先）
        timeout: 20000,            // タイムアウト20秒
        maximumAge: 0,             // キャッシュを使用しない
      }
    );

    // 安全策：20秒後に強制終了
    setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      if (bestLocation) {
        setLocation(bestLocation);
      } else if (!location) {
        setLocationError('位置情報の取得がタイムアウトしました。屋外で再度お試しください。');
      }
      setLocationLoading(false);
    }, 20000);
  }, [location]);

  // ページ読み込み時に位置情報を取得
  useEffect(() => {
    if (session && !location && !locationLoading && !locationError) {
      requestLocation();
    }
  }, [session, location, locationLoading, locationError, requestLocation]);

  // ================================================
  // 周辺施設を検索
  // ================================================
  const searchPlaces = useCallback(async (radius: number = searchRadius) => {
    if (!location) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        lat: location.latitude.toString(),
        lng: location.longitude.toString(),
        radius: radius.toString(),
        type: placeType,
      });

      const res = await fetch(`/api/places/nearby?${params}`);
      const data = await res.json();

      if (data.places) {
        setPlaces(data.places);
        setDataSource(data.source || 'mock');
      }
    } catch (error) {
      console.error('検索エラー:', error);
    }

    setLoading(false);
  }, [location, placeType, searchRadius]);

  // 位置情報取得後に自動検索
  useEffect(() => {
    if (location && !hasSearched) {
      searchPlaces();
    }
  }, [location, hasSearched, searchPlaces]);

  // カテゴリ変更時に再検索
  useEffect(() => {
    if (location && hasSearched) {
      searchPlaces();
    }
  }, [placeType]);

  // 範囲変更
  const handleRadiusChange = (radius: number) => {
    setSearchRadius(radius);
    setShowRadiusSelector(false);
    searchPlaces(radius);
  };

  // Google Mapを開く
  const openGoogleMaps = (place: Place) => {
    window.open(place.mapUrl, '_blank');
  };

  // 電話をかける
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // タイプ情報を取得
  const getTypeInfo = (type: string) => {
    return PLACE_TYPES.find(t => t.value === type) || PLACE_TYPES[0];
  };

  // ローディング
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce-soft">📍</div>
          <div className="animate-spin w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full mx-auto" />
        </div>
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
      <header className="bg-white/80 backdrop-blur-md border-b border-cream-200 p-4 sticky top-0 z-10">
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
        {/* タイトル */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-peach-100 rounded-full mb-3">
            <span className="text-3xl">📍</span>
          </div>
          <h2 className="text-2xl font-bold text-brown-700 mb-2">周辺施設</h2>
          <p className="text-brown-400">
            近くのドッグカフェ・動物病院・ドッグラン
          </p>
        </div>

        {/* 位置情報が必要な場合 */}
        {!location && !locationLoading && !locationError && (
          <Card variant="warm" className="p-6 text-center mb-6">
            <div className="text-5xl mb-4">📍</div>
            <h3 className="font-bold text-brown-700 mb-2">位置情報が必要です</h3>
            <p className="text-sm text-brown-400 mb-4">
              周辺施設を検索するには、現在地の取得が必要です
            </p>
            <Button onClick={requestLocation} loading={locationLoading}>
              現在地を取得
            </Button>
          </Card>
        )}

        {/* 位置情報取得中 */}
        {locationLoading && (
          <Card variant="warm" className="p-6 text-center mb-6">
            <div className="animate-spin w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full mx-auto mb-4" />
            <p className="text-brown-500">現在地を取得中...</p>
          </Card>
        )}

        {/* 位置情報エラー */}
        {locationError && (
          <Card variant="warm" className="p-6 mb-6 border-2 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-bold text-brown-700 mb-1">位置情報エラー</h3>
                <p className="text-sm text-brown-500 mb-3">{locationError}</p>
                <Button onClick={requestLocation} size="sm">
                  再試行
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* 位置情報取得成功 */}
        {location && (
          <>
            {/* 現在地表示 */}
            <div className="mb-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-blue-500 animate-pulse">📍</span>
                  <span className="text-sm font-bold text-brown-600">
                    現在地から検索中
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRadiusSelector(true)}
                    className="text-xs bg-white text-brown-600 px-3 py-1.5 rounded-full border border-cream-200 shadow-sm font-medium"
                  >
                    {RADIUS_OPTIONS.find(r => r.value === searchRadius)?.label || '1km'}圏内
                  </button>
                  <button
                    onClick={requestLocation}
                    className="text-xs text-pink-500 font-medium hover:underline"
                    disabled={locationLoading}
                  >
                    更新
                  </button>
                </div>
              </div>

              {/* 精度警告（精度が500m以上の場合） */}
              {locationAccuracy && locationAccuracy > 500 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <p className="text-sm font-bold text-yellow-800">位置情報の精度が低い可能性があります</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        精度: 約{Math.round(locationAccuracy)}m<br />
                        より正確な結果のため、以下をお試しください：
                      </p>
                      <ul className="text-xs text-yellow-700 mt-1 ml-3 list-disc">
                        <li>屋外に出て再度「更新」をタップ</li>
                        <li>スマートフォンのGPSをオンに</li>
                        <li>WiFiをオンにする（精度向上）</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* カテゴリフィルター */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
              {PLACE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setPlaceType(type.value)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                    placeType === type.value
                      ? 'bg-gradient-to-r from-pink-400 to-peach-400 text-white shadow-soft'
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
                <div className="animate-spin w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full mx-auto mb-4" />
                <p className="text-brown-400">検索中...</p>
              </div>
            )}

            {/* 検索結果 */}
            {!loading && hasSearched && (
              <>
                {/* モックデータ使用時の警告 */}
                {dataSource === 'mock' && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">⚠️</span>
                      <div>
                        <p className="text-sm font-bold text-yellow-800">デモデータを表示中</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          本番環境ではGoogle Places APIで実際の施設を表示します。
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {places.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-brown-400">
                      {RADIUS_OPTIONS.find(r => r.value === searchRadius)?.label}圏内に
                      <span className="font-bold text-pink-500 mx-1">{places.length}件</span>
                      見つかりました
                    </p>
                    {places.map((place) => {
                      const typeInfo = getTypeInfo(place.type);
                      return (
                        <Card
                          key={place.id}
                          variant="warm"
                          className="cursor-pointer hover:shadow-soft-lg transition-all"
                          onClick={() => setSelectedPlace(place)}
                        >
                          <div className="flex items-start gap-4">
                            {/* アイコン */}
                            <div className={`w-14 h-14 rounded-2xl ${typeInfo.bgColor} flex items-center justify-center text-2xl flex-shrink-0 shadow-sm`}>
                              {typeInfo.emoji}
                            </div>

                            {/* 情報 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                              <p className="text-sm text-brown-400 mb-2 truncate">{place.address}</p>

                              <div className="flex items-center gap-3 text-sm">
                                {/* 距離（重要なのでハイライト） */}
                                <span className="text-pink-500 font-bold text-base">
                                  {place.distanceText}
                                </span>
                                {place.rating && (
                                  <span className="text-brown-500">
                                    ⭐ {place.rating} ({place.reviewCount})
                                  </span>
                                )}
                              </div>

                              {place.features && place.features.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {place.features.slice(0, 3).map((f, i) => (
                                    <span key={i} className="text-xs bg-pink-50 text-pink-500 px-2 py-0.5 rounded-full">
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
                  <Card variant="warm" className="text-center py-12">
                    <span className="text-5xl mb-4 block">🔍</span>
                    <p className="text-brown-500 mb-2 font-bold">
                      近くに施設が見つかりませんでした
                    </p>
                    <p className="text-sm text-brown-400 mb-6">
                      検索範囲を広げてお試しください
                    </p>

                    {/* 範囲拡張ボタン */}
                    <div className="flex flex-wrap justify-center gap-2">
                      {RADIUS_OPTIONS.filter(r => r.value > searchRadius).map((option) => (
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
                  </Card>
                )}
              </>
            )}
          </>
        )}

        {/* 注意書き */}
        <div className="mt-8 p-4 bg-cream-50 rounded-2xl text-center">
          <p className="text-xs text-brown-400">
            ※ 施設情報は変更される場合があります。<br />
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
              {RADIUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleRadiusChange(option.value)}
                  className={`py-3 rounded-2xl font-medium transition-all ${
                    searchRadius === option.value
                      ? 'bg-gradient-to-r from-pink-400 to-peach-400 text-white shadow-soft'
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
                <div className="flex items-center gap-3">
                  <span className="text-xl">🚶</span>
                  <span className="text-pink-500 font-bold text-lg">
                    現在地から {selectedPlace.distanceText}
                  </span>
                </div>
                {selectedPlace.hours && (
                  <div className="flex items-center gap-3 text-brown-600">
                    <span className="text-xl">🕐</span>
                    <span>{selectedPlace.hours}</span>
                  </div>
                )}
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
                      <span key={i} className="text-sm bg-pink-50 text-pink-500 px-3 py-1 rounded-full">
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
                  🗺️ マップで開く
                </Button>
                {selectedPlace.phone && (
                  <Button
                    variant="secondary"
                    onClick={() => handleCall(selectedPlace.phone!)}
                    className="flex-1"
                  >
                    📞 電話する
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-cream-200 safe-area-inset-bottom z-40">
        <div className="max-w-4xl mx-auto flex justify-around py-2">
          <Link href="/dashboard" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1">ホーム</span>
          </Link>
          <Link href="/walk" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">🚶</span>
            <span className="text-xs mt-1">散歩</span>
          </Link>
          <Link href="/places" className="flex flex-col items-center py-2 px-4 text-pink-500">
            <span className="text-xl">📍</span>
            <span className="text-xs mt-1 font-bold">周辺</span>
          </Link>
          <Link href="/goods" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">🛍️</span>
            <span className="text-xs mt-1">グッズ</span>
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
