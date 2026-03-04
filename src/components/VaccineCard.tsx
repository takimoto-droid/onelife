'use client';

import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface VaccineCardProps {
  type: string;
  scheduledDate: Date;
  completed: boolean;
  onComplete?: () => void;
}

const vaccineTypeLabels: Record<string, { name: string; description: string }> = {
  mixed_vaccine: {
    name: '混合ワクチン',
    description: '複数の感染症を予防するワクチンです',
  },
  rabies: {
    name: '狂犬病ワクチン',
    description: '法律で義務付けられている予防接種です',
  },
};

export function VaccineCard({
  type,
  scheduledDate,
  completed,
  onComplete,
}: VaccineCardProps) {
  const vaccineInfo = vaccineTypeLabels[type] || {
    name: type,
    description: '',
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysUntil = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysUntil = getDaysUntil(scheduledDate);

  return (
    <Card className="relative overflow-hidden">
      {completed && (
        <div className="absolute top-0 right-0 bg-feature-health text-dark-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
          完了
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-feature-health/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg
            className="w-6 h-6 text-feature-health"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-dark-100 text-lg">{vaccineInfo.name}</h3>
          <p className="text-sm text-dark-400 mt-1">{vaccineInfo.description}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-dark-400">予定日:</span>
            <span className="font-medium text-dark-200">
              {formatDate(scheduledDate)}
            </span>
          </div>
          {!completed && daysUntil >= 0 && (
            <p
              className={`text-sm mt-2 ${
                daysUntil <= 7 ? 'text-accent font-medium' : 'text-dark-400'
              }`}
            >
              {daysUntil === 0
                ? '今日が予定日です！'
                : `あと${daysUntil}日`}
            </p>
          )}
        </div>
      </div>
      {!completed && onComplete && (
        <div className="mt-4 pt-4 border-t border-dark-600">
          <Button variant="outline" onClick={onComplete} className="w-full">
            完了にする
          </Button>
        </div>
      )}
    </Card>
  );
}
