import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'わんサポ - 犬を飼い始めた人のAIサポートアプリ',
  description: '犬を飼い始めた人の不安を減らし、ワクチン・保険などのタスクを忘れさせない「AI相棒アプリ」',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
