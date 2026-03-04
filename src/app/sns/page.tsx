'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface GeneratedPost {
  caption: string;
  hashtags: string[];
  fullText: string;
}

type MoodType = 'cute' | 'funny' | 'cool' | 'heartwarming';

export default function SnsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mood, setMood] = useState<MoodType>('cute');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dogName, setDogName] = useState<string>('');
  const [dogBreed, setDogBreed] = useState<string>('');

  useEffect(() => {
    const fetchDogInfo = async () => {
      try {
        const res = await fetch('/api/dogs');
        const data = await res.json();
        if (data.dogs && data.dogs.length > 0) {
          setDogName(data.dogs[0].name);
          setDogBreed(data.dogs[0].breed || '');
        }
      } catch (error) {
        console.error('Failed to fetch dog info:', error);
      }
    };

    if (session) {
      fetchDogInfo();
    }
  }, [session]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePost = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dogName,
          dogBreed,
          mood,
          customPrompt,
        }),
      });
      const data = await res.json();
      if (data.post) {
        setGeneratedPost(data.post);
      }
    } catch (error) {
      console.error('Failed to generate post:', error);
    }
    setLoading(false);
  };

  const copyToClipboard = async () => {
    if (!generatedPost) return;
    try {
      await navigator.clipboard.writeText(generatedPost.fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const regenerate = () => {
    generatePost();
  };

  const moodOptions: { value: MoodType; label: string; emoji: string }[] = [
    { value: 'cute', label: 'かわいい', emoji: '🥰' },
    { value: 'funny', label: 'おもしろい', emoji: '😂' },
    { value: 'cool', label: 'かっこいい', emoji: '😎' },
    { value: 'heartwarming', label: 'ほっこり', emoji: '🥹' },
  ];

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

  return (
    <div className="min-h-screen bg-warm-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-warm-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold text-primary-600">わんサポ</h1>
          </Link>
          <Link href="/dashboard" className="text-primary-600 text-sm">
            戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">📸</span>
          <h2 className="text-2xl font-bold text-primary-900">
            SNS投稿サポート
          </h2>
        </div>

        <div className="space-y-6">
          {/* 画像アップロード */}
          <Card>
            <h3 className="font-bold text-primary-900 mb-4">
              1. 写真を選択
            </h3>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />
            {selectedImage ? (
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Selected"
                  className="w-full h-64 object-cover rounded-xl"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setGeneratedPost(null);
                  }}
                  className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-warm-300 rounded-xl flex flex-col items-center justify-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
              >
                <span className="text-4xl mb-2">📷</span>
                <span className="text-gray-600">タップして写真を選択</span>
              </button>
            )}
          </Card>

          {/* トーン選択 */}
          <Card>
            <h3 className="font-bold text-primary-900 mb-4">
              2. 投稿のトーンを選択
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {moodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMood(option.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    mood === option.value
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-warm-200 hover:border-warm-300'
                  }`}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <p className="font-medium text-primary-900 mt-1">
                    {option.label}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          {/* カスタムリクエスト */}
          <Card>
            <h3 className="font-bold text-primary-900 mb-4">
              3. 追加リクエスト（任意）
            </h3>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="例: 今日は初めてドッグランに行きました！"
              className="w-full px-4 py-3 rounded-xl border border-warm-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 outline-none transition-all duration-200 bg-white resize-none"
              rows={3}
            />
          </Card>

          {/* 生成ボタン */}
          <Button
            onClick={generatePost}
            loading={loading}
            disabled={!selectedImage}
            className="w-full"
          >
            投稿文を生成する ✨
          </Button>

          {/* 生成結果 */}
          {generatedPost && (
            <Card className="bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
              <h3 className="font-bold text-primary-900 mb-4">
                生成された投稿文
              </h3>
              <div className="bg-white rounded-xl p-4 mb-4">
                <p className="text-gray-800 whitespace-pre-wrap mb-4">
                  {generatedPost.caption}
                </p>
                <div className="flex flex-wrap gap-2">
                  {generatedPost.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-blue-600 text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={copyToClipboard}
                  className="flex-1"
                >
                  {copied ? '✓ コピーしました！' : '📋 コピーする'}
                </Button>
                <Button
                  variant="outline"
                  onClick={regenerate}
                  disabled={loading}
                >
                  🔄 再生成
                </Button>
              </div>
            </Card>
          )}

          {/* ヒント */}
          <Card variant="warm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-bold text-primary-900 mb-1">
                  投稿のコツ
                </h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>・ハッシュタグは10個程度が効果的</li>
                  <li>・犬種タグを入れるとファンに見つけてもらいやすい</li>
                  <li>・投稿時間は夜20-22時がおすすめ</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
