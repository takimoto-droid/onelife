'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface VetClinic {
  id: string;
  name: string;
  address: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  businessHours?: Record<string, string>;
  distance?: number;
  googleMapsUrl?: string;
  registeredAt?: string;
  memo?: string;
}

interface Dog {
  id: string;
  name: string;
  lastVaccineDate?: string;
  lastRabiesDate?: string;
}

export default function VetPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [primaryClinic, setPrimaryClinic] = useState<VetClinic | null>(null);
  const [nearbyClinics, setNearbyClinics] = useState<VetClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dog, setDog] = useState<Dog | null>(null);
  const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);

  // 位置情報を取得
  const getLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // エラー時はデフォルト位置（渋谷）
          setLocation({ lat: 35.6581, lng: 139.7017 });
        }
      );
    } else {
      setLocation({ lat: 35.6581, lng: 139.7017 });
    }
  }, []);

  // かかりつけ病院を取得
  const fetchPrimaryClinic = useCallback(async () => {
    try {
      const res = await fetch('/api/vet/primary');
      const data = await res.json();
      setPrimaryClinic(data.clinic);

      // 初回ガイド表示判定
      if (!data.clinic) {
        const hasSeenGuide = localStorage.getItem('hasSeenVetGuide');
        if (!hasSeenGuide) {
          setShowFirstTimeGuide(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch primary clinic:', error);
    }
  }, []);

  // 犬の情報を取得
  const fetchDog = useCallback(async () => {
    try {
      const res = await fetch('/api/dogs');
      const data = await res.json();
      if (data.dogs?.length > 0) {
        setDog(data.dogs[0]);
      }
    } catch (error) {
      console.error('Failed to fetch dog:', error);
    }
  }, []);

  // 近くの病院を検索
  const searchNearbyClinics = async () => {
    if (!location) return;

    setSearchLoading(true);
    try {
      const res = await fetch(
        `/api/vet/search?lat=${location.lat}&lng=${location.lng}&radius=5`
      );
      const data = await res.json();
      setNearbyClinics(data.clinics || []);
    } catch (error) {
      console.error('Failed to search clinics:', error);
    }
    setSearchLoading(false);
  };

  // かかりつけ登録
  const registerPrimary = async (clinic: VetClinic) => {
    setRegistering(clinic.id);
    try {
      const res = await fetch('/api/vet/primary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinic),
      });

      if (res.ok) {
        const data = await res.json();
        setPrimaryClinic(data.clinic);
        setShowSearch(false);
        setShowFirstTimeGuide(false);
        localStorage.setItem('hasSeenVetGuide', 'true');
      }
    } catch (error) {
      console.error('Failed to register clinic:', error);
    }
    setRegistering(null);
  };

  // かかりつけ解除
  const removePrimary = async () => {
    if (!confirm('かかりつけ病院の登録を解除しますか？')) return;

    try {
      await fetch('/api/vet/primary', { method: 'DELETE' });
      setPrimaryClinic(null);
    } catch (error) {
      console.error('Failed to remove clinic:', error);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      getLocation();
      fetchPrimaryClinic();
      fetchDog();
      setLoading(false);
    }
  }, [status, router, getLocation, fetchPrimaryClinic, fetchDog]);

  useEffect(() => {
    if (showSearch && location) {
      searchNearbyClinics();
    }
  }, [showSearch, location]);

  // 電話発信
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Googleマップで経路表示
  const openGoogleMaps = (clinic: VetClinic) => {
    if (!location) return;

    const origin = `${location.lat},${location.lng}`;
    const destination = encodeURIComponent(`${clinic.name} ${clinic.address}`);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    window.open(url, '_blank');
  };

  // 曜日を取得
  const getDayLabel = (day: string): string => {
    const labels: Record<string, string> = {
      mon: '月', tue: '火', wed: '水', thu: '木',
      fri: '金', sat: '土', sun: '日',
    };
    return labels[day] || day;
  };

  // 次にやること（ワクチン・狂犬病）を計算
  const getNextTasks = () => {
    if (!dog || !primaryClinic) return [];

    const tasks: { type: string; label: string; dueDate?: string; urgent: boolean }[] = [];

    // 混合ワクチン（年1回）
    if (dog.lastVaccineDate) {
      const lastVaccine = new Date(dog.lastVaccineDate);
      const nextVaccine = new Date(lastVaccine);
      nextVaccine.setFullYear(nextVaccine.getFullYear() + 1);

      const daysUntil = Math.ceil((nextVaccine.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 30) {
        tasks.push({
          type: 'vaccine',
          label: '混合ワクチン接種',
          dueDate: nextVaccine.toLocaleDateString('ja-JP'),
          urgent: daysUntil <= 7,
        });
      }
    } else {
      tasks.push({
        type: 'vaccine',
        label: '混合ワクチン接種（未登録）',
        urgent: false,
      });
    }

    // 狂犬病予防注射（年1回、4月）
    if (dog.lastRabiesDate) {
      const lastRabies = new Date(dog.lastRabiesDate);
      const now = new Date();
      const currentYear = now.getFullYear();
      const nextRabies = new Date(currentYear, 3, 1); // 4月1日

      if (now > nextRabies && lastRabies < nextRabies) {
        tasks.push({
          type: 'rabies',
          label: '狂犬病予防注射',
          dueDate: `${currentYear}年4月`,
          urgent: true,
        });
      }
    } else {
      tasks.push({
        type: 'rabies',
        label: '狂犬病予防注射（未登録）',
        urgent: false,
      });
    }

    return tasks;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const nextTasks = getNextTasks();

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* ヘッダー */}
      <header className="header p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold gradient-text">わんライフ</h1>
          </Link>
          <Link href="/dashboard" className="text-accent text-sm">
            戻る
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-dark-50 mb-2">🏥 かかりつけ病院</h2>
          <p className="text-dark-400">
            困った時にすぐ行動できる安心を
          </p>
        </div>

        {/* 初回ガイド */}
        {showFirstTimeGuide && (
          <Card className="mb-6 bg-accent/10 border-accent/30">
            <div className="text-center">
              <div className="text-4xl mb-3">🏥</div>
              <h3 className="font-bold text-dark-100 mb-2">
                かかりつけ病院を登録すると安心です
              </h3>
              <p className="text-sm text-dark-300 mb-4">
                いざという時にワンタップで電話や地図を表示できます。
                ワクチンの時期もお知らせします。
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowSearch(true)}>
                  近くの病院を探す
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowFirstTimeGuide(false);
                    localStorage.setItem('hasSeenVetGuide', 'true');
                  }}
                >
                  あとで
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* かかりつけ病院表示 */}
        {primaryClinic && !showSearch && (
          <>
            <Card className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-feature-health/20 flex items-center justify-center text-2xl">
                    🏥
                  </div>
                  <div>
                    <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                      かかりつけ
                    </span>
                    <h3 className="font-bold text-dark-100 mt-1">
                      {primaryClinic.name}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-dark-300">
                  <span className="text-lg">📍</span>
                  <span className="text-sm">{primaryClinic.address}</span>
                </div>
                {primaryClinic.phone && (
                  <div className="flex items-center gap-2 text-dark-300">
                    <span className="text-lg">📞</span>
                    <span className="text-sm">{primaryClinic.phone}</span>
                  </div>
                )}
                {primaryClinic.rating && (
                  <div className="flex items-center gap-2 text-dark-300">
                    <span className="text-lg">⭐</span>
                    <span className="text-sm">
                      {primaryClinic.rating} ({primaryClinic.reviewCount}件の口コミ)
                    </span>
                  </div>
                )}
              </div>

              {/* 診療時間 */}
              {primaryClinic.businessHours && (
                <div className="bg-dark-700/50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-dark-400 mb-2">診療時間</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(primaryClinic.businessHours).map(([day, hours]) => (
                      <div key={day} className="flex justify-between">
                        <span className="text-dark-400">{getDayLabel(day)}</span>
                        <span className={hours === '休診' ? 'text-dark-500' : 'text-dark-200'}>
                          {hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex gap-3">
                {primaryClinic.phone && (
                  <Button
                    onClick={() => handleCall(primaryClinic.phone!)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <span className="mr-2">📞</span>
                    電話する
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => openGoogleMaps(primaryClinic)}
                  className="flex-1"
                >
                  <span className="mr-2">🗺️</span>
                  地図で見る
                </Button>
              </div>

              <button
                onClick={removePrimary}
                className="mt-4 text-xs text-dark-500 hover:text-dark-400 w-full text-center"
              >
                かかりつけ登録を解除
              </button>
            </Card>

            {/* 次にやること */}
            {nextTasks.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-dark-100 mb-3 flex items-center gap-2">
                  <span>📋</span> 次にやること
                </h3>
                <div className="space-y-3">
                  {nextTasks.map((task, index) => (
                    <Card
                      key={index}
                      className={task.urgent ? 'border-red-500/50 bg-red-500/5' : ''}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {task.type === 'vaccine' ? '💉' : '🐕'}
                          </span>
                          <div>
                            <p className="font-medium text-dark-100">{task.label}</p>
                            {task.dueDate && (
                              <p className={`text-sm ${task.urgent ? 'text-red-400' : 'text-dark-400'}`}>
                                {task.urgent ? '⚠️ ' : ''}{task.dueDate}まで
                              </p>
                            )}
                          </div>
                        </div>
                        {primaryClinic.phone && (
                          <Button
                            size="sm"
                            onClick={() => handleCall(primaryClinic.phone!)}
                          >
                            予約
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="secondary"
              onClick={() => setShowSearch(true)}
              className="w-full"
            >
              別の病院を探す
            </Button>
          </>
        )}

        {/* 病院検索 */}
        {(showSearch || (!primaryClinic && !showFirstTimeGuide)) && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-dark-100">近くの動物病院</h3>
              {primaryClinic && (
                <button
                  onClick={() => setShowSearch(false)}
                  className="text-sm text-accent"
                >
                  戻る
                </button>
              )}
            </div>

            {searchLoading ? (
              <div className="text-center py-12">
                <div className="spinner mx-auto mb-4" />
                <p className="text-dark-400">検索中...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {nearbyClinics.map((clinic) => (
                  <Card key={clinic.id}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-dark-100">{clinic.name}</h4>
                        <p className="text-sm text-dark-400">{clinic.address}</p>
                      </div>
                      {clinic.distance && (
                        <span className="text-sm text-accent bg-accent/10 px-2 py-1 rounded-full">
                          {clinic.distance}km
                        </span>
                      )}
                    </div>

                    {clinic.rating && (
                      <div className="flex items-center gap-2 text-sm text-dark-300 mb-3">
                        <span>⭐ {clinic.rating}</span>
                        <span className="text-dark-500">({clinic.reviewCount}件)</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => registerPrimary(clinic)}
                        disabled={registering === clinic.id}
                        className="flex-1"
                      >
                        {registering === clinic.id ? '登録中...' : 'かかりつけに登録'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openGoogleMaps(clinic)}
                      >
                        地図
                      </Button>
                    </div>
                  </Card>
                ))}

                {nearbyClinics.length === 0 && (
                  <div className="text-center py-12">
                    <span className="text-4xl mb-4 block">🔍</span>
                    <p className="text-dark-400">
                      近くに動物病院が見つかりませんでした
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 注意書き */}
        <div className="disclaimer mt-8">
          <p>
            ※ 診療時間・休診日は変更される場合があります。
            必ず事前に病院へご確認ください。
            緊急時は最寄りの夜間救急病院へお問い合わせください。
          </p>
        </div>
      </main>

      {/* ボトムナビゲーション */}
      <nav className="bottom-nav">
        <div className="max-w-4xl mx-auto flex justify-around">
          <Link href="/dashboard" className="bottom-nav-item">
            <span className="text-xl">🏠</span>
            <span>ホーム</span>
          </Link>
          <Link href="/walk" className="bottom-nav-item">
            <span className="text-xl">🚶</span>
            <span>散歩</span>
          </Link>
          <Link href="/voice" className="bottom-nav-item">
            <span className="text-xl">🎤</span>
            <span>翻訳</span>
          </Link>
          <Link href="/family" className="bottom-nav-item">
            <span className="text-xl">👨‍👩‍👧</span>
            <span>家族</span>
          </Link>
          <Link href="/settings" className="bottom-nav-item">
            <span className="text-xl">⚙️</span>
            <span>設定</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
