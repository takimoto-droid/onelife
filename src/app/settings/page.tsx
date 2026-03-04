'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('解約が完了しました。ご利用ありがとうございました。');
        setShowCancelConfirm(false);
      } else {
        setMessage(data.error || '解約に失敗しました');
      }
    } catch {
      setMessage('エラーが発生しました');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  if (!session) {
    router.push('/');
    return null;
  }

  const isPremium = session.user.subscriptionStatus === 'active';

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
          <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg text-accent">
            {message}
          </div>
        )}

        {/* アカウント情報 */}
        <Card className="mb-6">
          <h3 className="font-bold text-dark-100 mb-4">アカウント情報</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-dark-400">メールアドレス</p>
              <p className="font-medium text-dark-100">{session.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-dark-400">ご利用状況</p>
              <div className="flex items-center gap-2">
                <p className="font-medium text-dark-100">
                  {session.user.subscriptionStatus === 'trialing' && '無料トライアル中'}
                  {session.user.subscriptionStatus === 'active' && '有料プラン（月額500円）'}
                  {session.user.subscriptionStatus === 'canceled' && '解約済み'}
                </p>
                {isPremium && <span className="premium-badge">Premium</span>}
              </div>
            </div>
          </div>
        </Card>

        {/* プレミアム特典 */}
        {isPremium && (
          <Card variant="premium" className="mb-6">
            <h3 className="font-bold text-dark-100 mb-4 flex items-center gap-2">
              <span className="text-xl">✨</span>
              Premiumメンバー特典
            </h3>
            <ul className="space-y-2 text-sm text-dark-300">
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span>
                鳴き声翻訳（無制限）
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span>
                全機能へのフルアクセス
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span>
                優先サポート
              </li>
            </ul>
          </Card>
        )}

        {/* 通知設定 */}
        <Card className="mb-6">
          <h3 className="font-bold text-dark-100 mb-4">通知設定</h3>
          <p className="text-sm text-dark-400 mb-4">
            ワクチンの予定日が近づくとブラウザ通知でお知らせします。
          </p>
          <Button
            variant="outline"
            onClick={() => {
              if ('Notification' in window) {
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

        {/* 解約 */}
        {session.user.subscriptionStatus !== 'canceled' && (
          <Card className="mb-6 border-red-500/30">
            <h3 className="font-bold text-dark-100 mb-4">解約</h3>

            {!showCancelConfirm ? (
              <>
                <p className="text-sm text-dark-400 mb-4">
                  解約すると、すべての機能が使えなくなります。
                  登録されたデータは一定期間保持されます。
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  解約する
                </Button>
              </>
            ) : (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400 mb-4">
                  本当に解約しますか？この操作は取り消せません。
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleCancel}
                    loading={loading}
                    className="bg-red-500 hover:bg-red-600 text-white shadow-none"
                  >
                    解約を確定する
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ログアウト */}
        <Card>
          <Button variant="secondary" onClick={handleLogout} className="w-full">
            ログアウト
          </Button>
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
