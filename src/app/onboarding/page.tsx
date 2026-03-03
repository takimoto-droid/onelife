'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [dogName, setDogName] = useState('');
  const [loading, setLoading] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full" />
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  const handleContinue = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!dogName.trim()) return;

      setLoading(true);
      try {
        // 犬の情報を保存
        await fetch('/api/dogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: dogName }),
        });

        router.push('/hearing');
      } catch {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-100 to-warm-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* プログレス */}
        <div className="flex justify-center gap-2 mb-8">
          <div
            className={`w-3 h-3 rounded-full ${
              step >= 1 ? 'bg-primary-500' : 'bg-warm-300'
            }`}
          />
          <div
            className={`w-3 h-3 rounded-full ${
              step >= 2 ? 'bg-primary-500' : 'bg-warm-300'
            }`}
          />
        </div>

        <Card className="soft-shadow">
          {step === 1 && (
            <div className="text-center fade-in">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-2xl font-bold text-primary-900 mb-4">
                ようこそ、わんサポへ！
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                犬を飼い始めたばかりの方も、これから飼う方も、
                わんサポが一緒にサポートします。
                <br /><br />
                まずは、あなたとワンちゃんのことを
                少しだけ教えてください。
              </p>

              <div className="space-y-3 text-left mb-8">
                <div className="flex items-center gap-3 p-3 bg-warm-100 rounded-lg">
                  <span className="text-2xl">💬</span>
                  <p className="text-sm text-gray-700">
                    AIが会話形式でヒアリングします
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-warm-100 rounded-lg">
                  <span className="text-2xl">⏱️</span>
                  <p className="text-sm text-gray-700">
                    ほんの数分で完了します
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-warm-100 rounded-lg">
                  <span className="text-2xl">❓</span>
                  <p className="text-sm text-gray-700">
                    わからない質問はスキップOK
                  </p>
                </div>
              </div>

              <Button onClick={handleContinue} className="w-full">
                はじめる
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🐕</div>
                <h2 className="text-xl font-bold text-primary-900">
                  ワンちゃんのお名前は？
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  まずはお名前を教えてください
                </p>
              </div>

              <div className="space-y-6">
                <Input
                  placeholder="例: ポチ、モカ、ハナ"
                  value={dogName}
                  onChange={(e) => setDogName(e.target.value)}
                  className="text-center text-lg"
                />

                <Button
                  onClick={handleContinue}
                  loading={loading}
                  disabled={!dogName.trim()}
                  className="w-full"
                >
                  次へ進む
                </Button>

                <button
                  onClick={() => setStep(1)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  戻る
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* 注意書き */}
        <div className="disclaimer mt-6">
          <p>
            ※ 入力いただいた情報は、あなたに合ったサポートを提供するために使用します。
          </p>
        </div>
      </div>
    </div>
  );
}
