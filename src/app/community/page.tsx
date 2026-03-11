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
  bgColor: string;
}

const CATEGORIES: Record<PostCategory, CategoryInfo> = {
  all: { label: 'すべて', emoji: '📋', bgColor: 'bg-cream-100' },
  walk: { label: '散歩', emoji: '🚶', bgColor: 'bg-blue-100' },
  dogrun: { label: 'ドッグラン', emoji: '🐕', bgColor: 'bg-mint-100' },
  vet: { label: '動物病院', emoji: '🏥', bgColor: 'bg-mint-100' },
  trimming: { label: 'トリミング', emoji: '✂️', bgColor: 'bg-lavender-100' },
  lost: { label: '迷子・注意', emoji: '⚠️', bgColor: 'bg-peach-100' },
  training: { label: 'しつけ', emoji: '📚', bgColor: 'bg-cream-200' },
  other: { label: 'その他', emoji: '💬', bgColor: 'bg-pink-100' },
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

  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState<PostCategory>('other');
  const [posting, setPosting] = useState(false);

  const [reportingPost, setReportingPost] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetail, setReportDetail] = useState('');
  const [reporting, setReporting] = useState(false);

  // プレミアム状態チェック
  const isPremium = session?.user?.subscriptionStatus === 'active' || session?.user?.subscriptionStatus === 'trialing';

  useEffect(() => {
    if (geoLocation) {
      const info = getCityFromCoords(geoLocation.latitude, geoLocation.longitude);
      setCityInfo(info);
    }
  }, [geoLocation]);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce-soft">🐕</div>
          <div className="spinner mx-auto" />
        </div>
      </div>
    );
  }

  // プレミアム機能ゲート
  if (!isPremium) {
    return (
      <div className="min-h-screen pb-24">
        <header className="header p-4 sticky top-0 z-40">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐾</span>
              <Link href="/dashboard">
                <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
              </Link>
            </div>
            <Link href="/dashboard" className="text-accent font-medium text-sm">
              戻る
            </Link>
          </div>
        </header>
        <main className="max-w-2xl mx-auto p-4 py-6 flex items-center justify-center min-h-[70vh]">
          <Card className="text-center max-w-md">
            <div className="py-8">
              <span className="text-5xl mb-6 block">👑</span>
              <h2 className="text-xl font-bold text-brown-700 mb-4">
                プレミアム機能です
              </h2>
              <p className="text-brown-500 mb-6">
                ご近所コミュニティはプレミアム会員限定の機能です。
                アップグレードすると、周辺の飼い主さんと交流できます。
              </p>
              <Button onClick={() => router.push('/premium')}>
                プレミアムにアップグレード
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* ヘッダー */}
      <header className="header p-4 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <Link href="/dashboard">
              <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {cityInfo && (
              <span className="text-sm text-brown-400 bg-cream-100 px-2 py-1 rounded-full">
                📍 {cityInfo.city}
              </span>
            )}
            <Link href="/dashboard" className="text-accent font-medium text-sm">
              戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-3">
            <span className="text-3xl">🐕</span>
          </div>
          <h2 className="text-2xl font-bold text-brown-700 mb-2 flex items-center justify-center gap-2">
            ご近所コミュニティ
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-2 py-1 rounded-full font-bold">
              👑 Premium
            </span>
          </h2>
          <p className="text-brown-400">
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

        {/* 注意書き */}
        {isLocationReady && (
          <div className="bg-gradient-to-r from-pink-50 to-peach-50 border border-pink-200 rounded-2xl p-3 mb-6 text-center">
            <p className="text-sm text-pink-600">
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
              className={`flex items-center gap-1 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                selectedCategory === key
                  ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-sm'
                  : `${cat.bgColor} text-brown-600 hover:shadow-sm`
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
            <Card key={post.id} className="bg-white">
              {/* ヘッダー */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-xl">
                    🐕
                  </div>
                  <div>
                    <p className="font-medium text-brown-700 text-sm">
                      {post.anonymousName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-brown-400">
                      <span>{formatTime(post.createdAt)}</span>
                      <span>・</span>
                      <span className={`${CATEGORIES[post.category as PostCategory]?.bgColor} px-1.5 py-0.5 rounded`}>
                        {CATEGORIES[post.category as PostCategory]?.emoji} {CATEGORIES[post.category as PostCategory]?.label}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setReportingPost(post.id)}
                  className="text-brown-300 hover:text-brown-500 text-xl"
                  title="通報"
                >
                  ⋮
                </button>
              </div>

              {/* 本文 */}
              <p className="text-brown-600 mb-4 whitespace-pre-wrap">
                {post.content}
              </p>

              {/* 画像 */}
              {post.imageUrl && (
                <div className="mb-4 rounded-2xl overflow-hidden">
                  <img
                    src={post.imageUrl}
                    alt="投稿画像"
                    className="w-full h-auto"
                  />
                </div>
              )}

              {/* アクション */}
              <div className="flex items-center gap-4 pt-3 border-t border-cream-200">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-2 text-sm transition-all ${
                    post.isLiked
                      ? 'text-pink-500'
                      : 'text-brown-400 hover:text-pink-500'
                  }`}
                >
                  <span className={`text-lg transition-transform ${post.isLiked ? 'scale-110' : ''}`}>
                    {post.isLiked ? '❤️' : '🤍'}
                  </span>
                  <span>{post.likeCount > 0 ? post.likeCount : '共感'}</span>
                </button>
              </div>
            </Card>
          ))}

          {posts.length === 0 && !loading && (
            <div className="text-center py-12">
              <span className="text-5xl mb-4 block">🐾</span>
              <p className="text-brown-400 mb-4">
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
          className="fixed inset-0 bg-brown-900/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowPostModal(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto shadow-soft-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-brown-700">新しい投稿</h3>
                <button
                  onClick={() => setShowPostModal(false)}
                  className="text-brown-400 hover:text-brown-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* カテゴリ選択 */}
              <div className="mb-4">
                <p className="text-sm text-brown-500 mb-2">カテゴリ</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORIES)
                    .filter(([key]) => key !== 'all')
                    .map(([key, cat]) => (
                      <button
                        key={key}
                        onClick={() => setPostCategory(key as PostCategory)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
                          postCategory === key
                            ? 'bg-gradient-to-r from-accent to-accent-light text-white shadow-sm'
                            : `${cat.bgColor} text-brown-600`
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
                className="input-field h-32 resize-none mb-2"
                maxLength={500}
              />
              <p className="text-xs text-brown-400 text-right mb-4">
                {postContent.length}/500
              </p>

              {/* 注意 */}
              <div className="bg-cream-50 rounded-2xl p-3 mb-4">
                <p className="text-xs text-brown-400">
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
          className="fixed inset-0 bg-brown-900/30 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={() => setReportingPost(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-soft-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-brown-700 mb-4">
                🚨 投稿を通報
              </h3>

              <p className="text-sm text-brown-500 mb-4">
                通報理由を選択してください
              </p>

              <div className="space-y-2 mb-4">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setReportReason(reason.id)}
                    className={`w-full text-left px-4 py-3 rounded-2xl transition-all ${
                      reportReason === reason.id
                        ? 'bg-pink-50 text-pink-600 border-2 border-pink-300'
                        : 'bg-cream-50 text-brown-600 border-2 border-transparent hover:border-cream-200'
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
                  className="input-field h-20 resize-none mb-4"
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
                  className="flex-1 bg-gradient-to-r from-pink-500 to-pink-400"
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
