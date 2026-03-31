'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDogs } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function Home() {
  const router = useRouter();
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // localStorageからデータを確認
    const dogs = getDogs();

    if (dogs.length > 0) {
      // 犬が登録済み → ダッシュボードへ直接遷移
      setIsReturningUser(true);
    }
    setLoading(false);
  }, []);

  const handleStart = () => {
    router.push('/onboarding');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cream-50 to-pink-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce-soft">🐕</div>
          <div className="spinner mx-auto" />
        </div>
      </div>
    );
  }

  // 無料機能
  const freeFeatures = [
    { icon: '🚶', title: '散歩ナビ', desc: '最適なルートを提案' },
    { icon: '🏥', title: '周辺施設検索', desc: '動物病院・ペットショップ' },
    { icon: '📰', title: '最新ニュース', desc: 'ワンちゃんの情報' },
    { icon: '📸', title: 'SNS投稿', desc: '愛犬の写真を共有' },
    { icon: '🛡️', title: 'AI保険診断', desc: 'おすすめ保険を提案' },
    { icon: '🍽️', title: 'ペット飲食店', desc: '同伴OKのお店を検索' },
  ];

  // プレミアム機能
  const premiumFeatures = [
    { icon: '🍳', title: 'AIレシピ', desc: 'AIがレシピを生成' },
    { icon: '💊', title: '健康アドバイス', desc: 'AIが健康をサポート' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50">
      {/* ヘッダー */}
      <header className="p-4 border-b border-cream-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold gradient-text">わんライフ</h1>
        </div>
      </header>

      {/* ヒーローセクション */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12 slide-up">
          <div className="text-6xl mb-4">🐕</div>
          <h2 className="text-3xl md:text-4xl font-bold text-brown-800 mb-4">
            愛犬との生活を
            <br />
            <span className="gradient-text">もっと豊かに</span>
          </h2>
          <p className="text-lg text-brown-500 max-w-xl mx-auto">
            初めてのワンちゃんとの生活から、長年のパートナーまで。
            わんライフがあなたと愛犬の毎日をサポートします。
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* 特徴 */}
          <div className="space-y-4">
            {/* 無料機能 */}
            <div>
              <h3 className="text-lg font-bold text-brown-700 mb-3 flex items-center gap-2">
                <span className="text-green-500">✓</span> 無料で使える機能
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {freeFeatures.map((feature) => (
                  <Card key={feature.title} variant="feature" className="p-3">
                    <div className="text-xl mb-1">{feature.icon}</div>
                    <h4 className="font-bold text-brown-700 text-sm">{feature.title}</h4>
                    <p className="text-xs text-brown-400">{feature.desc}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* プレミアム機能 */}
            <div>
              <h3 className="text-sm font-bold text-brown-400 mb-2 flex items-center gap-2">
                <span className="premium-badge text-[10px]">Premium</span> プレミアム機能
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {premiumFeatures.map((feature) => (
                  <Card key={feature.title} variant="feature" className="p-3 opacity-80">
                    <div className="text-xl mb-1">{feature.icon}</div>
                    <h4 className="font-bold text-brown-700 text-sm">{feature.title}</h4>
                    <p className="text-xs text-brown-400">{feature.desc}</p>
                  </Card>
                ))}
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-xl mt-4">
              <p className="text-sm text-green-700">
                <span className="font-bold">基本機能はすべて無料！</span>
                <br />
                <span className="text-green-600">プレミアム機能のみ月額680円</span>
              </p>
            </div>
          </div>

          {/* CTAカード */}
          <Card className="border-cream-300 bg-white">
            {isReturningUser ? (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-brown-800 mb-2">
                    おかえりなさい！
                  </h3>
                  <p className="text-brown-500">
                    わんライフへようこそ
                  </p>
                </div>
                <div className="space-y-4">
                  <Button onClick={handleGoToDashboard} className="w-full">
                    ダッシュボードへ
                  </Button>
                  <Button variant="outline" onClick={handleStart} className="w-full">
                    新しく始める
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">🐾</div>
                  <h3 className="text-xl font-bold text-brown-800 mb-2">
                    さあ、はじめましょう
                  </h3>
                  <p className="text-brown-500">
                    愛犬との素敵な毎日をサポートします
                  </p>
                </div>
                <Button onClick={handleStart} className="w-full text-lg py-4">
                  はじめる
                </Button>
                <p className="text-center text-xs text-brown-400 mt-4">
                  登録不要・すぐに使えます
                </p>
              </>
            )}
          </Card>
        </div>

        {/* 注意書き */}
        <div className="disclaimer mt-8 max-w-2xl mx-auto">
          <p>
            ※ わんライフは獣医療の代替ではありません。健康上の問題がある場合は、必ず獣医師にご相談ください。
            提供する情報は一般的なガイダンスであり、個々の状況に応じた専門的なアドバイスではありません。
          </p>
        </div>
      </main>
    </div>
  );
}
