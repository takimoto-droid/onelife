'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

// ================================================
// おすすめグッズページ
// ================================================
//
// 【機能】
// - Amazon商品を表示
// - カテゴリーフィルター
// - 商品タップでAmazonページへ遷移
//
// 【データソース】
// - /api/goods から取得
// - Amazonの実際の商品URL使用
// ================================================

interface GoodsItem {
  id: string;
  asin: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  price?: number;
  originalPrice?: number;
  tags: string[];
  amazonUrl: string;  // 必須: Amazon商品ページURL
  rating?: number;
  reviewCount?: number;
  isPrime?: boolean;
}

type CategoryType = 'all' | 'toy' | 'food' | 'care' | 'fashion' | 'outdoor';

// 画像エラー時のフォールバック絵文字
const CATEGORY_EMOJI: Record<string, string> = {
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
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // 商品データ取得
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
        showToast('error', '商品データの取得に失敗しました');
      }
      setLoading(false);
    };

    if (session) {
      fetchGoods();
    }
  }, [session, category]);

  // トースト表示
  const showToast = (type: 'error' | 'success', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // カテゴリー定義
  const categories: { value: CategoryType; label: string; emoji: string }[] = [
    { value: 'all', label: 'すべて', emoji: '🏠' },
    { value: 'toy', label: 'おもちゃ', emoji: '🎾' },
    { value: 'food', label: 'フード', emoji: '🍖' },
    { value: 'care', label: 'ケア', emoji: '🛁' },
    { value: 'fashion', label: 'ファッション', emoji: '👕' },
    { value: 'outdoor', label: 'アウトドア', emoji: '⛺' },
  ];

  // カテゴリー絵文字取得
  const getCategoryEmoji = (cat: string) => {
    return CATEGORY_EMOJI[cat] || CATEGORY_EMOJI.default;
  };

  // 画像エラーハンドリング
  const handleImageError = (itemId: string) => {
    setImageErrors(prev => new Set([...prev, itemId]));
  };

  // ================================================
  // Amazon外部リンクを新しいタブで開く
  // ================================================
  //
  // 【処理フロー】
  // 1. URLの存在確認
  // 2. URLフォーマット検証
  // 3. 新しいタブで開く（アンカー要素を動的生成）
  // 4. エラー時はトースト表示
  //
  // 【対応環境】
  // - デスクトップブラウザ: 新しいタブで開く
  // - モバイルSafari/Chrome: 新しいタブで開く
  // - PWA: 外部ブラウザで開く
  // ================================================
  const openAmazonLink = useCallback((amazonUrl: string | undefined, productTitle: string) => {
    console.log('[Amazon Link] Opening in new tab:', amazonUrl);

    // URL存在確認
    if (!amazonUrl) {
      console.error('[Amazon Link] URL is empty');
      showToast('error', '商品ページを開けませんでした');
      return;
    }

    // URLフォーマット検証
    if (!amazonUrl.includes('amazon.co.jp') && !amazonUrl.includes('amazon.com')) {
      console.error('[Amazon Link] Invalid Amazon URL:', amazonUrl);
      showToast('error', '商品ページを開けませんでした');
      return;
    }

    try {
      // 新しいタブで開く方法:
      // アンカー要素を動的に作成してクリック（ポップアップブロッカー回避）
      const link = document.createElement('a');
      link.href = amazonUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('[Amazon Link] Failed to open:', error);
      showToast('error', '商品ページを開けませんでした');
    }
  }, []);

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

  // ローディング
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full" />
      </div>
    );
  }

  // 未ログイン
  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 pb-24">
      {/* トースト通知 */}
      {toast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className={`px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}>
            <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

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
        {/* ページタイトル */}
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
              <h3 className="font-bold text-brown-700">人気商品</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {goods.slice(0, 3).map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => openAmazonLink(item.amazonUrl, item.title)}
                  className="cursor-pointer active:scale-95 transition-transform touch-manipulation"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && openAmazonLink(item.amazonUrl, item.title)}
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
                </div>
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
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-cream-100 text-brown-500 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Amazonで見るボタン */}
                <button
                  type="button"
                  onClick={() => openAmazonLink(item.amazonUrl, item.title)}
                  className="mt-4 w-full py-3 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#FF9900] to-[#FFB84D] text-white hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-soft touch-manipulation"
                >
                  {/* Amazonロゴ風アイコン */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.488.126.112.188.032.382-.192.49-.224.11-.6.282-1.134.524-.596.27-1.273.548-2.035.83-1.754.64-3.576.96-5.47.96-2.127 0-4.186-.353-6.177-1.06-1.98-.706-3.776-1.755-5.384-3.15-.11-.09-.135-.2-.07-.34z"/>
                    <path d="M6.065 14.203c-.196-.31-.147-.618.148-.92l.098-.107c.142-.135.278-.256.407-.364.262-.22.584-.446.966-.68.96-.582 2.026-.873 3.197-.873 1.463 0 2.644.463 3.542 1.388.77.79 1.155 1.765 1.155 2.924 0 .29-.028.583-.084.878-.108.554-.358 1.12-.754 1.702-.396.58-.91 1.052-1.54 1.414-.63.36-1.318.542-2.066.542-.64 0-1.222-.137-1.747-.41-.524-.273-.91-.65-1.155-1.134l-.073-.172c-.05-.136-.08-.308-.086-.516v-3.672c-.002-.144-.046-.233-.132-.266-.086-.034-.19-.02-.31.04l-.13.063c-.15.074-.278.163-.382.267-.21.21-.316.46-.316.753 0 .082.01.167.032.256.02.09.037.147.05.172.058.11.13.21.217.302l.106.107c.05.05.11.114.178.192.07.078.12.155.15.23.06.152.03.3-.088.44z"/>
                  </svg>
                  <span>Amazonで見る</span>
                  {/* 外部リンクアイコン */}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
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
            ※ 商品情報はAmazon.co.jpより取得しています
          </p>
          <p className="mb-1">
            価格や在庫状況は変動する場合があります
          </p>
          <p>
            本ページにはAmazonアソシエイトリンクが含まれています
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
