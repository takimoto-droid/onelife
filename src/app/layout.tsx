import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { InstallPrompt, ServiceWorkerRegistration } from '@/components/InstallPrompt';

export const metadata: Metadata = {
  title: 'わんライフ - 愛犬との生活をもっと豊かに',
  description: '犬を飼い始めた人から長年の飼い主まで、AIがあなたと愛犬の毎日をサポートする統合アプリ',
  manifest: '/manifest.json',
  applicationName: 'わんライフ',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'わんライフ',
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152.png', sizes: '152x152' },
      { url: '/icons/icon-192.png', sizes: '192x192' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FF8585',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* PWA用メタタグ */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="わんライフ" />

        {/* Appleタッチアイコン */}
        <link rel="apple-touch-icon" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />

        {/* スプラッシュスクリーン（iOS） */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link
          rel="apple-touch-startup-image"
          href="/icons/splash.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />

        {/* Microsoft Tile */}
        <meta name="msapplication-TileColor" content="#FF8585" />
        <meta name="msapplication-TileImage" content="/icons/icon-144.png" />

        {/* テーマカラー */}
        <meta name="theme-color" content="#FF8585" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#FF8585" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="antialiased min-h-screen">
        <Providers>
          {children}
          <InstallPrompt />
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  );
}
