'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

type UserType = 'new_owner' | 'reviewing' | null;

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<UserType>(null);
  const [dogName, setDogName] = useState('');
  const [loading, setLoading] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  const handleSelectUserType = async (type: UserType) => {
    setUserType(type);
    // ユーザータイプを保存
    try {
      await fetch('/api/user/type', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType: type }),
      });
    } catch (error) {
      console.error('Failed to save user type:', error);
    }
    setStep(3);
  };

  const handleContinue = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 3) {
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
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* プログレス */}
        <div className="flex justify-center gap-2 mb-8">
          <div
            className={`w-3 h-3 rounded-full transition-colors ${
              step >= 1 ? 'bg-accent' : 'bg-dark-600'
            }`}
          />
          <div
            className={`w-3 h-3 rounded-full transition-colors ${
              step >= 2 ? 'bg-accent' : 'bg-dark-600'
            }`}
          />
          <div
            className={`w-3 h-3 rounded-full transition-colors ${
              step >= 3 ? 'bg-accent' : 'bg-dark-600'
            }`}
          />
        </div>

        <Card>
          {/* Step 1: 歓迎画面 */}
          {step === 1 && (
            <div className="text-center fade-in">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-2xl font-bold text-dark-50 mb-4">
                ようこそ、<span className="gradient-text">わんライフ</span>へ！
              </h2>
              <p className="text-dark-300 mb-6 leading-relaxed">
                犬を飼い始めたばかりの方も、
                すでに飼っている方も、
                わんライフが一緒にサポートします。
              </p>

              <div className="space-y-3 text-left mb-8">
                <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg border border-dark-600">
                  <span className="text-2xl">🎤</span>
                  <p className="text-sm text-dark-200">
                    鳴き声をAIが翻訳
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg border border-dark-600">
                  <span className="text-2xl">🏥</span>
                  <p className="text-sm text-dark-200">
                    あなたに合った保険をAIが提案
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg border border-dark-600">
                  <span className="text-2xl">📅</span>
                  <p className="text-sm text-dark-200">
                    ワクチン・健康管理をサポート
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg border border-dark-600">
                  <span className="text-2xl">🚶</span>
                  <p className="text-sm text-dark-200">
                    散歩ルートをAIが提案
                  </p>
                </div>
              </div>

              <Button onClick={handleContinue} className="w-full">
                はじめる
              </Button>
            </div>
          )}

          {/* Step 2: ユーザータイプ選択 */}
          {step === 2 && (
            <div className="fade-in">
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🐕</div>
                <h2 className="text-xl font-bold text-dark-50">
                  あなたの状況を教えてください
                </h2>
                <p className="text-sm text-dark-400 mt-2">
                  最適なサポートをご提案するために
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => handleSelectUserType('new_owner')}
                  className="w-full p-5 text-left rounded-xl border-2 border-dark-600 hover:border-accent hover:bg-dark-700 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">🐶</span>
                    <div>
                      <p className="font-bold text-dark-100">
                        犬を飼い始めたばかり
                      </p>
                      <p className="text-sm text-dark-400 mt-1">
                        最近お迎えした / これからお迎えする予定
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSelectUserType('reviewing')}
                  className="w-full p-5 text-left rounded-xl border-2 border-dark-600 hover:border-accent hover:bg-dark-700 transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">🔄</span>
                    <div>
                      <p className="font-bold text-dark-100">
                        すでに飼っていて見直したい
                      </p>
                      <p className="text-sm text-dark-400 mt-1">
                        保険や生活管理を見直したい
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full mt-6 text-sm text-dark-400 hover:text-accent transition-colors"
              >
                戻る
              </button>
            </div>
          )}

          {/* Step 3: 犬の名前入力 */}
          {step === 3 && (
            <div className="fade-in">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🐕</div>
                <h2 className="text-xl font-bold text-dark-50">
                  ワンちゃんのお名前は？
                </h2>
                <p className="text-sm text-dark-400 mt-2">
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
                  onClick={() => setStep(2)}
                  className="w-full text-sm text-dark-400 hover:text-accent transition-colors"
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
