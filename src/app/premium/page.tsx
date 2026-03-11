'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// プレミアム機能一覧
const PREMIUM_FEATURES = [
  {
    icon: '🍽️',
    title: 'フード見直し',
    description: '愛犬に最適なフードをAIが提案',
  },
  {
    icon: '🍳',
    title: 'AIレシピ',
    description: '食材を入力するだけで、愛犬に最適なレシピをAIが作成',
  },
  {
    icon: '📱',
    title: 'SNS投稿文作成',
    description: '愛犬の写真にぴったりの投稿文をAIが生成',
  },
  {
    icon: '🎤',
    title: '鳴き声翻訳',
    description: 'ワンちゃんの鳴き声をAIが翻訳',
  },
  {
    icon: '🐕',
    title: 'ご近所コミュニティ',
    description: '近所のワンちゃん仲間と匿名で交流',
  },
];

type PaymentMethod = 'card' | 'paypay' | null;
type Step = 'features' | 'payment' | 'processing' | 'complete';

// SearchParamsを使用するコンポーネント
function PremiumPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('features');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // カード情報
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');

  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    isPremium: boolean;
    provider: string | null;
    expiresAt: string | null;
    subscriptionStatus: string | null;
    billingStartDate: string | null;
    nextBillingDate: string | null;
  } | null>(null);

  // 決済成功時のリダイレクト処理
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      setStep('complete');
      setLoading(false);
    }
  }, [searchParams]);

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

  // カード番号のフォーマット
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.slice(0, 19);
  };

  // 有効期限のフォーマット
  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  // 決済処理
  const handlePayment = async () => {
    if (!paymentMethod) return;

    setProcessing(true);
    setError('');

    try {
      if (paymentMethod === 'card') {
        // カード情報のバリデーション
        if (cardNumber.replace(/\s/g, '').length < 16) {
          setError('カード番号を正しく入力してください');
          setProcessing(false);
          return;
        }
        if (expiryDate.length < 5) {
          setError('有効期限を正しく入力してください');
          setProcessing(false);
          return;
        }
        if (cvc.length < 3) {
          setError('CVCを正しく入力してください');
          setProcessing(false);
          return;
        }
      }

      // 決済API呼び出し
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          // カード情報は実際のStripe決済ではStripe.jsで処理
        }),
      });

      const data = await res.json();

      if (data.url) {
        // Stripe Checkoutページにリダイレクト
        window.location.href = data.url;
      } else if (data.success) {
        // モックモードでの成功
        setStep('complete');
      } else {
        setError(data.error || '決済に失敗しました');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('決済処理中にエラーが発生しました');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  // 決済完了画面
  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-dark-900 p-4">
        <div className="max-w-md mx-auto pt-12">
          <Card className="text-center py-12">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-2xl font-bold text-dark-50 mb-4">
              プレミアム会員になりました！
            </h1>
            <p className="text-dark-300 mb-8">
              すべてのプレミアム機能をお楽しみください
            </p>

            <div className="space-y-3 mb-8">
              {PREMIUM_FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-left px-4">
                  <span className="text-xl">{feature.icon}</span>
                  <span className="text-dark-200">{feature.title}</span>
                  <span className="ml-auto text-accent">✓</span>
                </div>
              ))}
            </div>

            <Link href="/dashboard">
              <Button className="w-full">
                ダッシュボードへ
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  // 既にプレミアムの場合
  if (subscriptionStatus?.isPremium) {
    return (
      <div className="min-h-screen bg-dark-900 p-4 pb-24">
        <header className="max-w-2xl mx-auto mb-6">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
        </header>

        <div className="max-w-md mx-auto">
          <Card className="text-center mb-6">
            <div className="text-6xl mb-4">👑</div>
            <h2 className="text-2xl font-bold text-dark-50 mb-2">
              プレミアム会員
            </h2>
            <p className="text-dark-400">
              すべてのプレミアム機能をご利用いただけます
            </p>
          </Card>

          <Card className="mb-6">
            <h3 className="font-bold text-dark-100 mb-4">ご利用状況</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-dark-400">プラン</span>
                <span className="font-bold text-accent">Premium</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">課金方法</span>
                <span className="text-dark-200">
                  {subscriptionStatus.provider === 'apple' ? 'App Store' : 'クレジットカード'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-400">ステータス</span>
                <span className="text-green-400">
                  {subscriptionStatus.subscriptionStatus === 'active' ? '有効' :
                   subscriptionStatus.subscriptionStatus === 'trialing' ? '無料トライアル中' :
                   subscriptionStatus.subscriptionStatus}
                </span>
              </div>
              {subscriptionStatus.billingStartDate && (
                <div className="flex justify-between">
                  <span className="text-dark-400">課金開始日</span>
                  <span className="text-dark-200">
                    {new Date(subscriptionStatus.billingStartDate).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              )}
              {subscriptionStatus.nextBillingDate && (
                <div className="flex justify-between">
                  <span className="text-dark-400">次回請求日</span>
                  <span className="text-dark-200">
                    {new Date(subscriptionStatus.nextBillingDate).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card variant="feature" className="mb-6">
            <h3 className="font-bold text-dark-100 mb-4">ご利用中の機能</h3>
            <div className="space-y-3">
              {PREMIUM_FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xl">{feature.icon}</span>
                  <span className="text-dark-200">{feature.title}</span>
                  <span className="ml-auto text-accent">✓</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-3">
            <Link href="/dashboard">
              <Button className="w-full">ダッシュボードに戻る</Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="w-full">
                解約・設定
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 決済方法選択画面
  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-dark-900 p-4 pb-24">
        <header className="max-w-2xl mx-auto mb-6 flex items-center">
          <button onClick={() => setStep('features')} className="text-dark-400 mr-4">
            ← 戻る
          </button>
          <h1 className="text-xl font-bold gradient-text">お支払い</h1>
        </header>

        <div className="max-w-md mx-auto">
          {/* プラン確認 */}
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-dark-100">プレミアムプラン</h3>
                <p className="text-sm text-dark-400">7日間無料トライアル</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-accent">¥680</p>
                <p className="text-xs text-dark-500">/月</p>
              </div>
            </div>
            <div className="text-xs text-dark-500 bg-dark-700/50 rounded-lg p-3">
              <p>• トライアル期間中は無料でお試しいただけます</p>
              <p>• 7日後から月額課金が開始されます</p>
              <p>• いつでも解約可能です</p>
            </div>
          </Card>

          {/* 決済方法選択 */}
          <h2 className="text-lg font-bold text-dark-100 mb-4">決済方法を選択</h2>

          <div className="space-y-3 mb-6">
            {/* クレジットカード */}
            <button
              onClick={() => setPaymentMethod('card')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                paymentMethod === 'card'
                  ? 'border-accent bg-accent/10'
                  : 'border-dark-600 bg-dark-800 hover:border-dark-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">💳</div>
                <div className="flex-1">
                  <p className="font-bold text-dark-100">クレジットカード</p>
                  <p className="text-xs text-dark-400">Visa, Mastercard, JCB, AMEX</p>
                </div>
                {paymentMethod === 'card' && (
                  <span className="text-accent text-xl">✓</span>
                )}
              </div>
            </button>

            {/* PayPay */}
            <button
              onClick={() => setPaymentMethod('paypay')}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                paymentMethod === 'paypay'
                  ? 'border-accent bg-accent/10'
                  : 'border-dark-600 bg-dark-800 hover:border-dark-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  Pay
                </div>
                <div className="flex-1">
                  <p className="font-bold text-dark-100">PayPay</p>
                  <p className="text-xs text-dark-400">PayPayアプリで決済</p>
                </div>
                {paymentMethod === 'paypay' && (
                  <span className="text-accent text-xl">✓</span>
                )}
              </div>
            </button>
          </div>

          {/* カード情報入力フォーム */}
          {paymentMethod === 'card' && (
            <Card className="mb-6">
              <h3 className="font-bold text-dark-100 mb-4">カード情報</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-400 mb-1">カード番号</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent"
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">有効期限</label>
                    <input
                      type="text"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                      placeholder="MM/YY"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-400 mb-1">CVC</label>
                    <input
                      type="text"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-dark-500">
                <span>🔒</span>
                <span>カード情報はSSL暗号化で安全に処理されます</span>
              </div>
            </Card>
          )}

          {/* PayPay説明 */}
          {paymentMethod === 'paypay' && (
            <Card className="mb-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                  Pay
                </div>
                <p className="text-dark-300 text-sm">
                  「決済する」をタップすると<br />
                  PayPayアプリが起動します
                </p>
              </div>
            </Card>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Button
            onClick={handlePayment}
            loading={processing}
            disabled={!paymentMethod || processing}
            className="w-full"
          >
            {processing ? '処理中...' : '決済する（7日間無料）'}
          </Button>

          <p className="text-xs text-dark-500 text-center mt-4">
            「決済する」をタップすることで、
            <Link href="/terms" className="text-accent">利用規約</Link>
            と
            <Link href="/privacy" className="text-accent">プライバシーポリシー</Link>
            に同意したものとみなされます。
          </p>
        </div>
      </div>
    );
  }

  // 機能紹介画面（デフォルト）
  return (
    <div className="min-h-screen bg-dark-900 p-4 pb-24">
      <header className="max-w-2xl mx-auto mb-6 flex items-center justify-between">
        <Link href="/dashboard">
          <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
        </Link>
        <button onClick={() => router.back()} className="text-dark-400 text-sm">
          閉じる
        </button>
      </header>

      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full font-bold mb-4">
            <span>👑</span>
            <span>Premium</span>
          </div>
          <h2 className="text-2xl font-bold text-dark-50 mb-2">
            プレミアムプラン
          </h2>
          <p className="text-dark-400">
            愛犬との生活をもっと豊かに
          </p>
        </div>

        {/* 価格 */}
        <Card variant="premium" className="mb-6 text-center">
          <div className="mb-2">
            <span className="text-4xl font-bold text-dark-50">¥680</span>
            <span className="text-dark-400">/月</span>
          </div>
          <p className="text-accent font-medium mb-2">
            🎁 7日間無料トライアル
          </p>
          <p className="text-xs text-dark-500">
            いつでも解約可能 • 自動更新
          </p>
        </Card>

        {/* 機能一覧 */}
        <Card className="mb-8">
          <h3 className="font-bold text-dark-100 mb-4 flex items-center gap-2">
            <span className="text-accent">✨</span>
            プレミアム機能
          </h3>
          <div className="space-y-4">
            {PREMIUM_FEATURES.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <h4 className="font-medium text-dark-100">{feature.title}</h4>
                  <p className="text-sm text-dark-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* CTAボタン */}
        <div className="space-y-3">
          <Button
            onClick={() => setStep('payment')}
            variant="premium"
            className="w-full py-4 text-lg"
          >
            プレミアムに登録
          </Button>

          <button
            onClick={() => router.back()}
            className="w-full py-3 text-dark-500 font-medium"
          >
            あとで
          </button>
        </div>

        {/* 注意事項 */}
        <div className="mt-8 text-xs text-dark-500 text-center space-y-1">
          <p>• 無料トライアル期間中はいつでも解約可能です</p>
          <p>• トライアル終了後、自動的に課金が開始されます</p>
          <p>• 解約は設定画面から行えます</p>
        </div>
      </div>
    </div>
  );
}

// Suspense境界でラップしたエクスポート
export default function PremiumPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    }>
      <PremiumPageContent />
    </Suspense>
  );
}
