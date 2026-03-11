'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface EmotionScore {
  emotion: string;
  emoji: string;
  percentage: number;
}

interface AudioFeatures {
  pitch: string;
  volume: string;
  duration: string;
  continuity: string;
}

interface TranslationResult {
  emotion: string;
  emoji: string;
  meaning: string;
  alternativeTranslations: string[];
  confidence: number;
  advice: string;
  barkType: string;
  emotionScores: EmotionScore[];
  audioFeatures: AudioFeatures;
  timestamp: string;
}

const HISTORY_STORAGE_KEY = 'wanlife_voice_history';
const MAX_RECORDING_TIME = 10000; // 10秒

export default function VoicePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<TranslationResult[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isPremium = session?.user?.subscriptionStatus === 'active' || session?.user?.subscriptionStatus === 'trialing';

  // 履歴をローカルストレージから読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(parsed.slice(0, 20)); // 最大20件
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []);

  // 履歴をローカルストレージに保存
  useEffect(() => {
    if (history.length > 0) {
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
      } catch (e) {
        console.error('Failed to save history:', e);
      }
    }
  }, [history]);

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
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
    }
  }, []);

  const startRecording = async () => {
    try {
      setError('');
      setResult(null);
      chunksRef.current = [];

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

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        // 録音停止時
        stream.getTracks().forEach(track => track.stop());
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        setAudioLevel(0);

        // 音声分析を実行
        if (chunksRef.current.length > 0) {
          await analyzeAudio(chunksRef.current);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      // 録音時間カウンター
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 100);
      }, 100);

      // 10秒で自動停止
      autoStopTimerRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_TIME);

    } catch (err) {
      console.error('Recording error:', err);
      setError('マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。');
    }
  };

  const analyzeAudio = async (chunks: Blob[]) => {
    setIsAnalyzing(true);

    try {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });

      // 最小サイズチェック（録音が短すぎる場合）
      if (audioBlob.size < 1000) {
        setError('録音が短すぎます。もう少し長く録音してください。');
        setIsAnalyzing(false);
        return;
      }

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
          setError(data.error || '分析に失敗しました。もう一度お試しください。');
        }
        return;
      }

      setResult(data.result);
      setHistory(prev => [data.result, ...prev.slice(0, 19)]);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('通信エラーが発生しました。ネットワーク接続を確認してください。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}`;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
          <h2 className="text-2xl font-bold text-dark-50 mb-2 flex items-center justify-center gap-2">
            鳴き声翻訳
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-2 py-1 rounded-full font-bold">
              👑 Premium
            </span>
          </h2>
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
            {/* 録音セクション */}
            <Card className="mb-6">
              <div className="text-center py-8">
                {/* 録音ボタン */}
                <div className="relative inline-block mb-6">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isAnalyzing}
                    className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isRecording
                        ? 'bg-red-500'
                        : 'bg-gradient-to-br from-feature-voice to-feature-voice/70'
                    } ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                    style={{
                      boxShadow: isRecording
                        ? `0 0 ${30 + audioLevel * 50}px rgba(239, 68, 68, ${0.3 + audioLevel * 0.4})`
                        : '0 0 30px rgba(139, 92, 246, 0.3)',
                    }}
                  >
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center">
                        <div className="spinner mb-1" />
                        <span className="text-xs text-white">分析中</span>
                      </div>
                    ) : isRecording ? (
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-white rounded-sm mb-1" />
                        <span className="text-xs text-white">停止</span>
                      </div>
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
                    <>
                      <div
                        className="absolute -inset-4 rounded-full border-4 border-red-400 pointer-events-none"
                        style={{
                          transform: `scale(${1 + audioLevel * 0.3})`,
                          opacity: 0.3 + audioLevel * 0.4,
                        }}
                      />
                      <div className="absolute -inset-8 rounded-full border-2 border-red-400/30 animate-ping pointer-events-none" />
                    </>
                  )}
                </div>

                {/* 録音タイマー */}
                {isRecording && (
                  <div className="mb-4">
                    <div className="text-3xl font-mono text-red-400 mb-2">
                      {formatTime(recordingTime)}s
                    </div>
                    <div className="w-48 mx-auto h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-100"
                        style={{ width: `${(recordingTime / MAX_RECORDING_TIME) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-dark-500 mt-1">
                      {formatTime(MAX_RECORDING_TIME - recordingTime)}秒で自動停止
                    </p>
                  </div>
                )}

                <p className={`font-medium ${isRecording ? 'text-red-400' : isAnalyzing ? 'text-accent' : 'text-dark-300'}`}>
                  {isAnalyzing
                    ? '🔍 AIが鳴き声を分析しています...'
                    : isRecording
                    ? '🔴 録音中... タップで停止'
                    : '🎤 タップして録音開始'}
                </p>

                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* 分析結果 */}
            {result && (
              <div className="space-y-4 mb-8 slide-up">
                {/* メイン結果カード */}
                <Card>
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4">{result.emoji}</div>
                    <h3 className="text-xl font-bold text-dark-100 mb-1">
                      {result.emotion}
                    </h3>
                    <div className="flex items-center justify-center gap-2 text-dark-400 text-sm">
                      <span>信頼度: {result.confidence}%</span>
                      <span className="text-dark-600">|</span>
                      <span>パターン: {result.barkType}</span>
                    </div>
                  </div>

                  {/* メイン翻訳 */}
                  <div className="bg-feature-voice/10 border border-feature-voice/30 rounded-xl p-4 mb-4">
                    <p className="text-sm text-feature-voice mb-1">翻訳結果</p>
                    <p className="text-xl font-bold text-dark-100">
                      「{result.meaning}」
                    </p>
                  </div>

                  {/* 別の翻訳パターン */}
                  {result.alternativeTranslations && result.alternativeTranslations.length > 0 && (
                    <div className="bg-dark-700/50 rounded-xl p-4 mb-4">
                      <p className="text-sm text-dark-400 mb-2">他の可能性</p>
                      <div className="space-y-2">
                        {result.alternativeTranslations.map((alt, i) => (
                          <p key={i} className="text-dark-300 text-sm">
                            「{alt}」
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* 感情メーター */}
                <Card>
                  <h4 className="font-bold text-dark-100 mb-4 flex items-center gap-2">
                    <span>📊</span>
                    感情メーター
                  </h4>
                  <div className="space-y-3">
                    {result.emotionScores.map((score, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{score.emoji}</span>
                            <span className="text-dark-200 text-sm">{score.emotion}</span>
                          </div>
                          <span className="text-dark-400 text-sm font-mono">{score.percentage}%</span>
                        </div>
                        <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              index === 0
                                ? 'bg-gradient-to-r from-feature-voice to-accent'
                                : index === 1
                                ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                                : 'bg-gradient-to-r from-gray-500 to-gray-400'
                            }`}
                            style={{ width: `${score.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* 音声特徴 */}
                <Card>
                  <h4 className="font-bold text-dark-100 mb-4 flex items-center gap-2">
                    <span>🎵</span>
                    音声特徴
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-dark-700/50 rounded-lg p-3">
                      <p className="text-xs text-dark-500 mb-1">音の高さ</p>
                      <p className="text-dark-200 font-medium">{result.audioFeatures.pitch}</p>
                    </div>
                    <div className="bg-dark-700/50 rounded-lg p-3">
                      <p className="text-xs text-dark-500 mb-1">音量</p>
                      <p className="text-dark-200 font-medium">{result.audioFeatures.volume}</p>
                    </div>
                    <div className="bg-dark-700/50 rounded-lg p-3">
                      <p className="text-xs text-dark-500 mb-1">長さ</p>
                      <p className="text-dark-200 font-medium">{result.audioFeatures.duration}</p>
                    </div>
                    <div className="bg-dark-700/50 rounded-lg p-3">
                      <p className="text-xs text-dark-500 mb-1">連続性</p>
                      <p className="text-dark-200 font-medium">{result.audioFeatures.continuity}</p>
                    </div>
                  </div>
                </Card>

                {/* アドバイス */}
                <Card variant="feature">
                  <h4 className="font-bold text-dark-100 mb-2 flex items-center gap-2">
                    <span>💡</span>
                    アドバイス
                  </h4>
                  <p className="text-dark-300">{result.advice}</p>
                </Card>
              </div>
            )}

            {/* 履歴セクション */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-lg font-bold text-dark-100"
                >
                  <span>📋</span>
                  翻訳履歴
                  <span className="text-sm text-dark-500">({history.length}件)</span>
                  <svg
                    className={`w-4 h-4 text-dark-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {history.length > 0 && showHistory && (
                  <button
                    onClick={clearHistory}
                    className="text-sm text-dark-500 hover:text-red-400 transition-colors"
                  >
                    履歴を削除
                  </button>
                )}
              </div>

              {showHistory && (
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <Card variant="feature" className="text-center py-8">
                      <p className="text-dark-500">まだ履歴がありません</p>
                      <p className="text-dark-600 text-sm mt-1">鳴き声を録音すると履歴が保存されます</p>
                    </Card>
                  ) : (
                    history.map((item, index) => (
                      <Card key={index} variant="feature" className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="text-3xl">{item.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-dark-100">{item.emotion}</p>
                              <span className="text-xs text-dark-500 bg-dark-700 px-2 py-0.5 rounded">
                                {item.confidence}%
                              </span>
                            </div>
                            <p className="text-sm text-dark-300 mb-2">「{item.meaning}」</p>
                            {item.emotionScores && (
                              <div className="flex flex-wrap gap-2">
                                {item.emotionScores.slice(0, 3).map((score, i) => (
                                  <span key={i} className="text-xs text-dark-500">
                                    {score.emoji} {score.percentage}%
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-dark-600 whitespace-nowrap">
                            {formatDate(item.timestamp)}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* 使い方説明 */}
        <Card variant="feature" className="mb-8">
          <h3 className="font-bold text-dark-100 mb-3">使い方</h3>
          <ol className="space-y-3 text-sm text-dark-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-feature-voice/20 text-feature-voice flex items-center justify-center text-xs font-bold">1</span>
              <span>マイクボタンをタップして録音開始</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-feature-voice/20 text-feature-voice flex items-center justify-center text-xs font-bold">2</span>
              <span>ワンちゃんの鳴き声を録音（最大10秒）</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-feature-voice/20 text-feature-voice flex items-center justify-center text-xs font-bold">3</span>
              <span>もう一度タップで停止、または10秒で自動停止</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-feature-voice/20 text-feature-voice flex items-center justify-center text-xs font-bold">4</span>
              <span>AIが分析して翻訳結果を表示</span>
            </li>
          </ol>
          <div className="mt-4 p-3 bg-dark-700/50 rounded-lg">
            <p className="text-xs text-dark-400">
              <span className="text-feature-voice">💡 ヒント：</span>
              3〜10秒程度の録音がベストです。静かな環境で録音するとより正確な結果が得られます。
            </p>
          </div>
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
