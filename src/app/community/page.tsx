'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLocation } from '@/contexts/LocationContext';
import { LocationRequired } from '@/components/LocationRequest';

interface CommunityPost {
  id: string;
  anonymousName: string;
  content: string;
  imageUrl?: string;
  city: string;
  prefecture: string;
  category: string;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
}

type PostCategory = 'all' | 'walk' | 'dogrun' | 'vet' | 'trimming' | 'lost' | 'training' | 'other';

interface CategoryInfo {
  label: string;
  emoji: string;
}

const CATEGORIES: Record<PostCategory, CategoryInfo> = {
  all: { label: 'すべて', emoji: '📋' },
  walk: { label: '散歩', emoji: '🚶' },
  dogrun: { label: 'ドッグラン', emoji: '🐕' },
  vet: { label: '動物病院', emoji: '🏥' },
  trimming: { label: 'トリミング', emoji: '✂️' },
  lost: { label: '迷子・注意', emoji: '⚠️' },
  training: { label: 'しつけ', emoji: '📚' },
  other: { label: 'その他', emoji: '💬' },
};

const REPORT_REASONS = [
  { id: 'inappropriate', label: '不適切な内容' },
  { id: 'spam', label: 'スパム・宣伝' },
  { id: 'personal_info', label: '個人情報が含まれている' },
  { id: 'medical', label: '医療的なアドバイス' },
  { id: 'other', label: 'その他' },
];

// 座標から市区町村名を取得（モック）
const getCityFromCoords = (lat: number, lng: number): { city: string; prefecture: string } => {
  // 実際の実装ではreverse geocoding APIを使用
  // 簡易的に東京23区の中心座標で判定
  if (lat > 35.7 && lng < 139.7) return { city: '練馬区', prefecture: '東京都' };
  if (lat > 35.7 && lng > 139.75) return { city: '足立区', prefecture: '東京都' };
  if (lat > 35.65 && lng < 139.68) return { city: '世田谷区', prefecture: '東京都' };
  if (lat > 35.65 && lng > 139.75) return { city: '江東区', prefecture: '東京都' };
  if (lat < 35.62 && lng < 139.72) return { city: '目黒区', prefecture: '東京都' };
  if (lat < 35.62 && lng > 139.72) return { city: '品川区', prefecture: '東京都' };
  return { city: '渋谷区', prefecture: '東京都' };
};

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 位置情報（コンテキストから取得）
  const {
    location: geoLocation,
    loading: locationLoading,
    isLocationReady,
    requestLocation,
    setManualLocation,
  } = useLocation();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('all');
  const [cityInfo, setCityInfo] = useState<{ city: string; prefecture: string } | null>(null);

  // 投稿モーダル
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState<PostCategory>('other');
  const [posting, setPosting] = useState(false);

  // 通報モーダル
  const [reportingPost, setReportingPost] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetail, setReportDetail] = useState('');
  const [reporting, setReporting] = useState(false);

  // 位置情報が取得されたら市区町村を設定
  useEffect(() => {
    if (geoLocation) {
      const info = getCityFromCoords(geoLocation.latitude, geoLocation.longitude);
      setCityInfo(info);
    }
  }, [geoLocation]);

  // 投稿を取得
  const fetchPosts = useCallback(async () => {
    if (!cityInfo) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        prefecture: cityInfo.prefecture,
        category: selectedCategory,
      });

      const res = await fetch(`/api/community/posts?${params}`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
    setLoading(false);
  }, [cityInfo, selectedCategory]);

  // いいねをトグル
  const toggleLike = async (postId: string) => {
    try {
      const res = await fetch('/api/community/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });

      if (res.ok) {
        const data = await res.json();
        setPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? { ...post, isLiked: data.isLiked, likeCount: data.likeCount }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // 投稿を作成
  const createPost = async () => {
    if (!postContent.trim() || !cityInfo) return;

    setPosting(true);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: postContent,
          category: postCategory,
          city: cityInfo.city,
          prefecture: cityInfo.prefecture,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPosts(prev => [data.post, ...prev]);
        setPostContent('');
        setPostCategory('other');
        setShowPostModal(false);
      } else {
        const data = await res.json();
        alert(data.error || '投稿に失敗しました');
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('投稿に失敗しました');
    }
    setPosting(false);
  };

  // 通報を送信
  const submitReport = async () => {
    if (!reportingPost || !reportReason) return;

    setReporting(true);
    try {
      const res = await fetch('/api/community/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: reportingPost,
          reason: reportReason,
          detail: reportDetail,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        setReportingPost(null);
        setReportReason('');
        setReportDetail('');
      } else {
        alert(data.error || '通報に失敗しました');
      }
    } catch (error) {
      console.error('Failed to report:', error);
      alert('通報に失敗しました');
    }
    setReporting(false);
  };

  // 時間表示
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'たった今';
    if (diffMin < 60) return `${diffMin}分前`;
    if (diffHour < 24) return `${diffHour}時間前`;
    if (diffDay < 7) return `${diffDay}日前`;
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated' && !isLocationReady) {
      requestLocation();
    }
  }, [status, router, isLocationReady, requestLocation]);

  useEffect(() => {
    if (cityInfo) {
      fetchPosts();
    }
  }, [cityInfo, selectedCategory, fetchPosts]);

  if (status === 'loading' || (loading && posts.length === 0)) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* ヘッダー */}
      <header className="header p-4 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
          <div className="flex items-center gap-3">
            {cityInfo && (
              <span className="text-sm text-dark-400">
                📍 {cityInfo.city}
              </span>
            )}
            <Link href="/dashboard" className="text-accent text-sm">
              戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-dark-50 mb-2">🐕 ご近所コミュニティ</h2>
          <p className="text-dark-400">
            {cityInfo?.city ? `${cityInfo.city}周辺の飼い主さんとつながろう` : '近所の飼い主さんとつながろう'}
          </p>
        </div>

        {/* 位置情報が必要な場合 */}
        {!isLocationReady && !locationLoading && (
          <LocationRequired
            onRequestLocation={requestLocation}
            onManualSelect={setManualLocation}
            loading={locationLoading}
            featureName="ご近所コミュニティ"
          />
        )}

        {/* 注意書き（常時表示） */}
        {isLocationReady && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 mb-6 text-center">
            <p className="text-sm text-accent">
              🐾 犬と飼い主にやさしい投稿をお願いします
            </p>
          </div>
        )}

        {/* カテゴリフィルター */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as PostCategory)}
              className={`flex items-center gap-1 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                selectedCategory === key
                  ? 'bg-accent text-dark-900'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* 投稿ボタン */}
        <Button
          onClick={() => setShowPostModal(true)}
          className="w-full mb-6"
        >
          <span className="mr-2">✏️</span>
          投稿する
        </Button>

        {/* タイムライン */}
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              {/* ヘッダー */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center text-xl">
                    🐕
                  </div>
                  <div>
                    <p className="font-medium text-dark-100 text-sm">
                      {post.anonymousName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-dark-500">
                      <span>{formatTime(post.createdAt)}</span>
                      <span>・</span>
                      <span>{CATEGORIES[post.category as PostCategory]?.emoji} {CATEGORIES[post.category as PostCategory]?.label}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setReportingPost(post.id)}
                  className="text-dark-500 hover:text-dark-300 text-xl"
                  title="通報"
                >
                  ⋮
                </button>
              </div>

              {/* 本文 */}
              <p className="text-dark-200 mb-4 whitespace-pre-wrap">
                {post.content}
              </p>

              {/* 画像（あれば） */}
              {post.imageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden">
                  <img
                    src={post.imageUrl}
                    alt="投稿画像"
                    className="w-full h-auto"
                  />
                </div>
              )}

              {/* アクション */}
              <div className="flex items-center gap-4 pt-3 border-t border-dark-700">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    post.isLiked
                      ? 'text-red-400'
                      : 'text-dark-400 hover:text-red-400'
                  }`}
                >
                  <span className="text-lg">{post.isLiked ? '❤️' : '🤍'}</span>
                  <span>{post.likeCount > 0 ? post.likeCount : '共感'}</span>
                </button>
              </div>
            </Card>
          ))}

          {posts.length === 0 && !loading && (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">🐾</span>
              <p className="text-dark-400 mb-4">
                まだ投稿がありません
              </p>
              <Button onClick={() => setShowPostModal(true)}>
                最初の投稿をする
              </Button>
            </div>
          )}
        </div>

        {/* 注意書き */}
        <div className="disclaimer mt-8">
          <p>
            ※ 投稿はすべて匿名です。個人情報（住所・電話番号等）の投稿は禁止されています。
            医療診断や治療に関するアドバイスは行わないでください。
            不適切な投稿は通報により非表示となります。
          </p>
        </div>
      </main>

      {/* 投稿モーダル */}
      {showPostModal && (
        <div
          className="fixed inset-0 bg-dark-900/90 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowPostModal(false)}
        >
          <div
            className="bg-dark-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-dark-100">新しい投稿</h3>
                <button
                  onClick={() => setShowPostModal(false)}
                  className="text-dark-400 hover:text-dark-200 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* カテゴリ選択 */}
              <div className="mb-4">
                <p className="text-sm text-dark-400 mb-2">カテゴリ</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORIES)
                    .filter(([key]) => key !== 'all')
                    .map(([key, cat]) => (
                      <button
                        key={key}
                        onClick={() => setPostCategory(key as PostCategory)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                          postCategory === key
                            ? 'bg-accent text-dark-900'
                            : 'bg-dark-700 text-dark-300'
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* 投稿内容 */}
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="今日のお散歩情報、おすすめスポット、しつけの悩みなど..."
                className="w-full h-32 bg-dark-700 border border-dark-600 rounded-xl p-4 text-dark-100 placeholder-dark-500 resize-none focus:outline-none focus:ring-2 focus:ring-accent mb-4"
                maxLength={500}
              />
              <p className="text-xs text-dark-500 text-right mb-4">
                {postContent.length}/500
              </p>

              {/* 注意 */}
              <div className="bg-dark-700/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-dark-400">
                  ⚠️ 個人情報（住所・電話番号・メールアドレス等）は投稿できません。
                  投稿は匿名で表示されます。
                </p>
              </div>

              <Button
                onClick={createPost}
                disabled={!postContent.trim() || posting}
                className="w-full"
              >
                {posting ? '投稿中...' : '投稿する'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 通報モーダル */}
      {reportingPost && (
        <div
          className="fixed inset-0 bg-dark-900/90 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setReportingPost(null)}
        >
          <div
            className="bg-dark-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-dark-100 mb-4">
                🚨 投稿を通報
              </h3>

              <p className="text-sm text-dark-400 mb-4">
                通報理由を選択してください
              </p>

              <div className="space-y-2 mb-4">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setReportReason(reason.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      reportReason === reason.id
                        ? 'bg-accent/20 text-accent border border-accent/50'
                        : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                    }`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>

              {reportReason === 'other' && (
                <textarea
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  placeholder="詳細を入力してください..."
                  className="w-full h-20 bg-dark-700 border border-dark-600 rounded-xl p-3 text-dark-100 placeholder-dark-500 resize-none focus:outline-none focus:ring-2 focus:ring-accent mb-4"
                />
              )}

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setReportingPost(null)}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={submitReport}
                  disabled={!reportReason || reporting}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {reporting ? '送信中...' : '通報する'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <Link href="/voice" className="bottom-nav-item">
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
