import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// モックデータ: 犬種の登録数（実際はDBから集計）
const MOCK_BREED_STATS = [
  { breed: 'トイプードル', count: 15842, change: 127, percentage: 18.5 },
  { breed: 'チワワ', count: 12534, change: 89, percentage: 14.6 },
  { breed: '柴犬', count: 10245, change: 156, percentage: 12.0 },
  { breed: 'ミニチュアダックスフンド', count: 8976, change: 67, percentage: 10.5 },
  { breed: 'ポメラニアン', count: 7234, change: 78, percentage: 8.4 },
  { breed: 'フレンチブルドッグ', count: 6123, change: 112, percentage: 7.2 },
  { breed: 'ミニチュアシュナウザー', count: 4567, change: 45, percentage: 5.3 },
  { breed: 'ヨークシャーテリア', count: 4321, change: 34, percentage: 5.0 },
  { breed: 'シーズー', count: 3876, change: 28, percentage: 4.5 },
  { breed: 'マルチーズ', count: 3654, change: 41, percentage: 4.3 },
  { breed: 'ゴールデンレトリバー', count: 2987, change: 56, percentage: 3.5 },
  { breed: 'ラブラドールレトリバー', count: 2543, change: 48, percentage: 3.0 },
  { breed: 'コーギー', count: 1876, change: 32, percentage: 2.2 },
  { breed: 'ビーグル', count: 1234, change: 15, percentage: 1.4 },
  { breed: 'ボーダーコリー', count: 987, change: 23, percentage: 1.2 },
];

// 地域別データ
const MOCK_REGION_STATS = [
  { region: '関東', topBreed: 'トイプードル', totalCount: 35678 },
  { region: '関西', topBreed: '柴犬', totalCount: 18923 },
  { region: '中部', topBreed: 'チワワ', totalCount: 12456 },
  { region: '九州', topBreed: 'ミニチュアダックスフンド', totalCount: 8976 },
  { region: '北海道', topBreed: '柴犬', totalCount: 4532 },
  { region: '東北', topBreed: 'トイプードル', totalCount: 3876 },
  { region: '中国・四国', topBreed: 'チワワ', totalCount: 3234 },
];

// 年齢層別データ
const MOCK_AGE_STATS = [
  { ageGroup: '子犬（〜1歳）', percentage: 23 },
  { ageGroup: '若犬（1〜3歳）', percentage: 31 },
  { ageGroup: '成犬（3〜7歳）', percentage: 28 },
  { ageGroup: 'シニア（7歳〜）', percentage: 18 },
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 合計登録数
    const totalDogs = MOCK_BREED_STATS.reduce((sum, stat) => sum + stat.count, 0);

    // ランダムに少し変動させる（リアルタイム感を出す）
    const breedStats = MOCK_BREED_STATS.map(stat => ({
      ...stat,
      count: stat.count + Math.floor(Math.random() * 10),
      change: stat.change + Math.floor(Math.random() * 5 - 2),
    }));

    return NextResponse.json({
      totalDogs,
      lastUpdated: new Date().toISOString(),
      breedRanking: breedStats,
      regionStats: MOCK_REGION_STATS,
      ageStats: MOCK_AGE_STATS,
      trending: {
        breed: 'フレンチブルドッグ',
        growthRate: '+15.3%',
        reason: '愛らしい見た目と性格の良さで人気上昇中',
      },
    });
  } catch (error) {
    console.error('Breed stats error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
