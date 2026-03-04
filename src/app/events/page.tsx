'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type EventCategory = 'exhibition' | 'party' | 'meetup' | 'competition' | 'seminar' | 'other';

interface DogEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  venue: string;
  address?: string;
  city: string;
  prefecture: string;
  category: EventCategory;
  sourceUrl: string;
  sourceName: string;
  imageUrl?: string;
  fee?: string;
  targetBreed?: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  daysUntil: number;
}

interface CategoryInfo {
  label: string;
  emoji: string;
  color: string;
}

export default function EventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<DogEvent[]>([]);
  const [categories, setCategories] = useState<Record<EventCategory, CategoryInfo>>({} as Record<EventCategory, CategoryInfo>);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<DogEvent | null>(null);
  const [disclaimer, setDisclaimer] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    const fetchEvents = async () => {
      try {
        const url = selectedCategory === 'all'
          ? '/api/events/enhanced'
          : `/api/events/enhanced?category=${selectedCategory}`;
        const res = await fetch(url);
        const data = await res.json();
        setEvents(data.events || []);
        setCategories(data.categories || {});
        setDisclaimer(data.disclaimer || '');
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
      setLoading(false);
    };

    if (session) {
      fetchEvents();
    }
  }, [session, status, router, selectedCategory]);

  const formatDate = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', weekday: 'short' };
    const formatted = start.toLocaleDateString('ja-JP', options);

    if (endDate) {
      const end = new Date(endDate);
      const endFormatted = end.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
      return `${formatted} 〜 ${endFormatted}`;
    }
    return formatted;
  };

  const getStatusLabel = (status: string, daysUntil: number) => {
    if (status === 'ongoing') {
      return { text: '開催中', color: 'bg-green-500 text-white' };
    }
    if (daysUntil <= 7) {
      return { text: `あと${daysUntil}日`, color: 'bg-red-500 text-white' };
    }
    if (daysUntil <= 14) {
      return { text: '近日開催', color: 'bg-accent text-dark-900' };
    }
    return { text: `${Math.ceil(daysUntil / 7)}週間後`, color: 'bg-dark-600 text-dark-200' };
  };

  const openGoogleMaps = (venue: string, address?: string) => {
    const query = encodeURIComponent(address || venue);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  const openSourceUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* ヘッダー */}
      <header className="header p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
          <Link href="/dashboard" className="text-accent text-sm">
            戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-dark-50 mb-2">🎉 犬イベント情報</h2>
          <p className="text-dark-400">
            展示会、パピーパーティ、競技会など最新情報
          </p>
        </div>

        {/* 法務注意書き */}
        <div className="bg-dark-700/50 border border-dark-600 rounded-xl p-3 mb-6">
          <p className="text-xs text-dark-400 text-center">
            ℹ️ 本機能はイベント情報の「紹介」であり、主催ではありません。
            参加・購入は必ず公式サイトでご確認ください。
          </p>
        </div>

        {/* カテゴリフィルター */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-1 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-accent text-dark-900'
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            }`}
          >
            すべて
          </button>
          {Object.entries(categories).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as EventCategory)}
              className={`flex items-center gap-1 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
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

        {/* イベントリスト */}
        <div className="space-y-4">
          {events.map((event) => {
            const catInfo = categories[event.category];
            const statusLabel = getStatusLabel(event.status, event.daysUntil);

            return (
              <Card
                key={event.id}
                className="cursor-pointer hover:ring-1 hover:ring-accent/50 transition-all"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-start gap-4">
                  {/* 日付バッジ */}
                  <div className="flex-shrink-0 w-16 text-center">
                    <div className="bg-accent/20 rounded-lg p-2">
                      <p className={`text-xs px-1 py-0.5 rounded ${statusLabel.color} mb-1`}>
                        {statusLabel.text}
                      </p>
                      <p className="text-lg font-bold text-dark-100">
                        {new Date(event.startDate).getDate()}
                      </p>
                      <p className="text-xs text-dark-400">
                        {new Date(event.startDate).toLocaleDateString('ja-JP', { month: 'short' })}
                      </p>
                    </div>
                  </div>

                  {/* イベント情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {catInfo && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-dark-600 text-dark-300">
                          {catInfo.emoji} {catInfo.label}
                        </span>
                      )}
                      {event.targetBreed && (
                        <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded">
                          {event.targetBreed}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-dark-100 mb-1">{event.title}</h3>
                    <p className="text-sm text-dark-400 mb-2">
                      📍 {event.venue} ({event.city})
                    </p>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {event.fee && (
                        <span className="text-dark-300 bg-dark-700 px-2 py-0.5 rounded">
                          {event.fee}
                        </span>
                      )}
                    </div>

                    {/* 情報元（必須表示） */}
                    <div className="mt-3 pt-2 border-t border-dark-700">
                      <p className="text-xs text-dark-500">
                        情報元：
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openSourceUrl(event.sourceUrl);
                          }}
                          className="text-accent hover:underline ml-1"
                        >
                          {event.sourceName} ↗
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {events.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">🎉</span>
              <p className="text-dark-400">
                {selectedCategory === 'all'
                  ? '現在予定されているイベントはありません'
                  : 'このカテゴリのイベントはありません'}
              </p>
            </div>
          )}
        </div>

        {/* 注意書き */}
        <div className="disclaimer mt-8">
          <p>{disclaimer}</p>
        </div>
      </main>

      {/* イベント詳細モーダル */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-dark-900/90 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-dark-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* ヘッダー */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {(() => {
                      const statusLabel = getStatusLabel(selectedEvent.status, selectedEvent.daysUntil);
                      return (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusLabel.color}`}>
                          {statusLabel.text}
                        </span>
                      );
                    })()}
                    {categories[selectedEvent.category] && (
                      <span className="text-xs bg-dark-700 text-dark-300 px-2 py-0.5 rounded-full">
                        {categories[selectedEvent.category].emoji} {categories[selectedEvent.category].label}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-dark-100">{selectedEvent.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-dark-400 hover:text-dark-200 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* 日時・場所 */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-dark-200">
                  <span className="text-xl">📅</span>
                  <span>{formatDate(selectedEvent.startDate, selectedEvent.endDate)}</span>
                </div>
                <div className="flex items-center gap-3 text-dark-200">
                  <span className="text-xl">📍</span>
                  <div>
                    <p>{selectedEvent.venue}</p>
                    {selectedEvent.address && (
                      <p className="text-sm text-dark-400">{selectedEvent.address}</p>
                    )}
                    <p className="text-sm text-dark-500">{selectedEvent.prefecture} {selectedEvent.city}</p>
                  </div>
                </div>
              </div>

              {/* 詳細情報 */}
              <div className="bg-dark-700/50 rounded-xl p-4 mb-6">
                <p className="text-dark-200 text-sm leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>

              {/* 参加情報 */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {selectedEvent.fee && (
                  <div className="bg-dark-700/50 rounded-lg p-3">
                    <p className="text-xs text-dark-400 mb-1">参加費</p>
                    <p className="font-bold text-dark-100">{selectedEvent.fee}</p>
                  </div>
                )}
                {selectedEvent.targetBreed && (
                  <div className="bg-accent/10 rounded-lg p-3">
                    <p className="text-xs text-dark-400 mb-1">対象犬種</p>
                    <p className="font-bold text-accent">{selectedEvent.targetBreed}</p>
                  </div>
                )}
              </div>

              {/* 情報元（必須） */}
              <div className="bg-dark-700/30 rounded-xl p-4 mb-6">
                <p className="text-xs text-dark-400 mb-2">情報元</p>
                <button
                  onClick={() => openSourceUrl(selectedEvent.sourceUrl)}
                  className="flex items-center gap-2 text-accent hover:underline"
                >
                  <span>🔗</span>
                  <span>{selectedEvent.sourceName}</span>
                  <span>↗</span>
                </button>
                <p className="text-xs text-dark-500 mt-2">
                  ※ チケット購入・参加申込は上記公式サイトからお願いします
                </p>
              </div>

              {/* アクションボタン */}
              <div className="flex gap-3">
                <Button
                  onClick={() => openSourceUrl(selectedEvent.sourceUrl)}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-1 inline" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                  詳細を見る
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openGoogleMaps(selectedEvent.venue, selectedEvent.address)}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-1 inline" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  地図で見る
                </Button>
              </div>

              {/* 注意書き */}
              <div className="mt-4 text-xs text-dark-500 text-center">
                ※ 情報の正確性・開催可否は保証いたしません
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
