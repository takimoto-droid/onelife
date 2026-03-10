'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        setError(data.error || data.details || '登録に失敗しました');
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
        setError('ログインに失敗しました。もう一度お試しください。');
        setLoading(false);
        return;
      }

      // オンボーディングへ（課金なし）
      router.push('/onboarding');
    } catch (err) {
      console.error('Registration error:', err);
      setError('通信エラーが発生しました。しばらくしてからお試しください。');
      setLoading(false);
    }
  };

  return (
    <Card>
      {canceled && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          登録がキャンセルされました。もう一度お試しください。
        </div>
      )}

      <h2 className="text-xl font-bold text-dark-50 mb-2 text-center">
        無料で新規登録
      </h2>
      <p className="text-sm text-dark-400 text-center mb-6">
        基本機能はすべて無料で利用できます
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
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* 無料機能の説明 */}
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-sm">
          <p className="font-medium text-green-400 mb-2">無料で使える機能</p>
          <ul className="space-y-1 text-dark-300">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              散歩ナビ・周辺施設検索
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              イベント情報・SNS投稿
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              犬種診断・ペット同伴店検索
            </li>
          </ul>
        </div>

        <div className="p-3 bg-dark-700/50 border border-dark-600 rounded-lg text-xs text-dark-400">
          <p>
            ※ AIレシピ・健康アドバイスなどのプレミアム機能は月額680円でご利用いただけます。
            プレミアム機能を使用するときのみ課金が発生します。
          </p>
        </div>

        <Button type="submit" loading={loading} className="w-full">
          無料で登録する
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-dark-400">
        すでにアカウントをお持ちの方は
        <Link href="/" className="text-accent font-medium ml-1">
          ログイン
        </Link>
      </p>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold gradient-text">わんサポ</h1>
          </Link>
        </div>

        <Suspense fallback={
          <Card>
            <div className="text-center py-8">
              <div className="spinner mx-auto mb-4" />
              <p className="text-dark-300">読み込み中...</p>
            </div>
          </Card>
        }>
          <RegisterForm />
        </Suspense>

        {/* 注意書き */}
        <div className="disclaimer mt-6">
          <p>
            登録することで、利用規約およびプライバシーポリシーに同意したものとみなされます。
            基本機能は無料でご利用いただけます。プレミアム機能をご利用の場合のみ課金が発生します。
          </p>
        </div>
      </div>
    </div>
  );
}
