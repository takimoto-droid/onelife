import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { InsuranceRecommendation } from '@/types';

// モック保険データ
const MOCK_INSURANCES: InsuranceRecommendation[] = [
  {
    name: 'わんにゃんプラン ライト',
    company: 'ペット保険A社',
    monthlyPrice: 1500,
    coveragePercent: 50,
    features: [
      '通院・入院・手術をカバー',
      '24時間獣医師相談サービス付き',
      '待機期間が短い',
    ],
    reason: '初めてペット保険を検討される方にぴったりの、バランスの取れたプランです。',
  },
  {
    name: 'しっかり補償プラン',
    company: 'ペット保険B社',
    monthlyPrice: 2800,
    coveragePercent: 70,
    features: [
      '補償割合が高い70%',
      '歯科治療も補償対象',
      '多頭飼い割引あり',
    ],
    reason: '万が一の時の負担を大きく軽減できる、安心の高補償プランです。',
  },
  {
    name: 'エコノミープラン',
    company: 'ペット保険C社',
    monthlyPrice: 980,
    coveragePercent: 50,
    features: [
      '手術・入院に特化',
      '保険料がお手頃',
      'オンライン手続きで簡単',
    ],
    reason: '保険料を抑えながら、大きな出費に備えたい方におすすめです。',
  },
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 犬の情報を取得
    const dogs = await prisma.dog.findMany({
      where: { userId: session.user.id },
    });

    const dog = dogs[0];

    // 犬の情報に基づいてレコメンドをカスタマイズ（モック）
    let recommendations = [...MOCK_INSURANCES];

    if (dog) {
      // 犬種による調整（実際のアプリでは犬種別のリスクを考慮）
      if (dog.breed) {
        recommendations = recommendations.map((r) => ({
          ...r,
          reason: `${dog.name}ちゃん（${dog.breed}）にも${r.reason}`,
        }));
      }

      // 年齢による調整
      if (dog.birthDate) {
        const ageInYears =
          (new Date().getTime() - new Date(dog.birthDate).getTime()) /
          (1000 * 60 * 60 * 24 * 365);

        if (ageInYears < 1) {
          // 子犬の場合
          recommendations[0].reason =
            '子犬の時期は病気やケガのリスクが高いため、早めの加入がおすすめです。';
        } else if (ageInYears > 7) {
          // シニアの場合
          recommendations[1].reason =
            'シニア期は医療費が高くなりやすいため、高補償プランが安心です。';
        }
      }
    }

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Insurance API error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
