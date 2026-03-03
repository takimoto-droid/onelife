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
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // セッションがある場合、ユーザーが有効か確認
    const checkUser = async () => {
      if (status === 'authenticated' && session?.user?.id) {
        try {
          const res = await fetch('/api/dogs');
          if (res.ok) {
            const data = await res.json();
            // 犬が登録されていればダッシュボードへ
            if (data.dogs && data.dogs.length > 0) {
              router.push('/dashboard');
              return;
            }
          } else if (res.status === 401) {
            // セッションが無効な場合はログアウト
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
  }, [status, session, router]);

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

  // セッション確認中はローディング表示
  if (status === 'loading' || checkingSession) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-100 to-warm-50">
      {/* ヘッダー */}
      <header className="p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-600">わんサポ</h1>
        </div>
      </header>

      {/* ヒーローセクション */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🐕</div>
          <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mb-4">
            犬を飼い始めた方の
            <br />
            AI相棒アプリ
          </h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            初めてのワンちゃんとの生活、不安なことがたくさんありますよね。
            わんサポがワクチンや保険のことまで、一緒にサポートします。
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* 特徴 */}
          <div className="space-y-6">
            <Card variant="warm">
              <div className="flex gap-4">
                <span className="text-3xl">💬</span>
                <div>
                  <h3 className="font-bold text-primary-900 mb-1">
                    AIがやさしくヒアリング
                  </h3>
                  <p className="text-sm text-gray-600">
                    わからないことがあっても大丈夫。
                    会話形式で必要な情報を整理します。
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="warm">
              <div className="flex gap-4">
                <span className="text-3xl">📅</span>
                <div>
                  <h3 className="font-bold text-primary-900 mb-1">
                    ワクチンスケジュール管理
                  </h3>
                  <p className="text-sm text-gray-600">
                    予防接種の時期をお知らせ。
                    忘れずに受けられるようサポートします。
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="warm">
              <div className="flex gap-4">
                <span className="text-3xl">🏥</span>
                <div>
                  <h3 className="font-bold text-primary-900 mb-1">
                    保険のAIレコメンド
                  </h3>
                  <p className="text-sm text-gray-600">
                    ワンちゃんに合った保険を提案。
                    押し売りはしません、参考情報としてお伝えします。
                  </p>
                </div>
              </div>
            </Card>

            <div className="p-4 bg-primary-50 rounded-xl">
              <p className="text-sm text-primary-800">
                <span className="font-bold">7日間無料</span>でお試しいただけます。
                月額500円（税込）
              </p>
            </div>
          </div>

          {/* ログインフォーム */}
          <Card className="soft-shadow">
            <h3 className="text-xl font-bold text-primary-900 mb-6 text-center">
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
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <Button type="submit" loading={loading} className="w-full">
                ログイン
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-warm-200">
              <p className="text-sm text-gray-600 text-center mb-4">
                アカウントをお持ちでない方
              </p>
              <Link href="/register">
                <Button variant="outline" className="w-full">
                  新規登録（7日間無料）
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* 注意書き */}
        <div className="disclaimer mt-8 max-w-2xl mx-auto">
          <p>
            ※ わんサポは獣医療の代替ではありません。健康上の問題がある場合は、必ず獣医師にご相談ください。
            提供する情報は一般的なガイダンスであり、個々の状況に応じた専門的なアドバイスではありません。
          </p>
        </div>
      </main>
    </div>
  );
}
