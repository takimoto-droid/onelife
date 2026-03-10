'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// プレミアム機能一覧
const PREMIUM_FEATURES = [
  {
    icon: '🍳',
    title: 'AIドッグフードレシピ',
    description: '食材を入力するだけで、愛犬に最適なレシピをAIが作成',
  },
  {
    icon: '⚖️',
    title: '体重別ごはん量計算',
    description: '体重から1日の必要カロリーと食事量を自動計算',
  },
  {
    icon: '🚫',
    title: 'アレルギー管理',
    description: 'アレルギー食材を登録し、安全なレシピのみ提案',
  },
  {
    icon: '📚',
    title: '保存レシピ無制限',
    description: 'お気に入りのレシピを無制限に保存',
  },
  {
    icon: '💊',
    title: 'AI健康アドバイス',
    description: '愛犬の状態に合わせた健康管理アドバイス',
  },
  {
    icon: '✨',
    title: '広告非表示',
    description: '広告なしで快適にアプリを利用',
  },
];

export default function PremiumPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    isPremium: boolean;
    provider: string | null;
    expiresAt: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (session) {
      fetchSubscriptionStatus();
    }
  }, [session, status, router]);

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await fetch('/api/subscription/status');
      if (res.ok) {
        const data = await res.json();
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // 既にプレミアムの場合
  if (subscriptionStatus?.isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              プレミアム会員です
            </h1>
            <p className="text-gray-600">
              すべてのプレミアム機能をご利用いただけます
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="font-bold text-gray-800 mb-4">ご利用中のプラン</h2>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">プラン</span>
              <span className="font-bold text-orange-500">プレミアム</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">課金方法</span>
              <span className="font-medium">
                {subscriptionStatus.provider === 'apple' ? 'App Store' : 'Stripe'}
              </span>
            </div>
            {subscriptionStatus.expiresAt && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">次回更新日</span>
                <span className="font-medium">
                  {new Date(subscriptionStatus.expiresAt).toLocaleDateString('ja-JP')}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  // 未課金ユーザー向けの購入画面
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white p-6">
      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🐶</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            プレミアムプラン
          </h1>
          <p className="text-gray-600">
            愛犬の健康管理をもっと便利に
          </p>
        </div>

        {/* 機能一覧 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">プレミアム機能</h2>
          <div className="space-y-4">
            {PREMIUM_FEATURES.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <h3 className="font-medium text-gray-800">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 価格 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 text-center">
          <div className="text-3xl font-bold text-gray-800 mb-1">
            月額 ¥680
          </div>
          <p className="text-sm text-gray-500 mb-4">
            7日間無料トライアル付き
          </p>
          <p className="text-xs text-gray-400">
            いつでも解約可能 • 自動更新
          </p>
        </div>

        {/* 購入ボタン */}
        <div className="space-y-3">
          <button
            onClick={() => {
              // iOSアプリからの場合はネイティブ課金
              // Webの場合はStripe課金
              if (typeof window !== 'undefined' && (window as unknown as { webkit?: unknown }).webkit) {
                // iOS WebView → ネイティブに課金リクエスト
                (window as unknown as { webkit: { messageHandlers: { purchase: { postMessage: (msg: string) => void } } } }).webkit.messageHandlers.purchase.postMessage('premium');
              } else {
                // Web → Stripe課金
                router.push('/api/stripe/create-checkout');
              }
            }}
            className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-orange-600 transition-colors"
          >
            プレミアムに登録
          </button>

          <button
            onClick={() => router.back()}
            className="w-full py-3 text-gray-500 font-medium"
          >
            あとで
          </button>
        </div>

        {/* 注意事項 */}
        <div className="mt-8 text-xs text-gray-400 text-center space-y-1">
          <p>• 無料トライアル期間中はいつでも解約可能です</p>
          <p>• トライアル終了後、自動的に課金が開始されます</p>
          <p>• 解約はApp Storeの設定から行えます</p>
        </div>
      </div>
    </div>
  );
}
