'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

interface GoodsItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  price?: number;
  tags: string[];
  publishedAt: string;
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

  const getCategoryLabel = (cat: string) => {
    const found = categories.find((c) => c.value === cat);
    return found ? found.label : cat;
  };

  const getCategoryEmoji = (cat: string) => {
    const found = categories.find((c) => c.value === cat);
    return found ? found.emoji : '📦';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
          <span className="text-2xl">🎁</span>
          <h2 className="text-2xl font-bold text-primary-900">
            グッズ・ニュース
          </h2>
        </div>

        {/* カテゴリー選択 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-1 px-3 py-2 rounded-full whitespace-nowrap text-sm transition-colors ${
                category === cat.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-warm-300 text-gray-700 hover:border-primary-400'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* グッズリスト */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full" />
          </div>
        ) : goods.length > 0 ? (
          <div className="space-y-4">
            {goods.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <div className="flex gap-4">
                  {/* 画像 */}
                  <div className="w-24 h-24 bg-warm-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-4xl">{getCategoryEmoji(item.category)}</span>
                  </div>
                  {/* 情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-primary-900 line-clamp-2">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            className="text-xs bg-warm-100 text-gray-600 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(item.publishedAt)}
                      </span>
                    </div>
                    {item.price && (
                      <p className="text-primary-600 font-bold mt-2">
                        ¥{item.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-8">
            <span className="text-4xl mb-4 block">📦</span>
            <p className="text-gray-600">
              この条件に合うアイテムが見つかりませんでした
            </p>
          </Card>
        )}

        {/* 注意書き */}
        <div className="disclaimer mt-6">
          <p>
            ※ 掲載されている商品情報は参考情報です。
            価格や在庫は変動する場合があります。
            購入の際は各販売サイトでご確認ください。
          </p>
        </div>
      </main>
    </div>
  );
}
