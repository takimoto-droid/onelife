'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface PetPolicy {
  dogAllowed: boolean;
  catAllowed: boolean;
  sizeLimit: string;
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
}

export default function RestaurantsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [indoorOnly, setIndoorOnly] = useState(false);
  const [sortBy, setSortBy] = useState('distance');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      const fetchRestaurants = async () => {
        try {
          const params = new URLSearchParams({
            category: selectedCategory,
            size: sizeFilter,
            indoor: indoorOnly.toString(),
            sort: sortBy,
          });

          const res = await fetch(`/api/restaurants?${params}`);
          if (res.ok) {
            const data = await res.json();
            setRestaurants(data.restaurants);
            setCategories(data.categories);
          }
        } catch (error) {
          console.error('Failed to fetch restaurants:', error);
        }
        setLoading(false);
      };
      fetchRestaurants();
    }
  }, [status, router, selectedCategory, sizeFilter, indoorOnly, sortBy]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const getSizeLimitLabel = (limit: string) => {
    switch (limit) {
      case 'all': return '大型犬OK';
      case 'medium': return '中型犬まで';
      case 'small': return '小型犬のみ';
      default: return '';
    }
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
          <h2 className="text-2xl font-bold text-dark-50 mb-2">ペット同伴OK</h2>
          <p className="text-dark-400">
            愛犬と一緒に楽しめる飲食店を検索
          </p>
        </div>

        {/* フィルター */}
        <div className="space-y-4 mb-6">
          {/* カテゴリー */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-accent text-dark-900'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              すべて
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-accent text-dark-900'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* フィルターオプション */}
          <div className="flex flex-wrap gap-2">
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="bg-dark-700 border border-dark-600 text-dark-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">すべてのサイズ</option>
              <option value="small">小型犬</option>
              <option value="medium">中型犬</option>
              <option value="large">大型犬</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-dark-700 border border-dark-600 text-dark-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="distance">近い順</option>
              <option value="rating">評価順</option>
              <option value="reviews">レビュー数順</option>
            </select>

            <button
              onClick={() => setIndoorOnly(!indoorOnly)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                indoorOnly
                  ? 'bg-feature-food text-dark-900'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              店内OK
            </button>
          </div>
        </div>

        {/* レストラン一覧 */}
        <div className="space-y-4">
          {restaurants.map((restaurant) => (
            <Card
              key={restaurant.id}
              variant="interactive"
              className="p-4"
              onClick={() => setSelectedRestaurant(restaurant)}
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-dark-700 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                  🍽️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-dark-100 truncate">{restaurant.name}</h3>
                    <span className="text-xs text-dark-400 whitespace-nowrap">
                      {restaurant.distance}m
                    </span>
                  </div>
                  <p className="text-sm text-dark-400">{restaurant.category}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-accent">★ {restaurant.rating}</span>
                    <span className="text-xs text-dark-500">({restaurant.reviewCount}件)</span>
                    <span className="text-xs text-dark-400">{restaurant.priceRange}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      restaurant.petPolicy.indoorAllowed
                        ? 'bg-feature-health/20 text-feature-health'
                        : 'bg-dark-600 text-dark-400'
                    }`}>
                      {restaurant.petPolicy.indoorAllowed ? '店内OK' : 'テラスのみ'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-feature-food/20 text-feature-food">
                      {getSizeLimitLabel(restaurant.petPolicy.sizeLimit)}
                    </span>
                    {restaurant.petPolicy.petMenu && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                        ペットメニュー
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {restaurants.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <p className="empty-state-title">お店が見つかりませんでした</p>
              <p className="empty-state-description">フィルターを変更してみてください</p>
            </div>
          )}
        </div>

        {/* 注意書き */}
        <div className="disclaimer mt-6">
          <p>
            ※ ペット同伴の可否は店舗の方針により変更される場合があります。
            ご来店前に直接お問い合わせください。
          </p>
        </div>
      </main>

      {/* 詳細モーダル */}
      {selectedRestaurant && (
        <div className="modal-backdrop flex items-end sm:items-center justify-center" onClick={() => setSelectedRestaurant(null)}>
          <div className="modal-content max-h-[85vh] overflow-y-auto w-full sm:w-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-dark-100">{selectedRestaurant.name}</h3>
                <p className="text-dark-400">{selectedRestaurant.category}</p>
              </div>
              <button
                onClick={() => setSelectedRestaurant(null)}
                className="text-dark-400 hover:text-dark-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* 評価 */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent">★ {selectedRestaurant.rating}</p>
                  <p className="text-xs text-dark-400">{selectedRestaurant.reviewCount}件</p>
                </div>
                <div>
                  <p className="text-dark-200">{selectedRestaurant.priceRange}</p>
                  <p className="text-sm text-dark-400">{selectedRestaurant.distance}m</p>
                </div>
              </div>

              {/* 説明 */}
              <p className="text-dark-300">{selectedRestaurant.description}</p>

              {/* ペットポリシー */}
              <div className="bg-dark-700/50 rounded-xl p-4">
                <h4 className="font-bold text-dark-100 mb-2">ペット同伴ポリシー</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={selectedRestaurant.petPolicy.indoorAllowed ? 'text-feature-health' : 'text-dark-500'}>
                      {selectedRestaurant.petPolicy.indoorAllowed ? '✓' : '✗'}
                    </span>
                    <span className="text-dark-300">店内OK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={selectedRestaurant.petPolicy.petMenu ? 'text-feature-health' : 'text-dark-500'}>
                      {selectedRestaurant.petPolicy.petMenu ? '✓' : '✗'}
                    </span>
                    <span className="text-dark-300">ペットメニュー</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={selectedRestaurant.petPolicy.waterBowl ? 'text-feature-health' : 'text-dark-500'}>
                      {selectedRestaurant.petPolicy.waterBowl ? '✓' : '✗'}
                    </span>
                    <span className="text-dark-300">水飲み提供</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-accent">●</span>
                    <span className="text-dark-300">{getSizeLimitLabel(selectedRestaurant.petPolicy.sizeLimit)}</span>
                  </div>
                </div>
              </div>

              {/* 特徴 */}
              <div>
                <h4 className="font-bold text-dark-100 mb-2">特徴</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedRestaurant.features.map((feature) => (
                    <span key={feature} className="text-sm px-3 py-1 bg-dark-700 rounded-full text-dark-300">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* 営業情報 */}
              <div className="space-y-2 text-sm">
                <p className="text-dark-400">
                  <span className="inline-block w-20">営業時間:</span>
                  <span className="text-dark-200">{selectedRestaurant.openingHours}</span>
                </p>
                <p className="text-dark-400">
                  <span className="inline-block w-20">住所:</span>
                  <span className="text-dark-200">{selectedRestaurant.address}</span>
                </p>
                <p className="text-dark-400">
                  <span className="inline-block w-20">電話:</span>
                  <span className="text-dark-200">{selectedRestaurant.phone}</span>
                </p>
              </div>

              {/* アクション */}
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1">
                  <a href={`tel:${selectedRestaurant.phone}`} className="flex items-center justify-center gap-2 w-full">
                    📞 電話する
                  </a>
                </Button>
                <Button className="flex-1">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(selectedRestaurant.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full"
                  >
                    📍 地図を見る
                  </a>
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
