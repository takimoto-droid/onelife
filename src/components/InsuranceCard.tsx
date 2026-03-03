'use client';

import { Card } from './ui/Card';
import { InsuranceRecommendation } from '@/types';

interface InsuranceCardProps {
  insurance: InsuranceRecommendation;
}

export function InsuranceCard({ insurance }: InsuranceCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-primary-900 text-lg">{insurance.name}</h3>
          <p className="text-sm text-gray-500">{insurance.company}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-600">
            ¥{insurance.monthlyPrice.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">/ 月</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="bg-primary-100 text-primary-700 text-sm font-medium px-3 py-1 rounded-full">
          補償 {insurance.coveragePercent}%
        </span>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">特徴</h4>
        <ul className="space-y-1">
          {insurance.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
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

      <div className="mt-4 p-3 bg-warm-100 rounded-lg">
        <p className="text-sm text-primary-800">
          <span className="font-medium">おすすめの理由: </span>
          {insurance.reason}
        </p>
      </div>

      <p className="disclaimer">
        ※ 表示されている情報は参考情報です。詳細は各保険会社の公式サイトをご確認ください。
        保険への加入は、ご自身の判断と責任のもとで行ってください。
      </p>
    </Card>
  );
}
