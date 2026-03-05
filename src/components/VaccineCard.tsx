'use client';

import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface VaccineCardProps {
  type: string;
  scheduledDate: Date;
  completed: boolean;
  onComplete?: () => void;
}

const vaccineTypeLabels: Record<string, { name: string; description: string; emoji: string }> = {
  mixed_vaccine: {
    name: '混合ワクチン',
    description: '複数の感染症を予防するワクチンです',
    emoji: '💉',
  },
  rabies: {
    name: '狂犬病ワクチン',
    description: '法律で義務付けられている予防接種です',
    emoji: '🏥',
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
    emoji: '💉',
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
    <Card className="relative overflow-hidden bg-gradient-to-br from-mint-50 to-white border-mint-200">
      {completed && (
        <div className="absolute top-0 right-0 bg-gradient-to-r from-mint-400 to-mint-300 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl shadow-sm">
          完了
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-mint-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl shadow-sm">
          {vaccineInfo.emoji}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-brown-700 text-lg">{vaccineInfo.name}</h3>
          <p className="text-sm text-brown-400 mt-1">{vaccineInfo.description}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-brown-400">予定日:</span>
            <span className="font-medium text-brown-600">
              {formatDate(scheduledDate)}
            </span>
          </div>
          {!completed && daysUntil >= 0 && (
            <p
              className={`text-sm mt-2 font-medium ${
                daysUntil <= 7 ? 'text-accent' : 'text-brown-400'
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
        <div className="mt-4 pt-4 border-t border-mint-200">
          <Button variant="mint" onClick={onComplete} className="w-full">
            完了にする
          </Button>
        </div>
      )}
    </Card>
  );
}
