import { NextResponse } from 'next/server';

// Google Custom Search APIを使用してニュースを取得
// 環境変数: GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_ID

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  date: string;
  source: string;
  emoji: string;
}

// カテゴリごとの検索キーワード
const CATEGORY_KEYWORDS: Record<string, string> = {
  'すべて': '犬 ニュース',
  '健康': '犬 健康 病気 獣医',
  'トレンド': '犬 人気 トレンド ランキング',
  'お出かけ': '犬 お出かけ ドッグラン 旅行',
  'フード': '犬 フード ごはん 食事',
  'しつけ': '犬 しつけ トレーニング',
  'ニュース': '犬 ペット ニュース 最新',
};

// 絵文字マッピング
function getEmojiForTitle(title: string): string {
  if (title.includes('健康') || title.includes('病気') || title.includes('獣医')) return '🏥';
  if (title.includes('フード') || title.includes('ごはん') || title.includes('食')) return '🍖';
  if (title.includes('散歩') || title.includes('お出かけ')) return '🚶';
  if (title.includes('しつけ') || title.includes('トレーニング')) return '📚';
  if (title.includes('ランキング') || title.includes('人気')) return '🏆';
  if (title.includes('保険')) return '🛡️';
  return '🐕';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'すべて';

  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  // Google APIが設定されている場合は実際のニュースを取得
  if (apiKey && searchEngineId) {
    try {
      const query = encodeURIComponent(CATEGORY_KEYWORDS[category] || '犬 ニュース');
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${query}&num=10&sort=date&dateRestrict=m1`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.items) {
        const news: NewsItem[] = data.items.map((item: any, index: number) => ({
          id: `news-${index}`,
          title: item.title,
          summary: item.snippet || '',
          url: item.link,
          date: item.pagemap?.metatags?.[0]?.['article:published_time'] || new Date().toISOString().split('T')[0],
          source: new URL(item.link).hostname.replace('www.', ''),
          emoji: getEmojiForTitle(item.title),
        }));

        return NextResponse.json({ news, source: 'google' });
      }
    } catch (error) {
      console.error('Google API error:', error);
    }
  }

  // フォールバック: モックデータ（実際のニュースサイトのURLを含む）
  const mockNews: NewsItem[] = [
    {
      id: '1',
      title: '【2024年最新】人気犬種ランキングTOP10',
      summary: 'ジャパンケネルクラブ（JKC）の登録頭数をもとに、2024年の人気犬種ランキングを発表。',
      url: 'https://www.jkc.or.jp/',
      date: '2024-03-28',
      source: 'JKC',
      emoji: '🏆',
    },
    {
      id: '2',
      title: '犬の熱中症対策｜獣医師が教える予防と応急処置',
      summary: '気温が上がる季節に備えて、愛犬の熱中症対策について獣医師が詳しく解説します。',
      url: 'https://www.anicom-sompo.co.jp/doubutsu_pedia/',
      date: '2024-03-25',
      source: 'アニコム',
      emoji: '☀️',
    },
    {
      id: '3',
      title: 'ペットフードの選び方ガイド2024',
      summary: '愛犬の年齢や体質に合わせた最適なフード選びのポイントを専門家が解説。',
      url: 'https://petfood.or.jp/',
      date: '2024-03-22',
      source: 'ペットフード協会',
      emoji: '🍖',
    },
    {
      id: '4',
      title: '全国のドッグラン特集｜愛犬と楽しむお出かけスポット',
      summary: '全国各地のおすすめドッグランを紹介。施設情報や利用料金も掲載。',
      url: 'https://www.jalan.net/kankou/g2_S7/',
      date: '2024-03-20',
      source: 'じゃらん',
      emoji: '🏃',
    },
    {
      id: '5',
      title: '子犬のしつけ基本ガイド｜トイレトレーニングから始めよう',
      summary: '初めて犬を飼う方向けに、基本的なしつけ方法をステップバイステップで解説。',
      url: 'https://www.hills.co.jp/dog-care',
      date: '2024-03-18',
      source: 'ヒルズ',
      emoji: '📚',
    },
    {
      id: '6',
      title: '犬の花粉症｜症状と対策について獣医師が解説',
      summary: '犬も花粉症になる？くしゃみや目のかゆみなど、症状と対策を詳しく解説。',
      url: 'https://sippo.asahi.com/',
      date: '2024-03-15',
      source: 'sippo',
      emoji: '🤧',
    },
    {
      id: '7',
      title: 'ペット保険の選び方｜加入前に知っておきたいポイント',
      summary: '補償内容や保険料の比較ポイントなど、ペット保険選びに役立つ情報をまとめました。',
      url: 'https://hoken.kakaku.com/pet/',
      date: '2024-03-12',
      source: '価格.com',
      emoji: '🛡️',
    },
    {
      id: '8',
      title: '犬との暮らしに関する調査結果2024',
      summary: '犬を飼っている家庭の生活実態調査。飼育費用や世話の時間など最新データを公開。',
      url: 'https://www.petfood.or.jp/',
      date: '2024-03-10',
      source: 'ペットフード協会',
      emoji: '📊',
    },
  ];

  // カテゴリでフィルタリング
  let filteredNews = mockNews;
  if (category !== 'すべて') {
    const keywords = CATEGORY_KEYWORDS[category]?.split(' ') || [];
    filteredNews = mockNews.filter(item =>
      keywords.some(keyword =>
        item.title.includes(keyword) || item.summary.includes(keyword)
      )
    );
    // フィルタ結果が少なすぎる場合は全部返す
    if (filteredNews.length < 3) {
      filteredNews = mockNews;
    }
  }

  return NextResponse.json({ news: filteredNews, source: 'mock' });
}
