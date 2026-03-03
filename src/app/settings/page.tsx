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

  return (
    <div className="min-h-screen bg-warm-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-warm-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold text-primary-600">わんサポ</h1>
          </Link>
          <Link href="/dashboard" className="text-primary-600 text-sm">
            ダッシュボードに戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-8">
        <h2 className="text-2xl font-bold text-primary-900 mb-6">設定</h2>

        {message && (
          <div className="mb-6 p-4 bg-primary-50 rounded-lg text-primary-800">
            {message}
          </div>
        )}

        {/* アカウント情報 */}
        <Card className="mb-6">
          <h3 className="font-bold text-primary-900 mb-4">アカウント情報</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">メールアドレス</p>
              <p className="font-medium">{session.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ご利用状況</p>
              <p className="font-medium">
                {session.user.subscriptionStatus === 'trialing' && '無料トライアル中'}
                {session.user.subscriptionStatus === 'active' && '有料プラン（月額500円）'}
                {session.user.subscriptionStatus === 'canceled' && '解約済み'}
              </p>
            </div>
          </div>
        </Card>

        {/* 通知設定 */}
        <Card className="mb-6">
          <h3 className="font-bold text-primary-900 mb-4">通知設定</h3>
          <p className="text-sm text-gray-600 mb-4">
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
          <Card className="mb-6 border-red-100">
            <h3 className="font-bold text-primary-900 mb-4">解約</h3>

            {!showCancelConfirm ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  解約すると、すべての機能が使えなくなります。
                  登録されたデータは一定期間保持されます。
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowCancelConfirm(true)}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  解約する
                </Button>
              </>
            ) : (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800 mb-4">
                  本当に解約しますか？この操作は取り消せません。
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleCancel}
                    loading={loading}
                    className="bg-red-500 hover:bg-red-600"
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
            ※ わんサポは獣医療の代替ではありません。健康上の問題がある場合は、必ず獣医師にご相談ください。
          </p>
        </div>
      </main>
    </div>
  );
}
