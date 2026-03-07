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

// トーンの型定義（5種類）
type ToneType = 'cute' | 'funny' | 'emotional' | 'daily' | 'simple' | null;

export default function SnsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<ToneType>(null); // 初期値をnullに
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedPost, setGeneratedPost] = useState<GeneratedPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dogName, setDogName] = useState<string>('');
  const [dogBreed, setDogBreed] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // トーン選択肢（5種類）
  const toneOptions: { value: ToneType; label: string; emoji: string; description: string }[] = [
    { value: 'cute', label: 'かわいい', emoji: '🥰', description: 'キュンとする投稿' },
    { value: 'funny', label: '面白い', emoji: '😂', description: '笑える投稿' },
    { value: 'emotional', label: '感動系', emoji: '🥹', description: 'じーんとくる投稿' },
    { value: 'daily', label: '日常', emoji: '☀️', description: 'ほっこり日常系' },
    { value: 'simple', label: 'シンプル', emoji: '✨', description: 'すっきり短め' },
  ];

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
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // トーン選択ハンドラー
  const handleToneSelect = (tone: ToneType) => {
    setSelectedTone(tone);
    setError(null); // エラーをクリア
  };

  const generatePost = async () => {
    // バリデーション
    if (!selectedImage) {
      setError('写真を選択してください');
      return;
    }
    if (!selectedTone) {
      setError('投稿トーンを選択してください');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/sns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dogName,
          dogBreed,
          mood: selectedTone, // 選択されたトーンを送信
          customPrompt,
        }),
      });
      const data = await res.json();
      if (data.post) {
        setGeneratedPost(data.post);
      }
    } catch (error) {
      console.error('Failed to generate post:', error);
      setError('投稿文の生成に失敗しました');
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

  const shareToTwitter = () => {
    if (!generatedPost) return;
    const text = encodeURIComponent(generatedPost.fullText);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const regenerate = () => {
    generatePost();
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full" />
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-50 to-pink-50 pb-24">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-md border-b border-cream-200 p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
          <Link href="/dashboard" className="text-pink-500 text-sm hover:text-pink-600">
            戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-3xl">📸</span>
          <div>
            <h2 className="text-2xl font-bold text-brown-700">
              SNS投稿サポート
            </h2>
            <p className="text-sm text-brown-400">AIがあなたの投稿文を作成</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* エラー表示 */}
          {error && (
            <div className="bg-pink-100 border border-pink-300 text-pink-700 px-4 py-3 rounded-2xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: 画像アップロード */}
          <Card variant="warm">
            <h3 className="font-bold text-brown-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-pink-400 text-white rounded-full flex items-center justify-center text-sm">1</span>
              写真を選択
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
                  className="w-full h-64 object-cover rounded-2xl"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setGeneratedPost(null);
                  }}
                  className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                >
                  ✕
                </button>
                <div className="absolute bottom-2 left-2 bg-mint-500 text-white px-3 py-1 rounded-full text-sm">
                  ✓ 選択済み
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-cream-300 rounded-2xl flex flex-col items-center justify-center hover:border-pink-300 hover:bg-pink-50 transition-all"
              >
                <span className="text-5xl mb-2">📷</span>
                <span className="text-brown-500 font-medium">タップして写真を選択</span>
                <span className="text-brown-400 text-sm mt-1">JPG, PNG対応</span>
              </button>
            )}
          </Card>

          {/* Step 2: トーン選択 */}
          <Card variant="warm">
            <h3 className="font-bold text-brown-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-pink-400 text-white rounded-full flex items-center justify-center text-sm">2</span>
              投稿のトーンを選択
              <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full ml-2">必須</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {toneOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleToneSelect(option.value)}
                  className={`relative p-4 rounded-2xl border-2 transition-all duration-200 ${
                    selectedTone === option.value
                      ? 'border-pink-400 bg-pink-50 shadow-soft'
                      : 'border-cream-200 bg-white hover:border-pink-200 hover:bg-cream-50'
                  }`}
                >
                  {/* 選択チェックマーク */}
                  {selectedTone === option.value && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center shadow-soft">
                      <span className="text-white text-sm">✓</span>
                    </div>
                  )}
                  <span className="text-3xl block mb-1">{option.emoji}</span>
                  <p className={`font-bold ${
                    selectedTone === option.value ? 'text-pink-600' : 'text-brown-700'
                  }`}>
                    {option.label}
                  </p>
                  <p className="text-xs text-brown-400 mt-1">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
            {/* 選択状態の表示 */}
            {selectedTone && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-pink-600 bg-pink-50 py-2 rounded-xl">
                <span>✨</span>
                <span>「{toneOptions.find(t => t.value === selectedTone)?.label}」トーンで投稿を作成します</span>
              </div>
            )}
          </Card>

          {/* Step 3: カスタムリクエスト */}
          <Card variant="warm">
            <h3 className="font-bold text-brown-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-cream-300 text-brown-600 rounded-full flex items-center justify-center text-sm">3</span>
              追加リクエスト
              <span className="text-xs text-brown-400 ml-2">任意</span>
            </h3>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="例: 今日は初めてドッグランに行きました！&#10;例: お気に入りのおもちゃで遊んでるところ"
              className="w-full px-4 py-3 rounded-2xl border-2 border-cream-200 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 outline-none transition-all duration-200 bg-white resize-none text-brown-700 placeholder:text-brown-300"
              rows={3}
            />
            <p className="text-xs text-brown-400 mt-2">
              写真の状況を入力すると、より具体的な投稿文が生成されます
            </p>
          </Card>

          {/* 生成ボタン */}
          <Button
            onClick={generatePost}
            loading={loading}
            disabled={!selectedImage || !selectedTone}
            className="w-full py-4 text-lg"
          >
            {!selectedImage
              ? '📷 まず写真を選択してください'
              : !selectedTone
              ? '🎨 トーンを選択してください'
              : '✨ 投稿文を生成する'
            }
          </Button>

          {/* 生成結果 */}
          {generatedPost && (
            <Card className="bg-gradient-to-br from-pink-50 to-lavender-50 border-2 border-pink-200">
              <h3 className="font-bold text-brown-700 mb-4 flex items-center gap-2">
                <span className="text-xl">📝</span>
                生成された投稿文
              </h3>
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-soft">
                <p className="text-brown-700 whitespace-pre-wrap mb-4 leading-relaxed">
                  {generatedPost.caption}
                </p>
                <div className="flex flex-wrap gap-2">
                  {generatedPost.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-pink-600 text-sm bg-pink-50 px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* アクションボタン */}
              <div className="space-y-3">
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
                    🔄
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={shareToTwitter}
                    className="flex-1"
                  >
                    𝕏 でシェア
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (generatedPost) {
                        const text = encodeURIComponent(generatedPost.fullText);
                        window.open(`https://www.instagram.com/`, '_blank');
                      }
                    }}
                    className="flex-1"
                  >
                    📷 Instagram
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ヒント */}
          <Card variant="warm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-bold text-brown-700 mb-2">
                  投稿のコツ
                </h3>
                <ul className="text-sm text-brown-500 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-pink-400">•</span>
                    <span>ハッシュタグは10個程度が効果的</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-400">•</span>
                    <span>犬種タグを入れるとファンに見つけてもらいやすい</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-400">•</span>
                    <span>投稿時間は夜20-22時がおすすめ</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-cream-200 safe-area-inset-bottom z-40">
        <div className="max-w-4xl mx-auto flex justify-around py-2">
          <Link href="/dashboard" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-1">ホーム</span>
          </Link>
          <Link href="/walk" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">🚶</span>
            <span className="text-xs mt-1">散歩</span>
          </Link>
          <Link href="/sns" className="flex flex-col items-center py-2 px-4 text-pink-500">
            <span className="text-xl">📸</span>
            <span className="text-xs mt-1 font-bold">SNS</span>
          </Link>
          <Link href="/community" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">💬</span>
            <span className="text-xs mt-1">コミュニティ</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center py-2 px-4 text-brown-400">
            <span className="text-xl">⚙️</span>
            <span className="text-xs mt-1">設定</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
