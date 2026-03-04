'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

interface InsuranceRecommendation {
  id: string;
  name: string;
  company: string;
  monthlyPrice: number;
  coveragePercent: number;
  features: string[];
  pros: string;
  cons: string;
  reason: string;
  url: string;
  rank: number;
  matchScore: number;
  recommended?: boolean;
}

interface DogInfo {
  name: string;
  breed: string | null;
  age: string;
  size: string | null;
}

export default function InsurancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<InsuranceRecommendation[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [dogInfo, setDogInfo] = useState<DogInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/ai/insurance');
        const data = await res.json();
        if (data.recommendations) {
          setRecommendations(data.recommendations);
        }
        if (data.aiAnalysis) {
          setAiAnalysis(data.aiAnalysis);
        }
        if (data.dogInfo) {
          setDogInfo(data.dogInfo);
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

  const getSizeLabel = (size: string | null) => {
    switch (size) {
      case 'small':
        return '小型犬';
      case 'medium':
        return '中型犬';
      case 'large':
        return '大型犬';
      default:
        return '';
    }
  };

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
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🏆</span>
          <h2 className="text-2xl font-bold text-primary-900">
            おすすめ保険
          </h2>
        </div>
        {dogInfo && (
          <p className="text-gray-600 mb-6">
            {dogInfo.name}ちゃん
            {dogInfo.breed && `（${dogInfo.breed}`}
            {dogInfo.size && `・${getSizeLabel(dogInfo.size)}`}
            {dogInfo.age && `・${dogInfo.age}`}
            {(dogInfo.breed || dogInfo.size || dogInfo.age) && '）'}
            に合った保険をご提案
          </p>
        )}

        {/* AIからのアドバイス */}
        {aiAnalysis && (
          <Card className="mb-6 bg-gradient-to-r from-primary-50 to-warm-100 border-primary-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-bold text-primary-900 mb-2">
                  AIからのアドバイス
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {aiAnalysis}
                </p>
              </div>
            </div>
          </Card>
        )}

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
          {recommendations.map((insurance) => (
            <Card
              key={insurance.id}
              className={`hover:shadow-md transition-shadow ${
                insurance.recommended ? 'ring-2 ring-primary-400' : ''
              }`}
            >
              {/* ランキングバッジ */}
              <div className="flex items-center gap-2 mb-4">
                {insurance.rank === 1 && (
                  <div className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                    <span>🥇</span> 1位
                  </div>
                )}
                {insurance.rank === 2 && (
                  <div className="inline-flex items-center gap-1 bg-gray-300 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                    <span>🥈</span> 2位
                  </div>
                )}
                {insurance.rank === 3 && (
                  <div className="inline-flex items-center gap-1 bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    <span>🥉</span> 3位
                  </div>
                )}
                {insurance.recommended && (
                  <div className="inline-block bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    おすすめ
                  </div>
                )}
              </div>

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-primary-900 text-lg">
                    {insurance.name}
                  </h3>
                  <p className="text-sm text-gray-500">{insurance.company}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">
                    ¥{insurance.monthlyPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">/ 月〜</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="bg-primary-100 text-primary-700 text-sm font-medium px-3 py-1 rounded-full">
                  補償 {insurance.coveragePercent}%
                </span>
                <span className="bg-warm-200 text-warm-700 text-sm font-medium px-3 py-1 rounded-full">
                  マッチ度 {Math.min(100, Math.round(insurance.matchScore * 1.5))}%
                </span>
              </div>

              {/* おすすめ理由 */}
              <div className="p-3 bg-warm-100 rounded-lg mb-4">
                <p className="text-sm text-primary-800">
                  <span className="font-medium">💬 </span>
                  {insurance.reason}
                </p>
              </div>

              {/* 特徴 */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">特徴</h4>
                <ul className="space-y-1">
                  {insurance.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <svg
                        className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* メリット・デメリット */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-sm">
                  <p className="font-medium text-green-700 mb-1">👍 メリット</p>
                  <p className="text-gray-600">{insurance.pros}</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-orange-700 mb-1">⚠️ 注意点</p>
                  <p className="text-gray-600">{insurance.cons}</p>
                </div>
              </div>

              {/* 公式サイトリンク */}
              <a
                href={insurance.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 border-2 border-primary-400 text-primary-600 rounded-xl hover:bg-primary-50 transition-colors font-medium"
              >
                公式サイトで詳細を見る →
              </a>
            </Card>
          ))}
        </div>

        {/* ペット保険について */}
        <Card className="mb-6">
          <h3 className="font-bold text-primary-900 mb-4">
            ペット保険の選び方
          </h3>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <p className="font-medium mb-1">📊 補償割合をチェック</p>
              <p className="text-gray-600">
                50%・70%・100%などがあります。割合が高いほど自己負担が減りますが、
                保険料も上がります。バランスを考えて選びましょう。
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">🏥 窓口精算 vs 後日請求</p>
              <p className="text-gray-600">
                窓口精算対応なら、病院で保険証を見せるだけで補償分を差し引いた金額のみ支払い。
                後日請求の場合は一旦全額支払い、後で請求が必要です。
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">📋 補償対象を確認</p>
              <p className="text-gray-600">
                通院・入院・手術のどれが補償されるか確認を。
                歯科治療や予防接種は対象外のことが多いです。
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">🐕 加入条件をチェック</p>
              <p className="text-gray-600">
                年齢制限（7歳以上は加入不可など）や持病の有無で加入できない場合があります。
                早めの検討がおすすめです。
              </p>
            </div>
          </div>
        </Card>

        {/* 注意書き */}
        <div className="disclaimer">
          <p>
            ※ 表示されている保険料は目安であり、犬種・年齢・プランによって異なります。
            正確な保険料は各保険会社の公式サイトでご確認ください。
            わんサポは保険の販売・仲介を行っておらず、特定の保険を推奨するものではありません。
            保険への加入は、ご自身の判断と責任のもとで行ってください。
          </p>
        </div>
      </main>
    </div>
  );
}
