import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// モック動物病院データ（実際はGoogle Places API + 独自データベース）
const MOCK_VET_HOSPITALS = [
  {
    id: 'vet-1',
    name: 'さくら動物病院',
    address: '東京都渋谷区〇〇町1-2-3',
    phone: '03-1234-5678',
    distance: {
      meters: 350,
      walkMinutes: 5,
      carMinutes: 2,
    },
    rating: 4.5,
    reviewCount: 128,
    features: {
      nightAvailable: false,
      holidayAvailable: true,
      emergencyAvailable: false,
      largeDogFriendly: true,
      reservationRequired: false,
      walkInOk: true,
      parking: true,
      creditCard: true,
    },
    specialties: ['一般診療', '予防接種', '皮膚科', '歯科'],
    openingHours: {
      weekday: '9:00-19:00',
      saturday: '9:00-17:00',
      sunday: '休診',
    },
    reviewSummary: {
      goodPoints: [
        '先生がとても丁寧で、説明がわかりやすい',
        '待ち時間が比較的短く、予約なしでも診てもらえる',
        '駐車場が広くて便利',
      ],
      cautionPoints: [
        '土曜日は混雑することが多い',
        '夜間・緊急対応はしていない',
      ],
      recommendedFor: [
        '初めて犬を飼った方（丁寧な説明）',
        '通院頻度が高い方（予約不要）',
        '大型犬の飼い主さん',
      ],
    },
  },
  {
    id: 'vet-2',
    name: 'ペットクリニック青山',
    address: '東京都港区青山1-1-1',
    phone: '03-2345-6789',
    distance: {
      meters: 800,
      walkMinutes: 11,
      carMinutes: 4,
    },
    rating: 4.8,
    reviewCount: 256,
    features: {
      nightAvailable: true,
      holidayAvailable: true,
      emergencyAvailable: true,
      largeDogFriendly: true,
      reservationRequired: true,
      walkInOk: false,
      parking: true,
      creditCard: true,
    },
    specialties: ['一般診療', '外科', '整形外科', '眼科', '救急'],
    openingHours: {
      weekday: '9:00-21:00',
      saturday: '9:00-21:00',
      sunday: '10:00-18:00',
    },
    reviewSummary: {
      goodPoints: [
        '夜間・休日も診療してくれるので安心',
        '設備が充実していて、精密検査もできる',
        '専門性の高い獣医師が複数在籍',
      ],
      cautionPoints: [
        '要予約で、当日予約は取りにくいことも',
        '診療費がやや高め（設備・夜間対応のため）',
      ],
      recommendedFor: [
        '緊急時の備えが欲しい方',
        '高齢犬・持病のある犬の飼い主さん',
        '専門的な治療が必要な方',
      ],
    },
  },
  {
    id: 'vet-3',
    name: 'わんにゃんクリニック',
    address: '東京都渋谷区代々木2-3-4',
    phone: '03-3456-7890',
    distance: {
      meters: 1200,
      walkMinutes: 16,
      carMinutes: 5,
    },
    rating: 4.2,
    reviewCount: 89,
    features: {
      nightAvailable: false,
      holidayAvailable: false,
      emergencyAvailable: false,
      largeDogFriendly: false,
      reservationRequired: false,
      walkInOk: true,
      parking: false,
      creditCard: true,
    },
    specialties: ['一般診療', '予防接種', '健康診断'],
    openingHours: {
      weekday: '10:00-18:00',
      saturday: '10:00-15:00',
      sunday: '休診',
    },
    reviewSummary: {
      goodPoints: [
        '診療費がリーズナブル',
        'アットホームな雰囲気で犬が緊張しにくい',
        '予防接種や健康診断に最適',
      ],
      cautionPoints: [
        '小型犬向けの設備（大型犬は要相談）',
        '駐車場がないので公共交通機関推奨',
      ],
      recommendedFor: [
        '小型犬の飼い主さん',
        '予防接種メインで通いたい方',
        '費用を抑えたい方',
      ],
    },
  },
  {
    id: 'vet-4',
    name: '24時間どうぶつ救急センター',
    address: '東京都新宿区西新宿3-5-6',
    phone: '03-4567-8901',
    distance: {
      meters: 2500,
      walkMinutes: 33,
      carMinutes: 8,
    },
    rating: 4.6,
    reviewCount: 312,
    features: {
      nightAvailable: true,
      holidayAvailable: true,
      emergencyAvailable: true,
      largeDogFriendly: true,
      reservationRequired: false,
      walkInOk: true,
      parking: true,
      creditCard: true,
    },
    specialties: ['救急', '外科', '集中治療', 'CT/MRI'],
    openingHours: {
      weekday: '24時間',
      saturday: '24時間',
      sunday: '24時間',
    },
    reviewSummary: {
      goodPoints: [
        '24時間いつでも対応してくれる',
        '高度医療設備（CT、MRI）が整っている',
        '重症でも対応できる体制',
      ],
      cautionPoints: [
        '救急料金がかかる（夜間・休日は割増）',
        'かかりつけ医としては使いにくい',
      ],
      recommendedFor: [
        '緊急時の備えとして知っておきたい方',
        '重篤な症状がある場合',
        '他院からの紹介で高度治療が必要な場合',
      ],
    },
  },
  {
    id: 'vet-5',
    name: 'グリーン動物病院',
    address: '東京都目黒区中目黒1-2-3',
    phone: '03-5678-9012',
    distance: {
      meters: 1800,
      walkMinutes: 24,
      carMinutes: 7,
    },
    rating: 4.4,
    reviewCount: 156,
    features: {
      nightAvailable: false,
      holidayAvailable: true,
      emergencyAvailable: false,
      largeDogFriendly: true,
      reservationRequired: true,
      walkInOk: false,
      parking: true,
      creditCard: true,
    },
    specialties: ['一般診療', '皮膚科', 'アレルギー', '漢方治療'],
    openingHours: {
      weekday: '9:30-18:30',
      saturday: '9:30-17:00',
      sunday: '10:00-14:00',
    },
    reviewSummary: {
      goodPoints: [
        '皮膚科・アレルギー治療に定評がある',
        '漢方治療など自然療法も取り入れている',
        '完全予約制で待ち時間が少ない',
      ],
      cautionPoints: [
        '完全予約制なので急な受診は難しい',
        '人気があるため予約が取りにくいことも',
      ],
      recommendedFor: [
        '皮膚トラブルで悩んでいる方',
        'アレルギー持ちの犬の飼い主さん',
        '自然療法に興味がある方',
      ],
    },
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    let hospitals = MOCK_VET_HOSPITALS;

    // 位置情報がある場合は距離をランダムに調整（デモ用）
    if (lat && lng) {
      hospitals = hospitals.map((hospital) => {
        const variation = 0.7 + Math.random() * 0.6;
        return {
          ...hospital,
          distance: {
            meters: Math.round(hospital.distance.meters * variation),
            walkMinutes: Math.round(hospital.distance.walkMinutes * variation),
            carMinutes: Math.round(hospital.distance.carMinutes * variation),
          },
        };
      });
    }

    // 距離順にソート
    hospitals.sort((a, b) => a.distance.meters - b.distance.meters);

    return NextResponse.json({ hospitals });
  } catch (error) {
    console.error('Vet API error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
