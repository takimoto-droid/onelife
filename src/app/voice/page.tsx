'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface TranslationResult {
  emotion: string;
  meaning: string;
  confidence: number;
  advice: string;
  barkType: string;
  timestamp: string;
}

export default function VoicePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<TranslationResult[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const isPremium = session?.user?.subscriptionStatus === 'active' || session?.user?.subscriptionStatus === 'trialing';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // オーディオレベル監視のセットアップ
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // オーディオレベルの監視
      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
        }
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        // 録音停止時
        stream.getTracks().forEach(track => track.stop());
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        setAudioLevel(0);

        // 音声分析を実行
        await analyzeAudio(chunks);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
      setError('マイクへのアクセスが許可されていません');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const analyzeAudio = async (chunks: Blob[]) => {
    setIsAnalyzing(true);
    setResult(null);

    try {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const res = await fetch('/api/voice/translate', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresPremium) {
          setError('この機能はPremiumメンバー限定です');
        } else {
          setError(data.error || '分析に失敗しました');
        }
        return;
      }

      setResult(data.result);
      setHistory(prev => [data.result, ...prev.slice(0, 4)]);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('分析中にエラーが発生しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const getEmotionEmoji = (emotion: string) => {
    const emojiMap: Record<string, string> = {
      '興奮・喜び': '😊',
      '注意喚起': '👀',
      '寂しさ・甘え': '🥺',
      '警戒・不安': '😨',
      '痛み・恐怖': '😢',
      '暑さ・疲労': '😮‍💨',
      '孤独・呼びかけ': '🐕',
      '満足・リラックス': '😌',
    };
    return emojiMap[emotion] || '🐕';
  };

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* ヘッダー */}
      <header className="header p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
          <div className="flex items-center gap-2">
            <span className="premium-badge">Premium</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-dark-50 mb-2">鳴き声翻訳</h2>
          <p className="text-dark-400">
            ワンちゃんの鳴き声をAIが翻訳します
          </p>
        </div>

        {/* プレミアム非会員の場合 */}
        {!isPremium && (
          <Card variant="premium" className="mb-8 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-bold text-dark-100 mb-2">
              Premium限定機能です
            </h3>
            <p className="text-dark-400 text-sm mb-4">
              鳴き声翻訳はPremiumメンバー限定の機能です。
              月額500円ですべての機能が使い放題になります。
            </p>
            <Link href="/settings">
              <Button variant="premium">Premiumにアップグレード</Button>
            </Link>
          </Card>
        )}

        {/* 録音UI */}
        {isPremium && (
          <>
            <Card className="mb-8">
              <div className="text-center py-8">
                {/* 録音ボタン */}
                <div className="relative inline-block mb-6">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isAnalyzing}
                    className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isRecording
                        ? 'bg-red-500 animate-pulse'
                        : 'bg-gradient-to-br from-feature-voice to-feature-voice/70'
                    } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                    style={{
                      boxShadow: isRecording
                        ? `0 0 ${30 + audioLevel * 50}px rgba(239, 68, 68, ${0.3 + audioLevel * 0.4})`
                        : '0 0 30px rgba(139, 92, 246, 0.3)',
                    }}
                  >
                    {isAnalyzing ? (
                      <div className="spinner" />
                    ) : (
                      <svg
                        className="w-12 h-12 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                    )}
                  </button>

                  {/* オーディオレベルインジケーター */}
                  {isRecording && (
                    <div className="absolute -inset-4 rounded-full border-4 border-red-400 opacity-50 animate-ping" />
                  )}
                </div>

                <p className={`font-medium ${isRecording ? 'text-red-400' : 'text-dark-300'}`}>
                  {isAnalyzing
                    ? '🔍 AIが分析中...'
                    : isRecording
                    ? '🔴 録音中... もう1回タップで停止'
                    : '🎤 タップして録音開始'}
                </p>
                {isRecording && (
                  <p className="text-xs text-dark-500 mt-1">
                    鳴き声が聞こえる間、録音を続けてください
                  </p>
                )}

                {error && (
                  <p className="mt-4 text-red-400 text-sm">{error}</p>
                )}
              </div>
            </Card>

            {/* 分析結果 */}
            {result && (
              <Card className="mb-8 slide-up">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">{getEmotionEmoji(result.emotion)}</div>
                  <h3 className="text-xl font-bold text-dark-100 mb-1">
                    {result.emotion}
                  </h3>
                  <p className="text-dark-400 text-sm">
                    信頼度: {result.confidence}%
                  </p>
                </div>

                <div className="bg-dark-700/50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-dark-400 mb-1">鳴き声パターン</p>
                  <p className="text-lg font-bold text-accent">{result.barkType}</p>
                </div>

                <div className="bg-feature-voice/10 border border-feature-voice/30 rounded-xl p-4 mb-4">
                  <p className="text-sm text-feature-voice mb-1">翻訳結果</p>
                  <p className="text-xl font-bold text-dark-100">
                    「{result.meaning}」
                  </p>
                </div>

                <div className="bg-dark-700/50 rounded-xl p-4">
                  <p className="text-sm text-dark-400 mb-1">アドバイス</p>
                  <p className="text-dark-200">{result.advice}</p>
                </div>
              </Card>
            )}

            {/* 履歴 */}
            {history.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-dark-100 mb-4">最近の翻訳</h3>
                <div className="space-y-3">
                  {history.map((item, index) => (
                    <Card key={index} variant="feature" className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{getEmotionEmoji(item.emotion)}</div>
                        <div className="flex-1">
                          <p className="font-bold text-dark-100">{item.emotion}</p>
                          <p className="text-sm text-dark-400">「{item.meaning}」</p>
                        </div>
                        <div className="text-xs text-dark-500">
                          {new Date(item.timestamp).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 説明 */}
        <Card variant="feature" className="mb-8">
          <h3 className="font-bold text-dark-100 mb-3">使い方（タップ操作）</h3>
          <ol className="space-y-3 text-sm text-dark-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-feature-voice/20 text-feature-voice flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <span className="font-medium text-dark-100">1回タップ</span>
                <span className="text-dark-400"> → 録音開始（ボタンが赤く点滅）</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-feature-voice/20 text-feature-voice flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <span className="font-medium text-dark-100">もう1回タップ</span>
                <span className="text-dark-400"> → 録音停止 & 即座に翻訳開始</span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-feature-voice/20 text-feature-voice flex items-center justify-center text-xs font-bold">3</span>
              <span>AIが分析完了 → 翻訳結果が下に表示されます</span>
            </li>
          </ol>
          <p className="text-xs text-dark-500 mt-3 bg-dark-700/50 rounded-lg p-2">
            <span className="text-feature-voice">💡</span> 3〜10秒程度の録音がベストです
          </p>
        </Card>

        {/* 注意書き */}
        <div className="disclaimer">
          <p>
            ※ 鳴き声翻訳はAIによる推測であり、100%正確ではありません。
            ワンちゃんの様子や状況を総合的に判断してください。
            異常が続く場合は獣医師にご相談ください。
          </p>
        </div>
      </main>

      {/* ボトムナビゲーション */}
      <nav className="bottom-nav">
        <div className="max-w-4xl mx-auto flex justify-around">
          <Link href="/dashboard" className="bottom-nav-item">
            <span className="text-xl">🏠</span>
            <span>ホーム</span>
          </Link>
          <Link href="/walk" className="bottom-nav-item">
            <span className="text-xl">🚶</span>
            <span>散歩</span>
          </Link>
          <Link href="/voice" className="bottom-nav-item bottom-nav-item-active">
            <span className="text-xl">🎤</span>
            <span>翻訳</span>
          </Link>
          <Link href="/family" className="bottom-nav-item">
            <span className="text-xl">👨‍👩‍👧</span>
            <span>家族</span>
          </Link>
          <Link href="/settings" className="bottom-nav-item">
            <span className="text-xl">⚙️</span>
            <span>設定</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
