'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface GoodsItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
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

export default function GoodsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [goods, setGoods] = useState<GoodsItem[]>([]);
  const [category, setCategory] = useState<CategoryType>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoods = async () => {
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
    const found = categories.find((c) => c.value === cat);
    return found ? found.emoji : '📦';
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
          <h2 className="text-2xl font-bold text-dark-50 mb-2">おすすめグッズ</h2>
          <p className="text-dark-400">
            愛犬にぴったりのアイテムを探そう
          </p>
        </div>

        {/* カテゴリー選択 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-1 px-4 py-2 rounded-full whitespace-nowrap text-sm transition-colors ${
                category === cat.value
                  ? 'bg-accent text-dark-900 font-bold'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* 人気ランキング */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔥</span>
            <h3 className="font-bold text-dark-100">今週の人気</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {goods.slice(0, 3).map((item, index) => (
              <Card
                key={item.id}
                variant="feature"
                className="p-3 min-w-[140px] flex-shrink-0"
              >
                <div className="relative">
                  <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-accent text-dark-900 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <div className="w-full h-24 bg-dark-700 rounded-lg flex items-center justify-center text-3xl mb-2">
                    {getCategoryEmoji(item.category)}
                  </div>
                  <p className="text-sm font-bold text-dark-100 line-clamp-2">{item.title}</p>
                  {item.price && (
                    <p className="text-accent font-bold mt-1">
                      ¥{item.price.toLocaleString()}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* グッズリスト */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : goods.length > 0 ? (
          <div className="space-y-4">
            {goods.map((item) => (
              <Card key={item.id} variant="interactive" className="p-4">
                <div className="flex gap-4">
                  {/* 画像 */}
                  <div className="w-24 h-24 bg-dark-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-4xl">{getCategoryEmoji(item.category)}</span>
                  </div>
                  {/* 情報 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-dark-100 line-clamp-2 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-dark-400 line-clamp-2 mb-2">
                      {item.description}
                    </p>

                    {/* 評価 */}
                    {item.rating && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-accent">★ {item.rating}</span>
                        <span className="text-xs text-dark-500">({item.reviewCount}件)</span>
                        {item.isPrime && (
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                            Prime
                          </span>
                        )}
                      </div>
                    )}

                    {/* 価格 */}
                    <div className="flex items-center gap-2">
                      {item.price && (
                        <span className="text-lg font-bold text-accent">
                          ¥{item.price.toLocaleString()}
                        </span>
                      )}
                      {item.originalPrice && item.originalPrice > (item.price || 0) && (
                        <>
                          <span className="text-sm text-dark-500 line-through">
                            ¥{item.originalPrice.toLocaleString()}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-feature-goods/20 text-feature-goods rounded">
                            {Math.round((1 - (item.price || 0) / item.originalPrice) * 100)}%OFF
                          </span>
                        </>
                      )}
                    </div>

                    {/* タグ */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs bg-dark-700 text-dark-400 px-2 py-0.5 rounded-full"
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
                    className="block mt-4"
                  >
                    <Button variant="secondary" className="w-full bg-[#FF9900]/20 text-[#FF9900] border-[#FF9900]/30 hover:bg-[#FF9900]/30">
                      Amazonで見る
                    </Button>
                  </a>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p className="empty-state-title">アイテムが見つかりません</p>
            <p className="empty-state-description">
              別のカテゴリーを選択してみてください
            </p>
          </div>
        )}

        {/* 注意書き */}
        <div className="disclaimer mt-6">
          <p>
            ※ 掲載されている商品情報は参考情報です。
            価格や在庫は変動する場合があります。
            本ページにはアフィリエイトリンクが含まれています。
          </p>
        </div>
      </main>

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
