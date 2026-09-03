import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NaEtacie — oferty pracy budowlanej w Szczecinie',
  description:
    'NaEtacie agreguje realne oferty pracy budowlanej z rejonu Szczecina — OLX, Pracuj.pl, Indeed. Mapa, dopasowanie ofert, śledzenie aplikacji.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#064e3b' },
    { media: '(prefers-color-scheme: dark)', color: '#022c22' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={`${plusJakartaSans.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
