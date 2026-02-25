import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { MetaPixelBase } from '@/components/analytics/MetaPixel';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const BASE_URL = 'https://kyra.conversionsystem.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Kyra — AI Workers for GHL Agencies',
    template: '%s — Kyra AI',
  },
  description: 'Deploy white-labeled AI workers inside GoHighLevel accounts. Responds to SMS in 60 seconds, books appointments, updates CRM, escalates to humans. One dashboard for all your clients.',
  keywords: ['AI worker', 'GoHighLevel', 'GHL automation', 'AI SMS', 'agency AI', 'white-label AI', 'AI chatbot for agencies'],
  authors: [{ name: 'Conversion System', url: 'https://conversionsystem.com' }],
  openGraph: {
    type: 'website',
    siteName: 'Kyra AI',
    title: 'Kyra — AI Workers for GHL Agencies',
    description: 'Give every client a real AI worker. Responds to SMS in 60 seconds, books appointments, and updates the CRM — automatically.',
    url: BASE_URL,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kyra AI — Deploy AI workers for all your GHL agency clients',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kyra — AI Workers for GHL Agencies',
    description: 'Give every client an AI worker that responds to leads in 60 seconds, books appointments, and updates the CRM automatically.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
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
