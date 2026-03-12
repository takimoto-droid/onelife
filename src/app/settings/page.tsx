'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

interface SubscriptionInfo {
  isPremium: boolean;
  provider: 'apple' | 'stripe' | null;
  subscriptionStatus: string;
  isTrialing: boolean;
  trialEndsAt: string | null;
  billingStartDate: string | null;
  nextBillingDate: string | null;
  isCanceling: boolean;
  canceledAt: string | null;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [message, setMessage] = useState('');
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      fetchSubscriptionStatus();
    }
  }, [status, router]);

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await fetch('/api/subscription/status');
      if (res.ok) {
        const data = await res.json();
        setSubscriptionInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    } finally {
      setFetchingStatus(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage('解約が完了しました。プレミアム機能はご利用いただけなくなりました。');
        setShowCancelConfirm(false);
        // ステータスを再取得
        await fetchSubscriptionStatus();
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

  if (status === 'loading' || fetchingStatus) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isPremium = subscriptionInfo?.isPremium ||
    session.user.subscriptionStatus === 'active' ||
    session.user.subscriptionStatus === 'trialing';

  const isTrialing = subscriptionInfo?.isTrialing || session.user.subscriptionStatus === 'trialing';
  const isCanceling = subscriptionInfo?.isCanceling;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusLabel = () => {
    if (isCanceling) return '解約予約中';
    if (isTrialing) return '無料トライアル中';
    if (subscriptionInfo?.subscriptionStatus === 'active') return '有効';
    if (subscriptionInfo?.subscriptionStatus === 'past_due') return '支払い待ち';
    if (subscriptionInfo?.subscriptionStatus === 'canceled') return '解約済み';
    return '無料プラン';
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
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('失敗') || message.includes('エラー')
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-accent/10 border border-accent/30 text-accent'
          }`}>
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
          </div>
        </Card>

        {/* サブスクリプション情報 */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-dark-100">サブスクリプション</h3>
            {isPremium && (
              <span className="premium-badge">Premium</span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-dark-400">ステータス</span>
              <span className={`font-medium ${
                isPremium ? 'text-green-400' :
                isCanceling ? 'text-yellow-400' :
                'text-dark-300'
              }`}>
                {getStatusLabel()}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-dark-400">プラン</span>
              <span className="text-dark-200">
                {isPremium ? 'プレミアム（月額¥680）' : '無料プラン'}
              </span>
            </div>

            {subscriptionInfo?.provider && (
              <div className="flex justify-between">
                <span className="text-dark-400">決済方法</span>
                <span className="text-dark-200">
                  {subscriptionInfo.provider === 'apple' ? 'App Store' : 'クレジットカード'}
                </span>
              </div>
            )}

            {isTrialing && subscriptionInfo?.trialEndsAt && (
              <div className="flex justify-between">
                <span className="text-dark-400">トライアル終了日</span>
                <span className="text-dark-200">
                  {formatDate(subscriptionInfo.trialEndsAt)}
                </span>
              </div>
            )}

            {subscriptionInfo?.billingStartDate && (
              <div className="flex justify-between">
                <span className="text-dark-400">課金開始日</span>
                <span className="text-dark-200">
                  {formatDate(subscriptionInfo.billingStartDate)}
                </span>
              </div>
            )}

            {subscriptionInfo?.nextBillingDate && !isCanceling && (
              <div className="flex justify-between">
                <span className="text-dark-400">次回請求日</span>
                <span className="text-dark-200">
                  {formatDate(subscriptionInfo.nextBillingDate)}
                </span>
              </div>
            )}

            {isCanceling && subscriptionInfo?.nextBillingDate && (
              <div className="flex justify-between">
                <span className="text-dark-400">利用終了日</span>
                <span className="text-yellow-400">
                  {formatDate(subscriptionInfo.nextBillingDate)}
                </span>
              </div>
            )}
          </div>

          {/* プレミアムへのアップグレード */}
          {!isPremium && (
            <div className="mt-4 pt-4 border-t border-dark-600">
              <Link href="/premium">
                <Button variant="premium" className="w-full">
                  プレミアムにアップグレード
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* プレミアム特典 */}
        {isPremium && (
          <Card variant="premium" className="mb-6">
            <h3 className="font-bold text-dark-100 mb-4 flex items-center gap-2">
              <span className="text-xl">✨</span>
              ご利用中のプレミアム機能
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

        {/* 解約セクション */}
        {isPremium && subscriptionInfo?.subscriptionStatus !== 'canceled' && (
          <Card className="mb-6 border-dark-600">
            <h3 className="font-bold text-dark-100 mb-4">プレミアムプランを解約する</h3>

            {!showCancelConfirm ? (
              <>
                <p className="text-sm text-dark-400 mb-4">
                  解約すると、すぐにプレミアム機能が利用できなくなります。
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-dark-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  解約する
                </Button>
              </>
            ) : (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400 mb-4">
                  本当に解約しますか？
                </p>
                <p className="text-sm text-dark-400 mb-4">
                  解約すると以下の機能が利用できなくなります：
                </p>
                <ul className="text-xs text-dark-500 mb-4 space-y-1">
                  <li>・フード見直し</li>
                  <li>・AIレシピ</li>
                  <li>・SNS投稿文作成</li>
                  <li>・鳴き声翻訳</li>
                  <li>・ご近所コミュニティ</li>
                </ul>
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
