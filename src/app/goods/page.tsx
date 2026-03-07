'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface GoodsItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageLarge?: string;
  category: string;
  price?: number;
  originalPrice?: number;
  tags: string[];
  publishedAt: string;
  amazonUrl?: string;
  rating?: number;
  reviewCount?: number;
  isPrime?: boolean;
}

type CategoryType = 'all' | 'toy' | 'food' | 'care' | 'fashion' | 'outdoor';

// 画像読み込みエラー時のフォールバック
const FALLBACK_IMAGES: Record<string, string> = {
  toy: '🎾',
  food: '🍖',
  care: '🛁',
  fashion: '👕',
  outdoor: '⛺',
  default: '📦',
};

export default function GoodsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [goods, setGoods] = useState<GoodsItem[]>([]);
  const [category, setCategory] = useState<CategoryType>('all');
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchGoods = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/goods?category=${category}`);
        const data = await res.json();
        if (data.goods) {
          setGoods(data.goods);
        }
      } catch (error) {
        console.error('Failed to fetch goods:', error);
      }
      setLoading(false);
    };

    if (session) {
      fetchGoods();
    }
  }, [session, category]);

  const categories: { value: CategoryType; label: string; emoji: string }[] = [
    { value: 'all', label: 'すべて', emoji: '🏠' },
    { value: 'toy', label: 'おもちゃ', emoji: '🎾' },
    { value: 'food', label: 'フード', emoji: '🍖' },
    { value: 'care', label: 'ケア', emoji: '🛁' },
    { value: 'fashion', label: 'ファッション', emoji: '👕' },
    { value: 'outdoor', label: 'アウトドア', emoji: '⛺' },
  ];

  const getCategoryEmoji = (cat: string) => {
    return FALLBACK_IMAGES[cat] || FALLBACK_IMAGES.default;
  };

  const handleImageError = (itemId: string) => {
    setImageErrors(prev => new Set([...prev, itemId]));
  };

  // 商品画像コンポーネント
  const ProductImage = ({ item, size = 'medium' }: { item: GoodsItem; size?: 'small' | 'medium' | 'large' }) => {
    const hasError = imageErrors.has(item.id);
    const sizeClasses = {
      small: 'w-full h-24',
      medium: 'w-24 h-24',
      large: 'w-full h-48',
    };

    if (hasError) {
      return (
        <div className={`${sizeClasses[size]} bg-cream-100 rounded-2xl flex items-center justify-center`}>
          <span className="text-4xl">{getCategoryEmoji(item.category)}</span>
        </div>
      );
    }

    return (
      <div className={`${sizeClasses[size]} relative rounded-2xl overflow-hidden bg-white`}>
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full h-full object-contain"
          onError={() => handleImageError(item.id)}
          loading="lazy"
        />
      </div>
    );
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full" />
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
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-brown-700 mb-2 flex items-center justify-center gap-2">
            <span>🛍️</span>
            おすすめグッズ
          </h2>
          <p className="text-brown-400">
            愛犬にぴったりのアイテムを探そう
          </p>
        </div>

        {/* カテゴリー選択 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-1 px-4 py-2 rounded-full whitespace-nowrap text-sm transition-all ${
                category === cat.value
                  ? 'bg-gradient-to-r from-pink-400 to-peach-400 text-white font-bold shadow-soft'
                  : 'bg-white text-brown-500 border border-cream-200 hover:border-pink-200 hover:bg-pink-50'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* 人気ランキング */}
        {goods.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🔥</span>
              <h3 className="font-bold text-brown-700">今週の人気</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {goods.slice(0, 3).map((item, index) => (
                <a
                  key={item.id}
                  href={item.amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(item.amazonUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="block cursor-pointer"
                >
                  <Card
                    variant="warm"
                    className="p-3 min-w-[160px] flex-shrink-0 hover:shadow-soft-lg transition-shadow"
                  >
                    <div className="relative">
                      {/* ランキングバッジ */}
                      <div className="absolute -top-1 -left-1 w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-peach-400 text-white text-sm font-bold flex items-center justify-center shadow-soft z-10">
                        {index + 1}
                      </div>
                      {/* 商品画像 */}
                      <div className="mb-2">
                        <ProductImage item={item} size="small" />
                      </div>
                      <p className="text-sm font-bold text-brown-700 line-clamp-2">{item.title}</p>
                      {item.price && (
                        <p className="text-pink-500 font-bold mt-1">
                          ¥{item.price.toLocaleString()}
                        </p>
                      )}
                      {item.isPrime && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                          Prime
                        </span>
                      )}
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* グッズリスト */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full" />
          </div>
        ) : goods.length > 0 ? (
          <div className="space-y-4">
            {goods.map((item) => (
              <Card key={item.id} variant="warm" className="p-4">
                <div className="flex gap-4">
                  {/* 商品画像 */}
                  <div className="flex-shrink-0">
                    <ProductImage item={item} size="medium" />
                  </div>

                  {/* 商品情報 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-brown-700 line-clamp-2 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-brown-400 line-clamp-2 mb-2">
                      {item.description}
                    </p>

                    {/* 評価 */}
                    {item.rating && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-yellow-500">★ {item.rating}</span>
                        <span className="text-xs text-brown-400">({item.reviewCount?.toLocaleString()}件)</span>
                        {item.isPrime && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                            Prime
                          </span>
                        )}
                      </div>
                    )}

                    {/* 価格 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.price && (
                        <span className="text-lg font-bold text-pink-600">
                          ¥{item.price.toLocaleString()}
                        </span>
                      )}
                      {item.originalPrice && item.originalPrice > (item.price || 0) && (
                        <>
                          <span className="text-sm text-brown-300 line-through">
                            ¥{item.originalPrice.toLocaleString()}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full font-bold">
                            {Math.round((1 - (item.price || 0) / item.originalPrice) * 100)}%OFF
                          </span>
                        </>
                      )}
                    </div>

                    {/* タグ */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs bg-cream-100 text-brown-500 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Amazonで見るボタン */}
                {item.amazonUrl && (
                  <a
                    href={item.amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(item.amazonUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="block mt-4 w-full py-3 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#FF9900] to-[#FFB84D] text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-soft cursor-pointer"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93s3.05-7.44 7-7.93v15.86zm2-15.86c3.94.49 7 3.85 7 7.93s-3.05 7.44-7 7.93V4.07z"/>
                    </svg>
                    Amazonで見る
                  </a>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card variant="warm" className="text-center py-12">
            <div className="text-5xl mb-4">📦</div>
            <p className="font-bold text-brown-700 mb-2">アイテムが見つかりません</p>
            <p className="text-brown-400 text-sm">
              別のカテゴリーを選択してみてください
            </p>
          </Card>
        )}

        {/* 注意書き */}
        <div className="mt-6 text-center text-xs text-brown-400 bg-cream-50 p-4 rounded-2xl">
          <p className="mb-1">
            ※ 掲載されている商品情報は参考情報です。
          </p>
          <p className="mb-1">
            価格や在庫は変動する場合があります。
          </p>
          <p>
            本ページにはAmazonアソシエイトリンクが含まれています。
          </p>
        </div>
      </main>

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
          <Link href="/goods" className="flex flex-col items-center py-2 px-4 text-pink-500">
            <span className="text-xl">🛍️</span>
            <span className="text-xs mt-1 font-bold">グッズ</span>
          </Link>
          <Link href="/community" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">💬</span>
            <span className="text-xs mt-1">コミュニティ</span>
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
