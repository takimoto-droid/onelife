import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// 動物病院モックデータ（実際はGoogle Places APIを使用）
const MOCK_VET_CLINICS = [
  {
    id: 'vet-1',
    name: '代々木動物病院',
    address: '東京都渋谷区代々木1-2-3',
    phone: '03-1234-5678',
    latitude: 35.6836,
    longitude: 139.7022,
    rating: 4.5,
    reviewCount: 128,
    businessHours: {
      mon: '9:00-19:00',
      tue: '9:00-19:00',
      wed: '9:00-19:00',
      thu: '9:00-19:00',
      fri: '9:00-19:00',
      sat: '9:00-17:00',
      sun: '休診',
    },
    distance: 0.3,
  },
  {
    id: 'vet-2',
    name: '渋谷ペットクリニック',
    address: '東京都渋谷区神南1-4-5',
    phone: '03-2345-6789',
    latitude: 35.6625,
    longitude: 139.6997,
    rating: 4.8,
    reviewCount: 256,
    businessHours: {
      mon: '10:00-20:00',
      tue: '10:00-20:00',
      wed: '休診',
      thu: '10:00-20:00',
      fri: '10:00-20:00',
      sat: '10:00-18:00',
      sun: '10:00-15:00',
    },
    distance: 0.8,
  },
  {
    id: 'vet-3',
    name: 'さくら動物病院',
    address: '東京都渋谷区恵比寿2-3-4',
    phone: '03-3456-7890',
    latitude: 35.6467,
    longitude: 139.7103,
    rating: 4.2,
    reviewCount: 89,
    businessHours: {
      mon: '9:30-18:30',
      tue: '9:30-18:30',
      wed: '9:30-18:30',
      thu: '休診',
      fri: '9:30-18:30',
      sat: '9:30-16:00',
      sun: '休診',
    },
    distance: 1.2,
  },
  {
    id: 'vet-4',
    name: '目黒アニマルホスピタル',
    address: '東京都目黒区中目黒3-5-6',
    phone: '03-4567-8901',
    latitude: 35.6442,
    longitude: 139.6986,
    rating: 4.6,
    reviewCount: 312,
    businessHours: {
      mon: '8:00-21:00',
      tue: '8:00-21:00',
      wed: '8:00-21:00',
      thu: '8:00-21:00',
      fri: '8:00-21:00',
      sat: '9:00-19:00',
      sun: '9:00-17:00',
    },
    distance: 1.5,
  },
  {
    id: 'vet-5',
    name: '新宿どうぶつ病院',
    address: '東京都新宿区西新宿7-8-9',
    phone: '03-5678-9012',
    latitude: 35.6938,
    longitude: 139.6917,
    rating: 4.3,
    reviewCount: 178,
    businessHours: {
      mon: '9:00-18:00',
      tue: '9:00-18:00',
      wed: '9:00-18:00',
      thu: '9:00-18:00',
      fri: '9:00-18:00',
      sat: '9:00-15:00',
      sun: '休診',
    },
    distance: 2.1,
  },
  {
    id: 'vet-6',
    name: 'はな動物クリニック',
    address: '東京都世田谷区三軒茶屋1-2-3',
    phone: '03-6789-0123',
    latitude: 35.6437,
    longitude: 139.6702,
    rating: 4.7,
    reviewCount: 203,
    businessHours: {
      mon: '9:00-19:00',
      tue: '9:00-19:00',
      wed: '休診',
      thu: '9:00-19:00',
      fri: '9:00-19:00',
      sat: '9:00-17:00',
      sun: '10:00-14:00',
    },
    distance: 2.8,
  },
];

// Google Maps URLを生成
function generateGoogleMapsUrl(name: string, address: string): string {
  const query = encodeURIComponent(`${name} ${address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '35.6812');
    const lng = parseFloat(searchParams.get('lng') || '139.7671');
    const radius = parseFloat(searchParams.get('radius') || '5'); // km

    // モックデータに距離を計算して追加
    const clinicsWithDistance = MOCK_VET_CLINICS.map(clinic => {
      // 簡易的な距離計算（Haversine formula の簡略版）
      const dLat = (clinic.latitude - lat) * 111;
      const dLng = (clinic.longitude - lng) * 111 * Math.cos(lat * Math.PI / 180);
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);

      return {
        ...clinic,
        distance: Math.round(distance * 10) / 10,
        googleMapsUrl: generateGoogleMapsUrl(clinic.name, clinic.address),
      };
    });

    // 距離でフィルタリング・ソート
    const filteredClinics = clinicsWithDistance
      .filter(c => c.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      clinics: filteredClinics,
      total: filteredClinics.length,
    });
  } catch (error) {
    console.error('Vet search error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
