'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  date: string;
  source: string;
  emoji: string;
}

const CATEGORIES = ['すべて', '健康', 'トレンド', 'お出かけ', 'フード', 'しつけ', 'ニュース'];

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/news?category=${encodeURIComponent(selectedCategory)}`);
        const data = await res.json();
        if (data.news) {
          // 日付順にソート（新しい順）
          const sortedNews = data.news.sort((a: NewsItem, b: NewsItem) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setNews(sortedNews);
        }
      } catch (error) {
        console.error('Failed to fetch news:', error);
      }
      setLoading(false);
    };

    fetchNews();
  }, [selectedCategory]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="min-h-screen bg-warm-50 pb-20">
      {/* ヘッダー */}
      <header className="bg-white border-b border-warm-200 p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📰</span>
            <h1 className="text-xl font-bold text-primary-600">最新ニュース</h1>
          </div>
          <Link href="/dashboard" className="text-primary-600 text-sm">
            戻る
          </Link>
        </div>
      </header>

      {/* カテゴリフィルター */}
      <div className="bg-white border-b border-warm-100 py-3 sticky top-[57px] z-10">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-primary-500 text-white'
                    : 'bg-warm-100 text-gray-600 hover:bg-warm-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto p-4 py-6">
        {/* 犬種分布ランキング */}
        <Card className="mb-6 bg-gradient-to-r from-cream-50 to-peach-50 border-cream-200">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📊</span>
            <h2 className="font-bold text-primary-900">人気犬種ランキング 2024</h2>
          </div>
          <div className="space-y-3">
            {[
              { rank: 1, breed: 'トイプードル', percent: 23.5, emoji: '🥇' },
              { rank: 2, breed: 'チワワ', percent: 12.8, emoji: '🥈' },
              { rank: 3, breed: 'ミニチュアダックスフンド', percent: 10.2, emoji: '🥉' },
              { rank: 4, breed: '柴犬', percent: 8.7, emoji: '4' },
              { rank: 5, breed: 'ポメラニアン', percent: 6.4, emoji: '5' },
            ].map((item) => (
              <div key={item.rank} className="flex items-center gap-3">
                <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                  {item.emoji}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-primary-900">{item.breed}</span>
                    <span className="text-xs text-gray-500">{item.percent}%</span>
                  </div>
                  <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-peach-400 to-pink-400 rounded-full"
                      style={{ width: `${item.percent * 3}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">※ JKC登録頭数より</p>
        </Card>

        {/* ローディング */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4 animate-bounce">📰</div>
            <p className="text-gray-500">ニュースを取得中...</p>
          </div>
        )}

        {/* ニュース一覧 */}
        {!loading && (
          <div className="space-y-4">
            <h3 className="font-bold text-primary-900 flex items-center gap-2">
              <span>📅</span>
              最新記事（日付順）
            </h3>
            {news.map(item => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 bg-warm-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      {item.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-blue-600 font-medium">
                          {formatDate(item.date)}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {item.source}
                        </span>
                      </div>
                      <h3 className="font-bold text-primary-900 text-sm leading-tight mb-1 line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                        {item.summary}
                      </p>
                      <p className="text-xs text-blue-500 truncate flex items-center gap-1">
                        <span>🔗</span>
                        {item.url}
                      </p>
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        )}

        {!loading && news.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500">ニュースが見つかりませんでした</p>
          </div>
        )}

        {/* 注意書き */}
        <div className="disclaimer mt-8">
          <p>
            ※ 掲載している情報は一般的な内容であり、個々の状況に応じた専門的なアドバイスではありません。
            健康上の問題がある場合は、必ず獣医師にご相談ください。
          </p>
        </div>
      </main>
    </div>
  );
}
