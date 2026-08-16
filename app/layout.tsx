import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Savage Trading Journal',
  description: 'Tu diario de trading profesional — XAU/USD & NAS100',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ST Journal',
  },
  icons: {
    icon: '/icon-192.png',
    apple: [
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Critical: viewport-fit=cover enables env(safe-area-inset-*) on iOS */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#0b1a2e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ST Journal" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `}} />
      </body>
    </html>
  );
}
