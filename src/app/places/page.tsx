'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface VetFeatures {
  nightAvailable: boolean;
  holidayAvailable: boolean;
  emergencyAvailable: boolean;
  largeDogFriendly: boolean;
  reservationRequired: boolean;
  walkInOk: boolean;
  parking: boolean;
  creditCard: boolean;
}

interface ReviewSummary {
  goodPoints: string[];
  cautionPoints: string[];
  recommendedFor: string[];
}

interface VetHospital {
  id: string;
  name: string;
  address: string;
  phone?: string;
  distance: {
    meters: number;
    walkMinutes: number;
    carMinutes: number;
  };
  rating: number;
  reviewCount: number;
  features: VetFeatures;
  specialties: string[];
  openingHours: {
    weekday: string;
    saturday: string;
    sunday: string;
  };
  reviewSummary: ReviewSummary;
}

interface Place {
  id: string;
  name: string;
  address: string;
  distance: number;
  rating?: number;
  openNow?: boolean;
  type: 'vet' | 'dogrun' | 'petshop';
}

type PlaceType = 'vet' | 'dogrun' | 'petshop';

export default function PlacesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [placeType, setPlaceType] = useState<PlaceType>('vet');
  const [places, setPlaces] = useState<Place[]>([]);
  const [vetHospitals, setVetHospitals] = useState<VetHospital[]>([]);
  const [selectedVet, setSelectedVet] = useState<VetHospital | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchPlaces = async () => {
    setLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;

      if (placeType === 'vet') {
        const res = await fetch(
          `/api/places/vet?lat=${latitude}&lng=${longitude}`
        );
        const data = await res.json();
        if (data.hospitals) {
          setVetHospitals(data.hospitals);
        }
      } else {
        const res = await fetch(
          `/api/places/nearby?lat=${latitude}&lng=${longitude}&type=${placeType}`
        );
        const data = await res.json();
        if (data.places) {
          setPlaces(data.places);
        }
      }
      setHasSearched(true);
    } catch (error) {
      console.error('Location error:', error);
      setLocationError('位置情報を取得できませんでした。');

      // モックデータを表示
      if (placeType === 'vet') {
        const res = await fetch(`/api/places/vet`);
        const data = await res.json();
        if (data.hospitals) {
          setVetHospitals(data.hospitals);
        }
      } else {
        const res = await fetch(`/api/places/nearby?type=${placeType}`);
        const data = await res.json();
        if (data.places) {
          setPlaces(data.places);
        }
      }
      setHasSearched(true);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (session && !hasSearched) {
      searchPlaces();
    }
  }, [session, placeType]);

  const handleTypeChange = (type: PlaceType) => {
    setPlaceType(type);
    setHasSearched(false);
    setSelectedVet(null);
  };

  const getTypeLabel = (type: PlaceType) => {
    switch (type) {
      case 'vet':
        return '動物病院';
      case 'dogrun':
        return 'ドッグラン';
      case 'petshop':
        return 'ペットショップ';
    }
  };

  const getTypeEmoji = (type: PlaceType) => {
    switch (type) {
      case 'vet':
        return '🏥';
      case 'dogrun':
        return '🐕';
      case 'petshop':
        return '🛒';
    }
  };

  const getFeatureBadges = (features: VetFeatures) => {
    const badges = [];
    if (features.nightAvailable) badges.push({ label: '夜間対応', color: 'purple' });
    if (features.holidayAvailable) badges.push({ label: '休日対応', color: 'blue' });
    if (features.emergencyAvailable) badges.push({ label: '救急', color: 'red' });
    if (features.largeDogFriendly) badges.push({ label: '大型犬OK', color: 'green' });
    if (features.walkInOk) badges.push({ label: '飛び込みOK', color: 'orange' });
    if (features.parking) badges.push({ label: '駐車場', color: 'gray' });
    return badges;
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full" />
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  // 病院詳細モーダル
  if (selectedVet) {
    return (
      <div className="min-h-screen bg-warm-50">
        <header className="bg-white border-b border-warm-200 p-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              onClick={() => setSelectedVet(null)}
              className="text-primary-600 flex items-center gap-1"
            >
              ← 戻る
            </button>
            <h1 className="text-lg font-bold text-primary-900">病院詳細</h1>
            <div className="w-12" />
          </div>
        </header>

        <main className="max-w-2xl mx-auto p-4 py-6">
          {/* 基本情報 */}
          <Card className="mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold text-primary-900">
                  {selectedVet.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{selectedVet.address}</p>
              </div>
              <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg">
                <span>⭐</span>
                <span className="font-bold">{selectedVet.rating.toFixed(1)}</span>
                <span className="text-xs text-gray-500">({selectedVet.reviewCount}件)</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span>🚶 徒歩{selectedVet.distance.walkMinutes}分</span>
              <span>🚗 車{selectedVet.distance.carMinutes}分</span>
              <span>📍 {selectedVet.distance.meters}m</span>
            </div>

            {/* 特徴バッジ */}
            <div className="flex flex-wrap gap-2 mb-4">
              {getFeatureBadges(selectedVet.features).map((badge, index) => (
                <span
                  key={index}
                  className={`text-xs px-2 py-1 rounded-full bg-${badge.color}-100 text-${badge.color}-700`}
                  style={{
                    backgroundColor: badge.color === 'purple' ? '#f3e8ff' :
                      badge.color === 'blue' ? '#dbeafe' :
                      badge.color === 'red' ? '#fee2e2' :
                      badge.color === 'green' ? '#dcfce7' :
                      badge.color === 'orange' ? '#ffedd5' : '#f3f4f6',
                    color: badge.color === 'purple' ? '#7c3aed' :
                      badge.color === 'blue' ? '#2563eb' :
                      badge.color === 'red' ? '#dc2626' :
                      badge.color === 'green' ? '#16a34a' :
                      badge.color === 'orange' ? '#ea580c' : '#4b5563',
                  }}
                >
                  {badge.label}
                </span>
              ))}
            </div>

            {/* 営業時間 */}
            <div className="bg-warm-50 rounded-lg p-3 text-sm">
              <h4 className="font-medium text-gray-700 mb-2">営業時間</h4>
              <div className="grid grid-cols-3 gap-2 text-gray-600">
                <div>
                  <span className="text-gray-400">平日:</span> {selectedVet.openingHours.weekday}
                </div>
                <div>
                  <span className="text-gray-400">土曜:</span> {selectedVet.openingHours.saturday}
                </div>
                <div>
                  <span className="text-gray-400">日祝:</span> {selectedVet.openingHours.sunday}
                </div>
              </div>
            </div>
          </Card>

          {/* 得意分野 */}
          <Card className="mb-4">
            <h3 className="font-bold text-primary-900 mb-3">得意分野</h3>
            <div className="flex flex-wrap gap-2">
              {selectedVet.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </Card>

          {/* 口コミ要約 */}
          <Card className="mb-4">
            <h3 className="font-bold text-primary-900 mb-4">
              🤖 口コミAI要約
            </h3>

            {/* 良い点 */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                👍 良い点
              </h4>
              <ul className="space-y-2">
                {selectedVet.reviewSummary.goodPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* 注意点 */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
                ⚠️ 注意点
              </h4>
              <ul className="space-y-2">
                {selectedVet.reviewSummary.cautionPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-orange-500 mt-0.5">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* こんな人におすすめ */}
            <div className="p-3 bg-primary-50 rounded-lg">
              <h4 className="text-sm font-medium text-primary-800 mb-2">
                💡 こんな飼い主さんにおすすめ
              </h4>
              <ul className="space-y-1">
                {selectedVet.reviewSummary.recommendedFor.map((rec, index) => (
                  <li key={index} className="text-sm text-primary-700 flex items-center gap-2">
                    <span>•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* アクションボタン */}
          <div className="space-y-3">
            {selectedVet.phone && (
              <a
                href={`tel:${selectedVet.phone}`}
                className="block w-full"
              >
                <Button className="w-full">
                  📞 電話する
                </Button>
              </a>
            )}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedVet.name + ' ' + selectedVet.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Button variant="outline" className="w-full">
                🗺️ 地図で見る
              </Button>
            </a>
          </div>

          {/* 注意書き */}
          <div className="disclaimer mt-6">
            <p>
              ※ 口コミ要約はAIによる自動生成です。実際の診療内容は病院に直接ご確認ください。
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-warm-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold text-primary-600">わんサポ</h1>
          </Link>
          <Link href="/dashboard" className="text-primary-600 text-sm">
            戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">📍</span>
          <h2 className="text-2xl font-bold text-primary-900">
            近くの施設
          </h2>
        </div>

        {/* タイプ選択 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['vet', 'dogrun', 'petshop'] as PlaceType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                placeType === type
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-warm-300 text-gray-700 hover:border-primary-400'
              }`}
            >
              <span>{getTypeEmoji(type)}</span>
              <span>{getTypeLabel(type)}</span>
            </button>
          ))}
        </div>

        {/* 位置情報エラー */}
        {locationError && (
          <Card variant="warm" className="mb-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="text-sm text-gray-700">{locationError}</p>
                <p className="text-xs text-gray-500 mt-1">
                  サンプルデータを表示しています
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* 検索ボタン */}
        <Button
          onClick={searchPlaces}
          loading={loading}
          className="w-full mb-6"
        >
          現在地から検索
        </Button>

        {/* 動物病院リスト */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full" />
          </div>
        ) : placeType === 'vet' && vetHospitals.length > 0 ? (
          <div className="space-y-4">
            {vetHospitals.map((hospital) => (
              <Card
                key={hospital.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedVet(hospital)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-primary-900">{hospital.name}</h3>
                    <p className="text-sm text-gray-600">{hospital.address}</p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600">
                    <span>⭐</span>
                    <span className="font-bold">{hospital.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  <span>🚶 {hospital.distance.walkMinutes}分</span>
                  <span>📍 {hospital.distance.meters}m</span>
                </div>

                {/* 特徴バッジ（上位3つ） */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {getFeatureBadges(hospital.features).slice(0, 3).map((badge, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: badge.color === 'purple' ? '#f3e8ff' :
                          badge.color === 'blue' ? '#dbeafe' :
                          badge.color === 'red' ? '#fee2e2' :
                          badge.color === 'green' ? '#dcfce7' :
                          badge.color === 'orange' ? '#ffedd5' : '#f3f4f6',
                        color: badge.color === 'purple' ? '#7c3aed' :
                          badge.color === 'blue' ? '#2563eb' :
                          badge.color === 'red' ? '#dc2626' :
                          badge.color === 'green' ? '#16a34a' :
                          badge.color === 'orange' ? '#ea580c' : '#4b5563',
                      }}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>

                {/* こんな人におすすめ（1つだけ） */}
                <p className="text-xs text-primary-700 bg-primary-50 px-2 py-1 rounded">
                  💡 {hospital.reviewSummary.recommendedFor[0]}
                </p>

                <p className="text-xs text-primary-600 mt-3 text-right">
                  詳細を見る →
                </p>
              </Card>
            ))}
          </div>
        ) : places.length > 0 ? (
          <div className="space-y-4">
            {places.map((place) => (
              <Card key={place.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getTypeEmoji(place.type)}</span>
                      <h3 className="font-bold text-primary-900">{place.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{place.address}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">
                        📍 {place.distance < 1000
                          ? `${place.distance}m`
                          : `${(place.distance / 1000).toFixed(1)}km`}
                      </span>
                      {place.rating && (
                        <span className="text-yellow-600">
                          ⭐ {place.rating.toFixed(1)}
                        </span>
                      )}
                      {place.openNow !== undefined && (
                        <span className={place.openNow ? 'text-green-600' : 'text-red-600'}>
                          {place.openNow ? '営業中' : '営業時間外'}
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-primary-100 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-200 transition-colors"
                  >
                    地図
                  </a>
                </div>
              </Card>
            ))}
          </div>
        ) : hasSearched ? (
          <Card className="text-center py-8">
            <span className="text-4xl mb-4 block">🔍</span>
            <p className="text-gray-600">
              近くに{getTypeLabel(placeType)}が見つかりませんでした
            </p>
          </Card>
        ) : null}

        {/* ヒント */}
        <Card variant="warm" className="mt-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-bold text-primary-900 mb-1">
                {placeType === 'vet' ? 'かかりつけ医を見つけよう' :
                 placeType === 'dogrun' ? 'ドッグラン利用のコツ' :
                 'ペットショップ活用法'}
              </h3>
              <p className="text-sm text-gray-700">
                {placeType === 'vet'
                  ? '口コミだけでなく、実際に健康診断などで訪問して雰囲気を確かめるのがおすすめです。緊急時に備えて、夜間対応の病院も把握しておくと安心。'
                  : placeType === 'dogrun'
                  ? 'ワクチン接種証明書が必要な場合が多いです。初めての場所では他の犬の様子を見てから入りましょう。'
                  : 'スタッフに相談すると、愛犬に合ったフードやおもちゃを教えてもらえますよ。'}
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
