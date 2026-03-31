'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  emoji: string;
  url?: string;
}

// モックニュースデータ
const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: '夏の散歩は要注意！熱中症対策のポイント',
    summary: '気温が高くなる季節、愛犬との散歩で気をつけたい熱中症対策について解説します。',
    category: '健康',
    date: '2024-03-28',
    emoji: '☀️',
  },
  {
    id: '2',
    title: '2024年人気犬種ランキング発表',
    summary: 'トイプードルが15年連続1位！注目の犬種や飼育傾向をご紹介。',
    category: 'トレンド',
    date: '2024-03-25',
    emoji: '🏆',
  },
  {
    id: '3',
    title: '犬の歯磨きが大切な理由と正しいやり方',
    summary: '歯周病予防は愛犬の健康寿命を延ばします。獣医師監修の歯磨きガイド。',
    category: '健康',
    date: '2024-03-22',
    emoji: '🦷',
  },
  {
    id: '4',
    title: '春のお出かけスポット特集',
    summary: 'ワンちゃんと一緒に楽しめる全国のおすすめスポットをご紹介！',
    category: 'お出かけ',
    date: '2024-03-20',
    emoji: '🌸',
  },
  {
    id: '5',
    title: 'ペットフードの選び方ガイド',
    summary: '年齢や体質に合わせたフード選びのポイントを専門家が解説。',
    category: 'フード',
    date: '2024-03-18',
    emoji: '🍖',
  },
  {
    id: '6',
    title: '犬の花粉症対策',
    summary: '犬も花粉症になる？症状と対策、病院に行くタイミングを解説。',
    category: '健康',
    date: '2024-03-15',
    emoji: '🤧',
  },
  {
    id: '7',
    title: '初心者向け！子犬のしつけ基本ガイド',
    summary: 'トイレトレーニングからお座りまで、基本のしつけ方法をわかりやすく解説。',
    category: 'しつけ',
    date: '2024-03-12',
    emoji: '📚',
  },
  {
    id: '8',
    title: 'ペット保険の加入率が過去最高に',
    summary: 'ペット保険市場が拡大中。加入を検討する際のポイントとは？',
    category: 'ニュース',
    date: '2024-03-10',
    emoji: '🛡️',
  },
];

const CATEGORIES = ['すべて', '健康', 'トレンド', 'お出かけ', 'フード', 'しつけ', 'ニュース'];

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [news, setNews] = useState<NewsItem[]>(MOCK_NEWS);

  useEffect(() => {
    if (selectedCategory === 'すべて') {
      setNews(MOCK_NEWS);
    } else {
      setNews(MOCK_NEWS.filter(item => item.category === selectedCategory));
    }
  }, [selectedCategory]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
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
        {/* お知らせバナー */}
        <Card className="mb-6 bg-gradient-to-r from-lavender-50 to-pink-50 border-lavender-200">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐕</span>
            <div>
              <p className="font-bold text-primary-900">ワンちゃんの最新情報をお届け</p>
              <p className="text-sm text-gray-600">健康・しつけ・お出かけ情報など</p>
            </div>
          </div>
        </Card>

        {/* ニュース一覧 */}
        <div className="space-y-4">
          {news.map(item => (
            <Card
              key={item.id}
              className="hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
            >
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-warm-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(item.date)}
                    </span>
                  </div>
                  <h3 className="font-bold text-primary-900 text-sm leading-tight mb-1 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {item.summary}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {news.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500">このカテゴリの記事はありません</p>
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
