import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'わんライフ - 愛犬との生活をもっと豊かに',
  description: '犬を飼い始めた人から長年の飼い主まで、AIがあなたと愛犬の毎日をサポートする統合アプリ',
  manifest: '/manifest.json',
  themeColor: '#0D1B2A',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased min-h-screen bg-dark-900 text-dark-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
