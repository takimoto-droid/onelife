'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLocation } from '@/contexts/LocationContext';
import { LocationRequired, LocationErrorBanner } from '@/components/LocationRequest';

interface PetPolicy {
  dogAllowed: boolean;
  sizeLimit: 'all' | 'medium' | 'small';
  indoorAllowed: boolean;
  terraceOnly: boolean;
  petMenu: boolean;
  waterBowl: boolean;
}

interface Restaurant {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  distance: number;
  rating: number;
  reviewCount: number;
  priceRange: string;
  petPolicy: PetPolicy;
  features: string[];
  openingHours: string;
  description: string;
  imageUrl?: string;
}

const CATEGORIES = [
  { value: 'すべて', bgColor: 'bg-cream-100' },
  { value: 'カフェ', bgColor: 'bg-pink-100' },
  { value: 'イタリアン', bgColor: 'bg-peach-100' },
  { value: '和食', bgColor: 'bg-mint-100' },
  { value: 'ダイニング', bgColor: 'bg-lavender-100' },
  { value: 'ビアガーデン', bgColor: 'bg-blue-100' },
];

const SEARCH_RADIUS_OPTIONS = [
  { value: 1, label: '1km' },
  { value: 3, label: '3km' },
  { value: 5, label: '5km' },
  { value: 10, label: '10km' },
];

// モックデータ
const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 'r1',
    name: 'Dog Cafe PAWS',
    category: 'カフェ',
    address: '東京都渋谷区神宮前3-4-5',
    phone: '03-1111-2222',
    distance: 450,
    rating: 4.6,
    reviewCount: 234,
    priceRange: '¥1,000〜¥2,000',
    petPolicy: { dogAllowed: true, sizeLimit: 'all', indoorAllowed: true, terraceOnly: false, petMenu: true, waterBowl: true },
    features: ['室内OK', '大型犬OK', 'ペットメニュー'],
    openingHours: '10:00〜20:00',
    description: '愛犬と一緒にくつろげるドッグカフェ。ペット用メニューも充実。',
  },
  {
    id: 'r2',
    name: 'Terrace Italian',
    category: 'イタリアン',
    address: '東京都渋谷区恵比寿2-3-4',
    phone: '03-2222-3333',
    distance: 820,
    rating: 4.3,
    reviewCount: 156,
    priceRange: '¥2,000〜¥4,000',
    petPolicy: { dogAllowed: true, sizeLimit: 'medium', indoorAllowed: false, terraceOnly: true, petMenu: false, waterBowl: true },
    features: ['テラス席', '中型犬まで'],
    openingHours: '11:30〜22:00',
    description: 'テラス席でペット同伴可能なイタリアンレストラン。',
  },
  {
    id: 'r3',
    name: 'わんこ亭',
    category: '和食',
    address: '東京都渋谷区代々木1-2-3',
    phone: '03-3333-4444',
    distance: 1200,
    rating: 4.4,
    reviewCount: 98,
    priceRange: '¥1,500〜¥3,000',
    petPolicy: { dogAllowed: true, sizeLimit: 'small', indoorAllowed: true, terraceOnly: false, petMenu: true, waterBowl: true },
    features: ['室内OK', '小型犬限定', 'ペットメニュー'],
    openingHours: '11:00〜21:00',
    description: '小型犬と一緒に入れる和食店。犬用おやつもあり。',
  },
  {
    id: 'r4',
    name: 'Beer Garden DOG',
    category: 'ビアガーデン',
    address: '東京都渋谷区道玄坂1-2-3',
    phone: '03-4444-5555',
    distance: 2100,
    rating: 4.1,
    reviewCount: 312,
    priceRange: '¥2,000〜¥4,000',
    petPolicy: { dogAllowed: true, sizeLimit: 'all', indoorAllowed: false, terraceOnly: true, petMenu: false, waterBowl: true },
    features: ['屋外席', '大型犬OK'],
    openingHours: '17:00〜23:00（季節限定）',
    description: '愛犬と一緒にビールを楽しめる季節限定ビアガーデン。',
  },
  {
    id: 'r5',
    name: 'Café Bow Wow',
    category: 'カフェ',
    address: '東京都世田谷区三軒茶屋1-2-3',
    phone: '03-5555-6666',
    distance: 3500,
    rating: 4.7,
    reviewCount: 189,
    priceRange: '¥800〜¥1,500',
    petPolicy: { dogAllowed: true, sizeLimit: 'all', indoorAllowed: true, terraceOnly: false, petMenu: true, waterBowl: true },
    features: ['室内OK', '大型犬OK', 'ペットメニュー', 'ドッグラン併設'],
    openingHours: '9:00〜19:00',
    description: 'ドッグラン併設のカフェ。遊んだ後にゆっくりできます。',
  },
];

export default function RestaurantsPage() {
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

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [sizeFilter, setSizeFilter] = useState<'all' | 'medium' | 'small'>('all');
  const [indoorOnly, setIndoorOnly] = useState(false);
  const [searchRadius, setSearchRadius] = useState(3);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const searchRestaurants = useCallback(async (radius: number = searchRadius) => {
    if (!location) return;

    setLoading(true);
    setHasSearched(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    let filtered = MOCK_RESTAURANTS.filter(r => r.distance <= radius * 1000);

    if (selectedCategory !== 'すべて') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    if (sizeFilter !== 'all') {
      filtered = filtered.filter(r => {
        if (sizeFilter === 'medium') {
          return r.petPolicy.sizeLimit === 'all' || r.petPolicy.sizeLimit === 'medium';
        }
        return r.petPolicy.sizeLimit === sizeFilter || r.petPolicy.sizeLimit === 'all' || r.petPolicy.sizeLimit === 'medium';
      });
    }

    if (indoorOnly) {
      filtered = filtered.filter(r => r.petPolicy.indoorAllowed);
    }

    filtered.sort((a, b) => a.distance - b.distance);

    setRestaurants(filtered);
    setLoading(false);
  }, [location, selectedCategory, sizeFilter, indoorOnly, searchRadius]);

  useEffect(() => {
    if (isLocationReady && !hasSearched) {
      searchRestaurants();
    }
  }, [isLocationReady, hasSearched, searchRestaurants]);

  useEffect(() => {
    if (hasSearched) {
      searchRestaurants();
    }
  }, [selectedCategory, sizeFilter, indoorOnly]);

  const handleRadiusChange = (radius: number) => {
    setSearchRadius(radius);
    searchRestaurants(radius);
  };

  const openGoogleMaps = (restaurant: Restaurant) => {
    if (!location) return;

    const origin = `${location.latitude},${location.longitude}`;
    const destination = encodeURIComponent(restaurant.address);
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

  const getSizeLimitLabel = (limit: string) => {
    switch (limit) {
      case 'all': return '大型犬OK';
      case 'medium': return '中型犬まで';
      case 'small': return '小型犬のみ';
      default: return '';
    }
  };

  const getCategoryInfo = (cat: string) => {
    return CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce-soft">🍽️</div>
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
            <span className="text-3xl">🍽️</span>
          </div>
          <h2 className="text-2xl font-bold text-brown-700 mb-2">ペット同伴飲食店</h2>
          <p className="text-brown-400">
            愛犬と一緒に入れるお店
          </p>
        </div>

        {/* 位置情報が必要な場合 */}
        {!isLocationReady && !locationLoading && !locationError && (
          <LocationRequired
            onRequestLocation={requestLocation}
            onManualSelect={setManualLocation}
            loading={locationLoading}
            featureName="ペット同伴飲食店検索"
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
            <div className="flex items-center justify-between mb-4 p-3 bg-peach-50 border border-peach-200 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-peach-500">📍</span>
                <span className="text-sm text-brown-500">現在地から検索</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={searchRadius}
                  onChange={(e) => handleRadiusChange(Number(e.target.value))}
                  className="text-xs bg-white text-brown-600 px-3 py-1.5 rounded-full border border-cream-200"
                >
                  {SEARCH_RADIUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => refreshLocation()}
                  className="text-xs text-accent font-medium hover:underline"
                >
                  更新
                </button>
              </div>
            </div>

            {/* カテゴリフィルター */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                    selectedCategory === cat.value
                      ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-sm'
                      : `${cat.bgColor} text-brown-600 hover:shadow-sm`
                  }`}
                >
                  {cat.value}
                </button>
              ))}
            </div>

            {/* フィルターボタン */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
                  (sizeFilter !== 'all' || indoorOnly)
                    ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-sm'
                    : 'bg-cream-100 text-brown-600'
                }`}
              >
                <span>🔧</span>
                <span>絞り込み</span>
                {(sizeFilter !== 'all' || indoorOnly) && (
                  <span className="bg-white/30 text-xs px-1.5 rounded-full">
                    {(sizeFilter !== 'all' ? 1 : 0) + (indoorOnly ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>

            {/* フィルターパネル */}
            {showFilters && (
              <Card className="mb-4 bg-cream-50 border-cream-200">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-brown-500 mb-2">犬のサイズ</p>
                    <div className="flex gap-2">
                      {[
                        { value: 'all', label: 'すべて' },
                        { value: 'medium', label: '中型犬まで' },
                        { value: 'small', label: '小型犬のみ' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSizeFilter(opt.value as typeof sizeFilter)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            sizeFilter === opt.value
                              ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-sm'
                              : 'bg-white text-brown-600 border border-cream-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-brown-600">室内同伴OKのみ</span>
                    <button
                      onClick={() => setIndoorOnly(!indoorOnly)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        indoorOnly ? 'bg-accent' : 'bg-cream-200'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                        indoorOnly ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                </div>
              </Card>
            )}

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
                {restaurants.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-brown-400">
                      {restaurants.length}件見つかりました
                    </p>
                    {restaurants.map((restaurant) => (
                      <Card
                        key={restaurant.id}
                        className="cursor-pointer hover:shadow-card-hover transition-all bg-white"
                        onClick={() => setSelectedRestaurant(restaurant)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-16 h-16 rounded-2xl ${getCategoryInfo(restaurant.category).bgColor} flex items-center justify-center text-3xl flex-shrink-0 shadow-sm`}>
                            🍽️
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-xs ${getCategoryInfo(restaurant.category).bgColor} text-brown-600 px-2 py-0.5 rounded-full`}>
                                {restaurant.category}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                restaurant.petPolicy.indoorAllowed
                                  ? 'bg-mint-100 text-mint-700'
                                  : 'bg-cream-100 text-brown-400'
                              }`}>
                                {restaurant.petPolicy.indoorAllowed ? '室内OK' : 'テラスのみ'}
                              </span>
                            </div>

                            <h3 className="font-bold text-brown-700 mb-1">{restaurant.name}</h3>
                            <p className="text-sm text-brown-400 mb-2 truncate">{restaurant.address}</p>

                            <div className="flex items-center gap-3 text-sm flex-wrap">
                              <span className="text-accent font-medium">
                                {formatDistance(restaurant.distance)}
                              </span>
                              <span className="text-brown-500">
                                ⭐ {restaurant.rating}
                              </span>
                              <span className="text-brown-400">
                                {restaurant.priceRange}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="text-xs bg-peach-100 text-peach-600 px-2 py-0.5 rounded-full">
                                {getSizeLimitLabel(restaurant.petPolicy.sizeLimit)}
                              </span>
                              {restaurant.petPolicy.petMenu && (
                                <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                                  ペットメニュー
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <span className="text-5xl mb-4 block">🔍</span>
                    <p className="text-brown-500 mb-2">
                      条件に合うお店が見つかりませんでした
                    </p>
                    <p className="text-sm text-brown-400 mb-6">
                      検索範囲を広げるか、条件を変更してください
                    </p>
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
            ※ ペット同伴ルールは店舗により異なります。
            事前に電話でご確認ください。
          </p>
        </div>
      </main>

      {/* 詳細モーダル */}
      {selectedRestaurant && (
        <div
          className="fixed inset-0 bg-brown-900/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedRestaurant(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto shadow-soft-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs ${getCategoryInfo(selectedRestaurant.category).bgColor} text-brown-600 px-2 py-0.5 rounded-full`}>
                      {selectedRestaurant.category}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedRestaurant.petPolicy.indoorAllowed
                        ? 'bg-mint-100 text-mint-700'
                        : 'bg-cream-100 text-brown-400'
                    }`}>
                      {selectedRestaurant.petPolicy.indoorAllowed ? '室内OK' : 'テラスのみ'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-brown-700">{selectedRestaurant.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedRestaurant(null)}
                  className="text-brown-400 hover:text-brown-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-brown-600">
                  <span className="text-xl">📍</span>
                  <span>{selectedRestaurant.address}</span>
                </div>
                <div className="flex items-center gap-3 text-brown-600">
                  <span className="text-xl">🚶</span>
                  <span>{formatDistance(selectedRestaurant.distance)}</span>
                </div>
                <div className="flex items-center gap-3 text-brown-600">
                  <span className="text-xl">⏰</span>
                  <span>{selectedRestaurant.openingHours}</span>
                </div>
                <div className="flex items-center gap-3 text-brown-600">
                  <span className="text-xl">💰</span>
                  <span>{selectedRestaurant.priceRange}</span>
                </div>
                <div className="flex items-center gap-3 text-brown-600">
                  <span className="text-xl">⭐</span>
                  <span>{selectedRestaurant.rating} ({selectedRestaurant.reviewCount}件)</span>
                </div>
              </div>

              <div className="bg-cream-50 rounded-2xl p-4 mb-6">
                <p className="text-brown-600 text-sm">{selectedRestaurant.description}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-brown-500 mb-2">ペット同伴ルール</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm bg-peach-100 text-peach-600 px-3 py-1 rounded-full">
                    {getSizeLimitLabel(selectedRestaurant.petPolicy.sizeLimit)}
                  </span>
                  {selectedRestaurant.petPolicy.indoorAllowed && (
                    <span className="text-sm bg-mint-100 text-mint-700 px-3 py-1 rounded-full">室内OK</span>
                  )}
                  {selectedRestaurant.petPolicy.terraceOnly && (
                    <span className="text-sm bg-cream-100 text-brown-500 px-3 py-1 rounded-full">テラスのみ</span>
                  )}
                  {selectedRestaurant.petPolicy.petMenu && (
                    <span className="text-sm bg-accent/10 text-accent px-3 py-1 rounded-full">ペットメニュー</span>
                  )}
                  {selectedRestaurant.petPolicy.waterBowl && (
                    <span className="text-sm bg-blue-100 text-blue-500 px-3 py-1 rounded-full">水飲み場</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => openGoogleMaps(selectedRestaurant)}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-1 inline" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  地図で見る
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleCall(selectedRestaurant.phone)}
                  className="flex-1"
                >
                  <span className="mr-1">📞</span>
                  電話する
                </Button>
              </div>
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
