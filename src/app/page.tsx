'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDogs, getUser } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // localStorageからデータを確認
    const user = getUser();
    const dogs = getDogs();

    if (dogs.length > 0) {
      // 犬が登録済み → ダッシュボードへ
      router.replace('/dashboard');
    } else if (user.onboarded) {
      // オンボーディング済みだが犬未登録 → オンボーディングへ
      router.replace('/onboarding');
    } else {
      // 初回 → オンボーディングへ
      router.replace('/onboarding');
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cream-50 to-pink-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce-soft">🐕</div>
          <div className="spinner mx-auto" />
          <p className="mt-4 text-brown-400 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  return null;
}
