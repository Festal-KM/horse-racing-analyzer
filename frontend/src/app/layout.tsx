import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

// Sentryの初期化（本番環境のみ）
// Sentryの設定はclient componentかuseEffectで行うように修正
// サーバーコンポーネントでは動的importとBrowserTracingは使用できない
if (process.env.NODE_ENV === 'production') {
  // Sentryの初期化はクライアントサイドのファイルで行う
}

export const metadata: Metadata = {
  title: '競馬予想ツール',
  description: 'レース回顧型予想スタイルを効率化・体系化するための専用ツール',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
