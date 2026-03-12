'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// 人気の犬種リスト
const POPULAR_BREEDS = [
  'トイプードル',
  'チワワ',
  '柴犬',
  'ミニチュアダックスフンド',
  'ポメラニアン',
  'フレンチブルドッグ',
  'ヨークシャーテリア',
  'マルチーズ',
  'シーズー',
  'ミニチュアシュナウザー',
  'ゴールデンレトリバー',
  'ラブラドールレトリバー',
  'コーギー',
  'ビーグル',
  'パグ',
  'ボストンテリア',
  'キャバリア',
  'パピヨン',
  'ジャックラッセルテリア',
  'ボーダーコリー',
  'MIX犬',
];

const DOG_SIZES = [
  { value: 'small', label: '小型犬', description: '10kg未満' },
  { value: 'medium', label: '中型犬', description: '10kg〜25kg' },
  { value: 'large', label: '大型犬', description: '25kg以上' },
];

type Step = 'name' | 'breed' | 'details' | 'complete';

export default function AddDogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>('name');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 犬の情報
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [customBreed, setCustomBreed] = useState('');
  const [dogSize, setDogSize] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // 認証チェック
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/');
    return null;
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          breed: breed === 'その他' ? customBreed : breed,
          birthDate: birthDate || null,
          dogSize: dogSize || null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.dog) {
        // 新しく追加した犬を選択状態にする
        localStorage.setItem('selectedDogId', data.dog.id);
        setStep('complete');
      } else {
        setError(data.error || '登録に失敗しました');
      }
    } catch (err) {
      console.error('Failed to add dog:', err);
      setError('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 完了画面
  if (step === 'complete') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-md mx-auto pt-12">
          <Card className="text-center py-12">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-2xl font-bold text-brown-800 mb-4">
              {name}ちゃんを登録しました！
            </h1>
            <p className="text-brown-500 mb-8">
              ダッシュボードで犬を切り替えられます
            </p>
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

  return (
    <div className="min-h-screen pb-8">
      {/* ヘッダー */}
      <header className="header p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-brown-400 hover:text-accent">
            ← 戻る
          </Link>
          <h1 className="text-lg font-bold gradient-text">新しい犬を追加</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 py-6">
        {/* プログレスバー */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-brown-400 mb-2">
            <span className={step === 'name' ? 'text-accent font-bold' : ''}>名前</span>
            <span className={step === 'breed' ? 'text-accent font-bold' : ''}>犬種</span>
            <span className={step === 'details' ? 'text-accent font-bold' : ''}>詳細</span>
          </div>
          <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-peach-400 transition-all duration-300"
              style={{
                width: step === 'name' ? '33%' : step === 'breed' ? '66%' : '100%',
              }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* ステップ1: 名前入力 */}
        {step === 'name' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🐕</div>
              <h2 className="text-2xl font-bold text-brown-800 mb-2">
                お名前を教えてください
              </h2>
              <p className="text-brown-500">
                新しく追加するワンちゃんの名前は？
              </p>
            </div>

            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：ポチ、モモ、ココ"
                className="w-full px-4 py-4 text-lg border-2 border-cream-300 rounded-2xl focus:outline-none focus:border-accent bg-white text-brown-800 placeholder-brown-300"
                autoFocus
              />
            </div>

            <Button
              onClick={() => {
                if (name.trim()) {
                  setStep('breed');
                } else {
                  setError('名前を入力してください');
                }
              }}
              disabled={!name.trim()}
              className="w-full"
            >
              次へ
            </Button>
          </div>
        )}

        {/* ステップ2: 犬種選択 */}
        {step === 'breed' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-brown-800 mb-2">
                {name}ちゃんの犬種は？
              </h2>
              <p className="text-brown-500 text-sm">
                該当するものを選んでください
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pb-4">
              {POPULAR_BREEDS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBreed(b)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    breed === b
                      ? 'bg-accent text-white'
                      : 'bg-cream-100 text-brown-700 hover:bg-cream-200'
                  }`}
                >
                  {b}
                </button>
              ))}
              <button
                onClick={() => setBreed('その他')}
                className={`p-3 rounded-xl text-sm font-medium transition-all ${
                  breed === 'その他'
                    ? 'bg-accent text-white'
                    : 'bg-cream-100 text-brown-700 hover:bg-cream-200'
                }`}
              >
                その他
              </button>
            </div>

            {breed === 'その他' && (
              <input
                type="text"
                value={customBreed}
                onChange={(e) => setCustomBreed(e.target.value)}
                placeholder="犬種を入力"
                className="w-full px-4 py-3 border-2 border-cream-300 rounded-xl focus:outline-none focus:border-accent bg-white text-brown-800"
              />
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setStep('name')}
                className="flex-1"
              >
                戻る
              </Button>
              <Button
                onClick={() => setStep('details')}
                disabled={!breed || (breed === 'その他' && !customBreed)}
                className="flex-1"
              >
                次へ
              </Button>
            </div>

            <button
              onClick={() => {
                setBreed('');
                setStep('details');
              }}
              className="w-full text-center text-brown-400 text-sm py-2"
            >
              犬種がわからない →
            </button>
          </div>
        )}

        {/* ステップ3: 詳細情報 */}
        {step === 'details' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-brown-800 mb-2">
                もう少し教えてください
              </h2>
              <p className="text-brown-500 text-sm">
                スキップしても後から設定できます
              </p>
            </div>

            {/* 犬のサイズ */}
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-2">
                犬のサイズ
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DOG_SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setDogSize(size.value)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      dogSize === size.value
                        ? 'bg-accent text-white'
                        : 'bg-cream-100 text-brown-700 hover:bg-cream-200'
                    }`}
                  >
                    <p className="font-medium text-sm">{size.label}</p>
                    <p className={`text-xs ${dogSize === size.value ? 'text-white/80' : 'text-brown-400'}`}>
                      {size.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 生年月日 */}
            <div>
              <label className="block text-sm font-medium text-brown-700 mb-2">
                生年月日（任意）
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border-2 border-cream-300 rounded-xl focus:outline-none focus:border-accent bg-white text-brown-800"
              />
            </div>

            <div className="pt-4 space-y-3">
              <Button
                onClick={handleSubmit}
                loading={loading}
                className="w-full"
              >
                {name}ちゃんを登録
              </Button>
              <Button
                variant="secondary"
                onClick={() => setStep('breed')}
                className="w-full"
              >
                戻る
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
