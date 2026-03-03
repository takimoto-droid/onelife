'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VaccineCard } from '@/components/VaccineCard';

interface VaccineSchedule {
  id: string;
  type: string;
  scheduledDate: string;
  completed: boolean;
}

interface Dog {
  id: string;
  name: string;
  birthDate?: string;
  vaccineSchedules: VaccineSchedule[];
}

export default function VaccinePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dogs');
        const data = await res.json();
        if (data.dogs && data.dogs.length > 0) {
          setDog(data.dogs[0]);
        }
      } catch (error) {
        console.error('Failed to fetch dogs:', error);
      }
      setLoading(false);
    };

    if (session) {
      fetchData();
    }
  }, [session]);

  const handleGenerateSchedule = async () => {
    if (!dog) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/vaccine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId: dog.id }),
      });

      const data = await res.json();

      if (res.ok) {
        // 再取得
        const dogsRes = await fetch('/api/dogs');
        const dogsData = await dogsRes.json();
        if (dogsData.dogs && dogsData.dogs.length > 0) {
          setDog(dogsData.dogs[0]);
        }
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error);
    }
    setGenerating(false);
  };

  const handleComplete = async (scheduleId: string) => {
    try {
      await fetch(`/api/vaccine/${scheduleId}/complete`, {
        method: 'POST',
      });

      // 更新
      if (dog) {
        setDog({
          ...dog,
          vaccineSchedules: dog.vaccineSchedules.map((v) =>
            v.id === scheduleId ? { ...v, completed: true } : v
          ),
        });
      }
    } catch (error) {
      console.error('Failed to complete vaccine:', error);
    }
  };

  if (status === 'loading' || loading) {
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

  const pendingVaccines = dog?.vaccineSchedules?.filter((v) => !v.completed) || [];
  const completedVaccines = dog?.vaccineSchedules?.filter((v) => v.completed) || [];

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
        <h2 className="text-2xl font-bold text-primary-900 mb-2">
          ワクチンスケジュール
        </h2>
        <p className="text-gray-600 mb-6">
          {dog?.name}ちゃんの予防接種を管理します
        </p>

        {/* スケジュールがない場合 */}
        {dog?.vaccineSchedules?.length === 0 && (
          <Card className="mb-6">
            <div className="text-center py-6">
              <div className="text-5xl mb-4">💉</div>
              <h3 className="font-bold text-primary-900 mb-2">
                ワクチンスケジュールを作成
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {dog?.birthDate
                  ? '誕生日をもとに、推奨されるワクチンスケジュールを自動生成します。'
                  : 'ワンちゃんの年齢に合わせた一般的なスケジュールを作成します。'}
              </p>
              <Button onClick={handleGenerateSchedule} loading={generating}>
                スケジュールを生成
              </Button>
            </div>
          </Card>
        )}

        {/* 予定のワクチン */}
        {pendingVaccines.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-primary-900 mb-4">
              予定のワクチン
            </h3>
            <div className="space-y-4">
              {pendingVaccines.map((vaccine) => (
                <VaccineCard
                  key={vaccine.id}
                  type={vaccine.type}
                  scheduledDate={new Date(vaccine.scheduledDate)}
                  completed={vaccine.completed}
                  onComplete={() => handleComplete(vaccine.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 完了したワクチン */}
        {completedVaccines.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-primary-900 mb-4">
              完了したワクチン
            </h3>
            <div className="space-y-4">
              {completedVaccines.map((vaccine) => (
                <VaccineCard
                  key={vaccine.id}
                  type={vaccine.type}
                  scheduledDate={new Date(vaccine.scheduledDate)}
                  completed={vaccine.completed}
                />
              ))}
            </div>
          </div>
        )}

        {/* 情報カード */}
        <Card variant="warm" className="mb-6">
          <h3 className="font-bold text-primary-900 mb-3">
            ワクチンについて
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-medium">混合ワクチン</p>
              <p className="text-gray-600">
                ジステンパー、パルボウイルスなど複数の感染症を予防します。
                子犬は生後6〜8週から開始し、数回の接種が必要です。
              </p>
            </div>
            <div>
              <p className="font-medium">狂犬病ワクチン</p>
              <p className="text-gray-600">
                法律で年1回の接種が義務付けられています。
                生後91日以降の犬は必ず接種し、市区町村への登録が必要です。
              </p>
            </div>
          </div>
        </Card>

        {/* 注意書き */}
        <div className="disclaimer">
          <p>
            ※ 表示されているスケジュールは一般的な目安です。
            実際の接種時期は、かかりつけの獣医師にご相談ください。
            犬の健康状態や地域の感染状況によって、
            推奨されるスケジュールが異なる場合があります。
          </p>
        </div>
      </main>
    </div>
  );
}
