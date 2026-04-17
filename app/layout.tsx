import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { MetaPixelBase } from '@/components/analytics/MetaPixel';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = 'https://kyra.conversionsystem.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Kyra — AI Workforce Platform for Agencies',
    template: '%s — Kyra AI',
  },
  description: 'Deploy AI workers that answer calls, book appointments, qualify leads, and handle customer support — 24/7. Web chat, voice AI, SMS, and more. One dashboard for all your clients.',
  keywords: ['AI worker', 'AI workforce platform', 'AI for agencies', 'AI receptionist', 'voice AI', 'AI chatbot', 'white-label AI', 'AI customer service', 'AI appointment booking'],
  authors: [{ name: 'Conversion System', url: 'https://conversionsystem.com' }],
  openGraph: {
    type: 'website',
    siteName: 'Kyra AI',
    title: 'Kyra — AI Workforce Platform for Agencies',
    description: 'Deploy AI workers that answer calls, book appointments, qualify leads, and handle support — 24/7. One dashboard for all your clients.',
    url: BASE_URL,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kyra AI — Deploy AI workers for any business',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kyra — AI Workforce Platform for Agencies',
    description: 'Deploy AI workers that answer calls, book appointments, qualify leads, and handle support — 24/7. One dashboard for all your clients.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    types: {
      'application/rss+xml': `${BASE_URL}/feed.xml`,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <MetaPixelBase />
        {children}
      </body>
    </html>
  );
}
