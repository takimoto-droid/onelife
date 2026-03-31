'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { clearAllData, getUser } from '@/lib/store';

export default function SettingsPage() {
  const router = useRouter();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [message, setMessage] = useState('');

  const user = getUser();
  const isPremium = user.isPremium;

  const handleReset = () => {
    clearAllData();
    setMessage('データをリセットしました');
    setTimeout(() => {
      router.push('/onboarding');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* ヘッダー */}
      <header className="header p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
          <Link href="/dashboard" className="text-accent text-sm">
            ダッシュボードに戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-8">
        <h2 className="text-2xl font-bold text-dark-50 mb-6">設定</h2>

        {message && (
          <div className="mb-6 p-4 rounded-lg bg-accent/10 border border-accent/30 text-accent">
            {message}
          </div>
        )}

        {/* デモモード情報 */}
        <Card className="mb-6">
          <h3 className="font-bold text-dark-100 mb-4">アプリ情報</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-dark-400">モード</p>
              <p className="font-medium text-dark-100">デモモード（ログイン不要）</p>
            </div>
            <div>
              <p className="text-sm text-dark-400">データ保存先</p>
              <p className="font-medium text-dark-100">このデバイスのみ（localStorage）</p>
            </div>
          </div>
        </Card>

        {/* プレミアム情報 */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-dark-100">機能</h3>
            {isPremium && (
              <span className="premium-badge">Premium</span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-dark-400">ステータス</span>
              <span className="font-medium text-green-400">
                デモモード - 全機能利用可能
              </span>
            </div>
          </div>
        </Card>

        {/* プレミアム特典 */}
        <Card variant="premium" className="mb-6">
          <h3 className="font-bold text-dark-100 mb-4 flex items-center gap-2">
            <span className="text-xl">✨</span>
            利用可能な機能
          </h3>
          <ul className="space-y-2 text-sm text-dark-300">
            <li className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              フード見直し
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              AIレシピ
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              SNS投稿文作成
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              鳴き声翻訳
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              ご近所コミュニティ
            </li>
          </ul>
        </Card>

        {/* 通知設定 */}
        <Card className="mb-6">
          <h3 className="font-bold text-dark-100 mb-4">通知設定</h3>
          <p className="text-sm text-dark-400 mb-4">
            ワクチンの予定日が近づくとブラウザ通知でお知らせします。
          </p>
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window !== 'undefined' && 'Notification' in window) {
                Notification.requestPermission().then((permission) => {
                  if (permission === 'granted') {
                    setMessage('通知が有効になりました');
                  }
                });
              }
            }}
          >
            通知を有効にする
          </Button>
        </Card>

        {/* データリセット */}
        <Card className="mb-6 border-dark-600">
          <h3 className="font-bold text-dark-100 mb-4">データをリセット</h3>

          {!showResetConfirm ? (
            <>
              <p className="text-sm text-dark-400 mb-4">
                すべてのデータを削除して、最初からやり直します。
              </p>
              <Button
                variant="ghost"
                onClick={() => setShowResetConfirm(true)}
                className="text-dark-400 hover:text-red-400 hover:bg-red-500/10"
              >
                データをリセット
              </Button>
            </>
          ) : (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400 mb-4">
                本当にリセットしますか？
              </p>
              <p className="text-sm text-dark-400 mb-4">
                以下のデータがすべて削除されます：
              </p>
              <ul className="text-xs text-dark-500 mb-4 space-y-1">
                <li>・登録した犬の情報</li>
                <li>・ワクチンスケジュール</li>
                <li>・散歩履歴</li>
                <li>・その他すべての設定</li>
              </ul>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowResetConfirm(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleReset}
                  className="bg-red-500 hover:bg-red-600 text-white shadow-none"
                >
                  リセットする
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* 注意書き */}
        <div className="disclaimer mt-6">
          <p>
            ※ わんライフは獣医療の代替ではありません。健康上の問題がある場合は、必ず獣医師にご相談ください。
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
          <Link href="/settings" className="bottom-nav-item bottom-nav-item-active">
            <span className="text-xl">⚙️</span>
            <span>設定</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
