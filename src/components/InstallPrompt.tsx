'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // スタンドアロンモード（既にインストール済み）かチェック
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // iOSかチェック
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    // 既に閉じた場合はしばらく表示しない
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }

    // Android/Chrome用インストールプロンプト
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOSの場合は手動で表示
    if (ios && !standalone) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('Install prompt outcome:', outcome);
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', new Date().toISOString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 mx-auto max-w-md z-50 animate-slideUp">
      <div className="bg-white rounded-3xl shadow-soft-lg border border-cream-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-peach-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
            🐾
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-brown-700 mb-1">
              アプリをインストール
            </h3>
            <p className="text-sm text-brown-500 mb-3">
              {isIOS
                ? 'ホーム画面に追加すると、アプリのように使えます'
                : 'ホーム画面に追加して、いつでもすぐにアクセス'}
            </p>

            {isIOS ? (
              <div className="bg-cream-50 rounded-2xl p-3 text-xs text-brown-500">
                <p className="font-medium text-brown-600 mb-1">追加方法：</p>
                <p>1. 画面下の <span className="inline-block px-1 bg-white rounded">↑</span> をタップ</p>
                <p>2.「ホーム画面に追加」を選択</p>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleInstall} size="sm" className="flex-1">
                  インストール
                </Button>
                <Button variant="ghost" onClick={handleDismiss} size="sm">
                  後で
                </Button>
              </div>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="text-brown-300 hover:text-brown-500 text-xl"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

// Service Worker登録コンポーネント
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);

          // アップデートがあればリロードを促す
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 新しいバージョンが利用可能
                  console.log('New version available');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    }
  }, []);

  return null;
}
