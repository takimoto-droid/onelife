'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { InsuranceCard } from '@/components/InsuranceCard';
import { InsuranceRecommendation } from '@/types';

export default function InsurancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<InsuranceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/ai/insurance');
        const data = await res.json();
        if (data.recommendations) {
          setRecommendations(data.recommendations);
        }
      } catch (error) {
        console.error('Failed to fetch insurance:', error);
      }
      setLoading(false);
    };

    if (session) {
      fetchData();
    }
  }, [session]);

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
          保険のご案内
        </h2>
        <p className="text-gray-600 mb-6">
          ワンちゃんに合った保険をAIがご提案します
        </p>

        {/* 重要な注意 */}
        <Card variant="warm" className="mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-bold text-primary-900 mb-1">
                ご検討の参考に
              </h3>
              <p className="text-sm text-gray-700">
                ペット保険は任意です。ここでは参考情報としてご案内しています。
                加入を強制するものではありませんので、ご自身のペースでご検討ください。
              </p>
            </div>
          </div>
        </Card>

        {/* 保険リスト */}
        <div className="space-y-6 mb-8">
          {recommendations.map((insurance, index) => (
            <InsuranceCard key={index} insurance={insurance} />
          ))}
        </div>

        {/* ペット保険について */}
        <Card className="mb-6">
          <h3 className="font-bold text-primary-900 mb-4">
            ペット保険について
          </h3>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <p className="font-medium mb-1">ペット保険とは？</p>
              <p className="text-gray-600">
                ペットの病気やケガの治療費を補償する保険です。
                犬の医療費は全額自己負担が基本のため、
                急な出費に備える手段として検討される方が増えています。
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">加入のタイミング</p>
              <p className="text-gray-600">
                一般的に、若いうちに加入するほど保険料が安くなります。
                また、既往症がある場合は加入できないこともあるため、
                健康なうちの検討がおすすめです。
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">選ぶポイント</p>
              <p className="text-gray-600">
                補償割合、月々の保険料、補償対象（通院・入院・手術）、
                待機期間、免責事項などを比較して、
                ご自身の状況に合ったプランを選びましょう。
              </p>
            </div>
          </div>
        </Card>

        {/* 注意書き */}
        <div className="disclaimer">
          <p>
            ※ 表示されている保険情報は参考情報です。
            実際の保険料や補償内容は、年齢・犬種・地域などによって異なります。
            詳細は各保険会社の公式サイトをご確認ください。
            保険への加入は、ご自身の判断と責任のもとで行ってください。
            わんサポは保険の販売・仲介を行っておらず、
            特定の保険を推奨するものではありません。
          </p>
        </div>
      </main>
    </div>
  );
}
