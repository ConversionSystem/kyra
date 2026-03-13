import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { BUSINESS } from '@/lib/constants';
import { THEME } from '@/lib/theme';
import { getPageContent } from '@/lib/content';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { SchemaMarkup } from '@/components/shared/schema-markup';
import { localBusinessSchema } from '@/lib/seo';

const inter = Inter({ subsets: ['latin'] });

const homepage = getPageContent('/');

export const metadata: Metadata = {
  title: homepage?.metaTitle || `${BUSINESS.name} | ${BUSINESS.tagline}`,
  description: homepage?.metaDescription || `${BUSINESS.name} - ${BUSINESS.tagline}. Call ${BUSINESS.phone}.`,
  keywords: BUSINESS.name,
  openGraph: {
    title: homepage?.metaTitle || BUSINESS.name,
    description: homepage?.metaDescription || BUSINESS.tagline,
    url: BUSINESS.url,
    siteName: BUSINESS.name,
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root { --brand-primary: ${THEME.colorPrimary}; --brand-secondary: ${THEME.colorSecondary}; }`,
          }}
        />
        <SchemaMarkup data={localBusinessSchema()} />
      </head>
      <body className={inter.className}>
        <Navbar />
        {children}
        <Footer />
        <script
          src={`https://kyra.conversionsystem.com/api/widget/WIDGET_CLIENT_ID/script?v=2`}
          defer
        />
      </body>
    </html>
  );
}
