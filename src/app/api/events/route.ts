import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// イベントカテゴリー
type EventCategory = 'puppy_party' | 'training' | 'meetup' | 'health' | 'competition' | 'other';

interface DogEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  location: string;
  address: string;
  category: EventCategory;
  description: string;
  organizer: string;
  fee?: string;
  capacity?: string;
  targetBreed?: string;
  targetAge?: string;
  url?: string;
  imageUrl?: string;
  isNew: boolean;
}

// モックイベントデータ（実際の運用ではスクレイピングまたはAPI連携）
const MOCK_EVENTS: DogEvent[] = [
  {
    id: 'event-1',
    title: 'パピーパーティ in 代々木公園',
    date: '2026-03-15',
    location: '代々木公園ドッグラン',
    address: '東京都渋谷区代々木神園町2-1',
    category: 'puppy_party',
    description: '生後3〜6ヶ月のパピーと飼い主さんの交流会です。社会化トレーニングの一環として、他の犬や人に慣れる良い機会です。ドッグトレーナーも参加します。',
    organizer: 'わんわんパピーの会',
    fee: '無料',
    capacity: '先着20組',
    targetAge: '3〜6ヶ月',
    isNew: true,
  },
  {
    id: 'event-2',
    title: '初心者向けしつけ教室',
    date: '2026-03-20',
    location: 'ペットサロン Happy Dog',
    address: '東京都世田谷区三軒茶屋1-2-3',
    category: 'training',
    description: '初めて犬を飼う方向けの基本しつけ教室。「おすわり」「待て」などの基本コマンドを学びます。',
    organizer: 'Happy Dog トレーニングスクール',
    fee: '3,000円',
    capacity: '8組限定',
    isNew: true,
  },
  {
    id: 'event-3',
    title: '柴犬オーナーズミートアップ',
    date: '2026-03-22',
    location: '駒沢公園ドッグラン',
    address: '東京都世田谷区駒沢公園1-1',
    category: 'meetup',
    description: '柴犬オーナー限定の交流会。柴犬あるあるを語り合いましょう！写真撮影会も開催。',
    organizer: '柴犬らぶ倶楽部',
    fee: '500円（ドリンク付き）',
    targetBreed: '柴犬',
    isNew: true,
  },
  {
    id: 'event-4',
    title: '犬の健康相談会',
    date: '2026-03-25',
    location: 'ペットケアセンター渋谷',
    address: '東京都渋谷区宇田川町1-2-3',
    category: 'health',
    description: '獣医師による無料健康相談会。日頃の悩みや不安を直接相談できます。ワクチンや予防接種についての質問も歓迎。',
    organizer: 'ペットケアセンター渋谷',
    fee: '無料',
    isNew: false,
  },
  {
    id: 'event-5',
    title: 'ドッグダンス体験教室',
    date: '2026-03-28',
    endDate: '2026-03-29',
    location: 'わんわんスポーツアリーナ',
    address: '東京都品川区大井1-2-3',
    category: 'competition',
    description: 'ドッグダンスの体験ワークショップ。音楽に合わせて愛犬と一緒に踊る楽しさを体験！',
    organizer: 'ドッグスポーツジャパン',
    fee: '2,500円',
    capacity: '15組',
    isNew: false,
  },
  {
    id: 'event-6',
    title: 'トイプードル お散歩会',
    date: '2026-04-02',
    location: '井の頭公園',
    address: '東京都三鷹市井の頭4-1',
    category: 'meetup',
    description: 'トイプードルオーナー同士でのんびりお散歩。新しいお友達を作りましょう！',
    organizer: 'プードルファミリー東京',
    fee: '無料',
    targetBreed: 'トイプードル',
    isNew: false,
  },
  {
    id: 'event-7',
    title: 'シニア犬ケアセミナー',
    date: '2026-04-05',
    location: 'シニアドッグケアサポート',
    address: '東京都目黒区自由が丘2-3-4',
    category: 'health',
    description: '7歳以上のシニア犬の飼い主さん向けセミナー。介護のコツや食事管理について学びます。',
    organizer: 'シニアドッグケアサポート',
    fee: '1,500円',
    targetAge: '7歳以上',
    isNew: false,
  },
  {
    id: 'event-8',
    title: '春のドッグフェスタ 2026',
    date: '2026-04-10',
    endDate: '2026-04-12',
    location: 'お台場特設会場',
    address: '東京都港区台場1-1-1',
    category: 'other',
    description: '年に一度の大イベント！ペットグッズ販売、ドッグショー、しつけ相談など盛りだくさん。フォトブースも設置。',
    organizer: 'ドッグフェスタ実行委員会',
    fee: '入場料500円',
    isNew: false,
  },
];

// カテゴリーラベル
const CATEGORY_LABELS: Record<EventCategory, { label: string; emoji: string; color: string }> = {
  puppy_party: { label: 'パピーパーティ', emoji: '🐶', color: 'accent' },
  training: { label: 'しつけ教室', emoji: '📚', color: 'feature-voice' },
  meetup: { label: '交流会', emoji: '🤝', color: 'feature-walk' },
  health: { label: '健康・相談', emoji: '🏥', color: 'feature-health' },
  competition: { label: 'スポーツ・競技', emoji: '🏆', color: 'feature-food' },
  other: { label: 'その他', emoji: '🎉', color: 'dark-400' },
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as EventCategory | null;
    const limit = parseInt(searchParams.get('limit') || '10');

    // フィルタリング
    let events = [...MOCK_EVENTS];

    if (category) {
      events = events.filter(e => e.category === category);
    }

    // 日付でソート（近い順）
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 過去のイベントを除外
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    events = events.filter(e => new Date(e.date) >= today);

    // 制限
    events = events.slice(0, limit);

    return NextResponse.json({
      events,
      categories: CATEGORY_LABELS,
      total: events.length,
    });
  } catch (error) {
    console.error('Events fetch error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
