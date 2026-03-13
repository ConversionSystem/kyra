import type { Metadata } from 'next';
import { Phone } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';
import { getPageContent } from '@/lib/content';
import { CTASection } from '@/components/shared/cta-section';
import { FAQAccordion } from '@/components/shared/faq-accordion';
import { SchemaMarkup } from '@/components/shared/schema-markup';
import { faqSchema, breadcrumbSchema, canonicalUrl } from '@/lib/seo';

const page = getPageContent('/faq');

export const metadata: Metadata = {
  title: page?.metaTitle || `FAQ | ${BUSINESS.name}`,
  description: page?.metaDescription || `Frequently asked questions about ${BUSINESS.name} services.`,
};

export default function FAQPage() {
  const heroH1 = page?.heroH1 || 'Frequently Asked Questions';
  const heroSubtitle = page?.heroSubtitle || `Answers to common questions about our services.`;
  const faqs = page?.faq || [];

  return (
    <main className="bg-black text-white">
      {/* Header */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold">{heroH1}</h1>
          <p className="mt-4 text-lg text-gray-300 max-w-3xl">{heroSubtitle}</p>
          <a
            href={BUSINESS.phoneHref}
            className="mt-7 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-3 font-semibold transition"
          >
            <Phone className="h-5 w-5" />
            Call {BUSINESS.phone}
          </a>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {faqs.length > 0 ? (
            <FAQAccordion items={faqs} />
          ) : (
            <p className="text-gray-400 text-center">
              No FAQs available yet. Please contact us with your questions.
            </p>
          )}
        </div>
      </section>

      <CTASection />

      {faqs.length > 0 && <SchemaMarkup data={faqSchema(faqs)} />}
      <SchemaMarkup
        data={breadcrumbSchema([
          { name: 'Home', url: canonicalUrl('/') },
          { name: 'FAQ', url: canonicalUrl('/faq') },
        ])}
      />
    </main>
  );
}
