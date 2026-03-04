'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchPlaces = async () => {
    setLoading(true);
    setLocationError(null);

    try {
      // 位置情報を取得
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;

      // 近くの施設を検索
      const res = await fetch(
        `/api/places/nearby?lat=${latitude}&lng=${longitude}&type=${placeType}`
      );
      const data = await res.json();

      if (data.places) {
        setPlaces(data.places);
      }
      setHasSearched(true);
    } catch (error) {
      console.error('Location error:', error);
      setLocationError('位置情報を取得できませんでした。設定で位置情報を許可してください。');

      // モックデータを表示
      const res = await fetch(`/api/places/nearby?type=${placeType}`);
      const data = await res.json();
      if (data.places) {
        setPlaces(data.places);
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

        {/* 施設リスト */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full" />
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
                {placeType === 'vet' ? '病院選びのポイント' :
                 placeType === 'dogrun' ? 'ドッグラン利用のコツ' :
                 'ペットショップ活用法'}
              </h3>
              <p className="text-sm text-gray-700">
                {placeType === 'vet'
                  ? '緊急時に備えて、かかりつけ医を決めておくと安心です。営業時間や休診日も確認しておきましょう。'
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
