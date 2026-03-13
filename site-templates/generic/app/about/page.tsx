import type { Metadata } from 'next';
import { Phone, CheckCircle2, MapPin } from 'lucide-react';
import { BUSINESS, SERVICE_AREAS } from '@/lib/constants';
import { getPageContent } from '@/lib/content';
import { CTASection } from '@/components/shared/cta-section';
import { SchemaMarkup } from '@/components/shared/schema-markup';
import { localBusinessSchema, breadcrumbSchema, canonicalUrl } from '@/lib/seo';
import Link from 'next/link';

const page = getPageContent('/about');

export const metadata: Metadata = {
  title: page?.metaTitle || `About ${BUSINESS.name}`,
  description: page?.metaDescription || `Learn about ${BUSINESS.name}. ${BUSINESS.tagline}`,
};

export default function AboutPage() {
  const cleanText = (s: string) => s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/gm, '').replace(/^:\s*/, '').trim();

  const heroH1 = cleanText(page?.heroH1 || `About ${BUSINESS.name}`);
  const heroSubtitle = cleanText(page?.heroSubtitle || BUSINESS.tagline);
  const sections = (page?.sections || []).map(s => ({
    ...s,
    heading: cleanText(s.heading || ''),
    body: cleanText(s.body || ''),
    bullets: s.bullets?.map((b: string) => cleanText(b)) || [],
  }));

  return (
    <main className="bg-black text-white">
      {/* Hero */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-red-400 text-sm font-semibold uppercase tracking-wider mb-4">
            About Us
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">{heroH1}</h1>
          <p className="mt-5 text-lg text-gray-300 max-w-3xl">{heroSubtitle}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a
              href={BUSINESS.phoneHref}
              className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition"
            >
              <Phone className="h-5 w-5" />
              Call {BUSINESS.phone}
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center border border-white/20 hover:bg-white/5 text-white px-6 py-3 rounded-xl font-semibold transition"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Sections from pages.json */}
      {sections.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8">
            {sections.map((section, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-4">{section.heading}</h2>
                <div className="space-y-3 mb-4">
                  {section.body.split('\n').filter(Boolean).map((para: string, pIdx: number) => (
                    <p key={pIdx} className="text-gray-300 leading-relaxed">{para}</p>
                  ))}
                </div>
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-2 text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-red-500 shrink-0" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Service Areas — only show if areas exist */}
      {SERVICE_AREAS.length > 0 && <section className="py-20 sm:py-28 bg-gray-900/50 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Areas We Serve</h2>
          <p className="text-gray-300 mb-8 max-w-2xl">
            We proudly serve clients across multiple communities.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {SERVICE_AREAS.map((area) => (
              <Link
                key={area.slug}
                href={`/${area.slug}`}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2 hover:border-red-500/30 transition"
              >
                <MapPin className="h-4 w-4 text-red-500" />
                <span className="text-sm text-gray-200">{area.name}, {area.state}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>}

      <CTASection />

      <SchemaMarkup data={localBusinessSchema()} />
      <SchemaMarkup
        data={breadcrumbSchema([
          { name: 'Home', url: canonicalUrl('/') },
          { name: 'About', url: canonicalUrl('/about') },
        ])}
      />
    </main>
  );
}
