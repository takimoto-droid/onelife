'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (status === 'authenticated' && session?.user?.id) {
        try {
          const res = await fetch('/api/dogs');
          if (res.ok) {
            const data = await res.json();
            if (data.dogs && data.dogs.length > 0) {
              setIsLoggedIn(true);
            }
          } else if (res.status === 401) {
            await signOut({ redirect: false });
          }
        } catch {
          // エラー時は何もしない
        }
      }
      setCheckingSession(false);
    };

    if (status !== 'loading') {
      checkUser();
    }
  }, [status, session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('メールアドレスまたはパスワードが正しくありません');
    } else {
      router.push('/onboarding');
    }
  };

  if (status === 'loading' || checkingSession) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const features = [
    { icon: '🎤', title: '鳴き声翻訳', desc: 'AIが愛犬の気持ちを翻訳', premium: true },
    { icon: '🏥', title: '健康管理', desc: 'ワクチン・保険をサポート', premium: false },
    { icon: '🚶', title: '散歩ナビ', desc: '最適なルートを提案', premium: false },
    { icon: '🍽️', title: 'ペット飲食店', desc: '同伴OKのお店を検索', premium: false },
    { icon: '👨‍👩‍👧', title: '家族共有', desc: 'お世話情報をシェア', premium: false },
    { icon: '📊', title: '犬種分布', desc: '全国の犬種ランキング', premium: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* ヘッダー */}
      <header className="p-4 border-b border-dark-600">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold gradient-text">わんライフ</h1>
        </div>
      </header>

      {/* ヒーローセクション */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12 slide-up">
          <div className="text-6xl mb-4">🐕</div>
          <h2 className="text-3xl md:text-4xl font-bold text-dark-50 mb-4">
            愛犬との生活を
            <br />
            <span className="gradient-text">もっと豊かに</span>
          </h2>
          <p className="text-lg text-dark-300 max-w-xl mx-auto">
            初めてのワンちゃんとの生活から、長年のパートナーまで。
            わんライフがあなたと愛犬の毎日をサポートします。
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* 特徴 */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-dark-100 mb-4">主な機能</h3>
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature) => (
                <Card key={feature.title} variant="feature" className="p-4">
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-dark-100 text-sm">{feature.title}</h4>
                    {feature.premium && (
                      <span className="premium-badge text-[10px]">Premium</span>
                    )}
                  </div>
                  <p className="text-xs text-dark-400">{feature.desc}</p>
                </Card>
              ))}
            </div>

            <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl mt-6">
              <p className="text-sm text-accent">
                <span className="font-bold">初月無料</span>でお試しいただけます。
                <br />
                月額500円（税込）ですべての機能が使い放題
              </p>
            </div>
          </div>

          {/* ログインフォーム */}
          <Card className="border-dark-500">
            {isLoggedIn ? (
              <>
                <h3 className="text-xl font-bold text-dark-50 mb-6 text-center">
                  おかえりなさい！
                </h3>
                <p className="text-dark-300 text-center mb-6">
                  {session?.user?.email} でログイン中
                </p>
                <div className="space-y-4">
                  <Link href="/dashboard">
                    <Button className="w-full">
                      ダッシュボードへ
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => signOut({ redirect: false }).then(() => {
                      setIsLoggedIn(false);
                    })}
                  >
                    ログアウト
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-dark-50 mb-6 text-center">
                  ログイン
                </h3>

                <form onSubmit={handleLogin} className="space-y-4">
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

                  {error && (
                    <p className="text-sm text-red-400 text-center">{error}</p>
                  )}

                  <Button type="submit" loading={loading} className="w-full">
                    ログイン
                  </Button>
                </form>

                <div className="mt-6 pt-6 border-t border-dark-600">
                  <p className="text-sm text-dark-400 text-center mb-4">
                    アカウントをお持ちでない方
                  </p>
                  <Link href="/register">
                    <Button variant="outline" className="w-full">
                      新規登録（初月無料）
                    </Button>
                  </Link>
                </div>
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
