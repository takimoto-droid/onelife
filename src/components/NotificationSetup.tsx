'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/Button';

export function NotificationSetup() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);

      // まだ許可されていない場合はプロンプトを表示
      if (Notification.permission === 'default') {
        // 少し遅延させて表示
        setTimeout(() => setShowPrompt(true), 3000);
      }
    } else {
      setPermission('unsupported');
    }

    // Service Workerの登録
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('Service Worker registered:', registration);
      }).catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);

      if (result === 'granted') {
        // テスト通知を送信
        new Notification('わんサポ', {
          body: '通知が有効になりました！ワクチンの予定日をお知らせします。',
          icon: '/icon-192.png',
        });
      }
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
  };

  if (permission === 'unsupported' || permission === 'granted' || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-2xl shadow-lg border border-warm-200 p-4 z-50 fade-in">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <h3 className="font-bold text-primary-900 mb-1">
            通知を有効にしますか？
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            ワクチンの予定日が近づいたらお知らせします。
            忘れずに予防接種を受けられます。
          </p>
          <div className="flex gap-2">
            <Button onClick={requestPermission} className="text-sm py-2 px-4">
              有効にする
            </Button>
            <Button
              variant="secondary"
              onClick={dismissPrompt}
              className="text-sm py-2 px-4"
            >
              あとで
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
