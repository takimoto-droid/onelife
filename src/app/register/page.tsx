'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'payment'>('form');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '登録に失敗しました');
        setLoading(false);
        return;
      }

      // ログイン
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('ログインに失敗しました');
        setLoading(false);
        return;
      }

      // Stripeチェックアウトへ（モックの場合は直接リダイレクト）
      setStep('payment');

      const checkoutRes = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
      });

      const checkoutData = await checkoutRes.json();

      if (checkoutData.url) {
        // モックモードの場合はmock=trueがURLに含まれる
        if (checkoutData.url.includes('mock=true')) {
          router.push('/onboarding');
        } else {
          window.location.href = checkoutData.url;
        }
      } else {
        setError('決済ページへの移動に失敗しました');
        setLoading(false);
      }
    } catch {
      setError('エラーが発生しました');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold gradient-text">わんライフ</h1>
          </Link>
        </div>

        <Card>
          {canceled && (
            <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent">
              決済がキャンセルされました。もう一度お試しください。
            </div>
          )}

          {step === 'form' ? (
            <>
              <h2 className="text-xl font-bold text-dark-50 mb-2 text-center">
                新規登録
              </h2>
              <p className="text-sm text-dark-400 text-center mb-6">
                初月無料でお試しいただけます
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <Input
                  type="email"
                  label="メールアドレス"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Input
                  type="password"
                  label="パスワード"
                  placeholder="6文字以上"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <Input
                  type="password"
                  label="パスワード（確認）"
                  placeholder="もう一度入力"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                {error && (
                  <p className="text-sm text-red-400 text-center">{error}</p>
                )}

                <div className="p-4 bg-dark-700/50 border border-dark-600 rounded-lg text-sm text-dark-300">
                  <p className="font-medium text-dark-100 mb-2">ご利用料金</p>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2">
                      <span className="text-accent">✓</span>
                      初月無料トライアル
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-accent">✓</span>
                      その後 月額500円（税込）
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-accent">✓</span>
                      いつでも解約可能
                    </li>
                  </ul>
                </div>

                <Button type="submit" loading={loading} className="w-full">
                  登録して無料で始める
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-dark-400">
                すでにアカウントをお持ちの方は
                <Link href="/" className="text-accent font-medium ml-1">
                  ログイン
                </Link>
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="spinner mx-auto mb-4" />
              <p className="text-dark-300">決済ページへ移動中...</p>
            </div>
          )}
        </Card>

        {/* 注意書き */}
        <div className="disclaimer mt-6">
          <p>
            登録することで、利用規約およびプライバシーポリシーに同意したものとみなされます。
            初月無料トライアル終了後、自動的に月額課金が開始されます。
            課金開始前にキャンセルすれば料金は発生しません。
          </p>
        </div>
      </div>
    </div>
  );
}
