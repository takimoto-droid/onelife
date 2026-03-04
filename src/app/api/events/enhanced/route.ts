import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// イベントカテゴリー
type EventCategory = 'exhibition' | 'party' | 'meetup' | 'competition' | 'seminar' | 'other';

interface EnhancedDogEvent {
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

// カテゴリー情報
const CATEGORY_INFO: Record<EventCategory, { label: string; emoji: string; color: string }> = {
  exhibition: { label: '展示会', emoji: '🏆', color: 'feature-food' },
  party: { label: 'パピーパーティ', emoji: '🐶', color: 'accent' },
  meetup: { label: '交流会', emoji: '🤝', color: 'feature-walk' },
  competition: { label: '競技会', emoji: '🥇', color: 'feature-voice' },
  seminar: { label: 'セミナー', emoji: '📚', color: 'feature-health' },
  other: { label: 'その他', emoji: '🎉', color: 'dark-400' },
};

// モックイベントデータ（情報元URL付き）
const MOCK_EVENTS: EnhancedDogEvent[] = [
  {
    id: 'evt-1',
    title: 'インターペット2026 東京',
    description: '日本最大級のペット総合展示会。最新のペットグッズ、フード、サービスが一堂に集結。愛犬同伴可能エリアあり。',
    startDate: '2026-03-28',
    endDate: '2026-03-31',
    venue: '東京ビッグサイト',
    address: '東京都江東区有明3-11-1',
    city: '江東区',
    prefecture: '東京都',
    category: 'exhibition',
    sourceUrl: 'https://interpets.jp/',
    sourceName: 'インターペット公式サイト',
    imageUrl: 'https://example.com/interpets.jpg',
    fee: '前売り1,500円 / 当日2,000円',
    status: 'upcoming',
    daysUntil: 23,
  },
  {
    id: 'evt-2',
    title: 'JKC全犬種展覧会 関東ブロック',
    description: 'ジャパンケネルクラブ主催の全犬種展覧会。全国から選りすぐりの純血種犬が集まります。見学無料。',
    startDate: '2026-04-12',
    endDate: '2026-04-13',
    venue: '所沢航空記念公園',
    address: '埼玉県所沢市並木1-13',
    city: '所沢市',
    prefecture: '埼玉県',
    category: 'exhibition',
    sourceUrl: 'https://www.jkc.or.jp/',
    sourceName: 'ジャパンケネルクラブ',
    fee: '見学無料',
    status: 'upcoming',
    daysUntil: 38,
  },
  {
    id: 'evt-3',
    title: 'パピーパーティ in 代々木公園',
    description: '生後3〜6ヶ月のパピー限定交流会。ドッグトレーナー監修のもと、安全に社会化トレーニングができます。',
    startDate: '2026-03-15',
    venue: '代々木公園ドッグラン',
    address: '東京都渋谷区代々木神園町2-1',
    city: '渋谷区',
    prefecture: '東京都',
    category: 'party',
    sourceUrl: 'https://example.com/puppy-party',
    sourceName: 'わんわんパピーの会',
    fee: '無料（要事前予約）',
    targetBreed: '全犬種OK',
    status: 'upcoming',
    daysUntil: 10,
  },
  {
    id: 'evt-4',
    title: 'アジリティ体験会＆競技会',
    description: 'ドッグスポーツの花形、アジリティを体験できるイベント。初心者向け体験コースと競技会を同時開催。',
    startDate: '2026-03-22',
    venue: 'わんわんランド多摩',
    address: '東京都稲城市向陽台6-1-1',
    city: '稲城市',
    prefecture: '東京都',
    category: 'competition',
    sourceUrl: 'https://example.com/agility',
    sourceName: 'ドッグスポーツジャパン',
    fee: '体験1,500円 / 競技参加3,000円',
    status: 'upcoming',
    daysUntil: 17,
  },
  {
    id: 'evt-5',
    title: 'シニア犬ケアセミナー',
    description: '獣医師と動物看護師による、7歳以上のシニア犬の飼い主向けセミナー。介護・食事・運動のポイントを解説。',
    startDate: '2026-03-18',
    venue: 'ペットケアセンター渋谷',
    address: '東京都渋谷区宇田川町1-2-3',
    city: '渋谷区',
    prefecture: '東京都',
    category: 'seminar',
    sourceUrl: 'https://example.com/senior-dog',
    sourceName: 'ペットケアセンター渋谷',
    fee: '2,000円（資料代込み）',
    status: 'upcoming',
    daysUntil: 13,
  },
  {
    id: 'evt-6',
    title: '柴犬オーナーズミートアップ',
    description: '柴犬オーナー限定の交流イベント。柴犬あるあるを語り合い、愛犬の写真撮影会も開催します。',
    startDate: '2026-03-20',
    venue: '駒沢オリンピック公園',
    address: '東京都世田谷区駒沢公園1-1',
    city: '世田谷区',
    prefecture: '東京都',
    category: 'meetup',
    sourceUrl: 'https://example.com/shiba-meetup',
    sourceName: '柴犬らぶ倶楽部',
    fee: '500円（ドリンク付き）',
    targetBreed: '柴犬限定',
    status: 'upcoming',
    daysUntil: 15,
  },
  {
    id: 'evt-7',
    title: 'ペット博2026 横浜',
    description: '関東最大級のペットイベント。ペット用品の販売、ステージショー、トリミングコンテストなど盛りだくさん。',
    startDate: '2026-05-03',
    endDate: '2026-05-05',
    venue: 'パシフィコ横浜',
    address: '神奈川県横浜市西区みなとみらい1-1-1',
    city: '横浜市',
    prefecture: '神奈川県',
    category: 'exhibition',
    sourceUrl: 'https://example.com/pet-expo',
    sourceName: 'ペット博実行委員会',
    fee: '当日1,800円',
    status: 'upcoming',
    daysUntil: 59,
  },
  {
    id: 'evt-8',
    title: 'ドッグダンス発表会＆体験',
    description: '音楽に合わせて愛犬と踊るドッグダンス。発表会の見学と初心者向け体験レッスンを開催。',
    startDate: '2026-04-06',
    venue: 'ドッグトレーニングスタジオK9',
    address: '東京都品川区大井1-2-3',
    city: '品川区',
    prefecture: '東京都',
    category: 'competition',
    sourceUrl: 'https://example.com/dog-dance',
    sourceName: 'ドッグダンスアカデミー',
    fee: '見学無料 / 体験2,500円',
    status: 'upcoming',
    daysUntil: 32,
  },
];

// イベントステータスを計算
function calculateStatus(startDate: string, endDate?: string): 'upcoming' | 'ongoing' | 'ended' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  if (today < start) return 'upcoming';
  if (today > end) return 'ended';
  return 'ongoing';
}

// 開催までの日数を計算
function calculateDaysUntil(startDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const diffTime = start.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as EventCategory | null;
    const prefecture = searchParams.get('prefecture');
    const limit = parseInt(searchParams.get('limit') || '20');

    // イベントにステータスと日数を追加
    let events = MOCK_EVENTS.map(event => ({
      ...event,
      status: calculateStatus(event.startDate, event.endDate),
      daysUntil: calculateDaysUntil(event.startDate),
    }));

    // 終了したイベントを除外
    events = events.filter(e => e.status !== 'ended');

    // フィルタリング
    if (category) {
      events = events.filter(e => e.category === category);
    }
    if (prefecture) {
      events = events.filter(e => e.prefecture === prefecture);
    }

    // 日付でソート（近い順）
    events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    // 制限
    events = events.slice(0, limit);

    return NextResponse.json({
      events,
      categories: CATEGORY_INFO,
      total: events.length,
      disclaimer: '※ 本機能はイベント情報の「紹介」であり、主催ではありません。情報の正確性・開催可否は保証いたしません。参加・購入は必ず公式サイトでご確認ください。',
    });
  } catch (error) {
    console.error('Events fetch error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
