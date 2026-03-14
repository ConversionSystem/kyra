import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Phone, CheckCircle2, ChevronRight, MapPin, ArrowRight } from 'lucide-react';
import { BUSINESS, SERVICES, SERVICE_AREAS } from '@/lib/constants';
import { getPageContent } from '@/lib/content';
import { CTASection } from '@/components/shared/cta-section';
import { FAQAccordion } from '@/components/shared/faq-accordion';
import { SchemaMarkup } from '@/components/shared/schema-markup';
import { serviceSchema, faqSchema, breadcrumbSchema, canonicalUrl } from '@/lib/seo';

type PageProps = {
  params: Promise<{ slug: string }>;
};

// Strip markdown artifacts from AI content
function cleanText(s: string): string {
  return s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/gm, '').replace(/^:\s*/, '').trim();
}

// Section headings that should be hidden (they're structural, not display headings)
const HIDDEN_HEADINGS = ['opening', 'intro', 'introduction', 'overview'];
const CTA_HEADINGS = ['cta', 'call to action', 'get started', 'contact us'];

function isHiddenHeading(heading: string): boolean {
  return HIDDEN_HEADINGS.includes(heading.toLowerCase().trim());
}

function isCTAHeading(heading: string): boolean {
  return CTA_HEADINGS.includes(heading.toLowerCase().trim());
}

function isDuplicateOfHero(heading: string, heroH1: string, serviceName: string): boolean {
  const h = heading.toLowerCase().trim();
  const hero = heroH1.toLowerCase().trim();
  const svc = serviceName.toLowerCase().trim();
  // Skip if the section heading is the same as hero or just the service name repeated
  return h === hero || h === svc || (h.includes(svc) && h.includes('in') && h.length < hero.length + 20);
}

export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICES.map((svc) => ({ slug: svc.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  const page = getPageContent(`/services/${slug}`);

  if (!service) {
    return { title: `Services | ${BUSINESS.name}` };
  }

  return {
    title: cleanText(page?.metaTitle || `${service.name} | ${BUSINESS.name}`),
    description: cleanText(page?.metaDescription || `${service.description} Contact ${BUSINESS.name} at ${BUSINESS.phone}.`),
    alternates: { canonical: `/services/${slug}` },
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);

  if (!service) notFound();

  const page = getPageContent(`/services/${slug}`);

  const heroH1 = cleanText(page?.heroH1 || service.name);
  const heroSubtitle = cleanText(page?.heroSubtitle || service.description);
  const allSections = (page?.sections || []).map(s => ({
    ...s,
    heading: cleanText(s.heading || ''),
    body: cleanText(s.body || ''),
    bullets: s.bullets?.map((b: string) => cleanText(b)) || [],
  }));
  const faqs = page?.faq || [];

  // Categorize sections: intro (opening), main content, CTA, duplicates
  const introSection = allSections.find(s => isHiddenHeading(s.heading));
  const ctaSection = allSections.find(s => isCTAHeading(s.heading));
  const contentSections = allSections.filter(s =>
    !isHiddenHeading(s.heading) &&
    !isCTAHeading(s.heading) &&
    !isDuplicateOfHero(s.heading, heroH1, service.name) &&
    (s.body || s.bullets.length > 0)
  );

  return (
    <main className="bg-black text-white">
      {/* Hero */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.15),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-red-400 font-medium mb-4">
            <Link href="/" className="hover:text-red-300">Home</Link>
            {' / '}
            <span>{service.name}</span>
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-4xl">
            {heroH1}
          </h1>

          <p className="mt-4 text-lg text-gray-400 max-w-2xl">{heroSubtitle}</p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <a
              href={BUSINESS.phoneHref}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl text-lg font-semibold transition shadow-lg shadow-red-600/25"
            >
              <Phone className="h-5 w-5" />
              Call {BUSINESS.phone}
            </a>
            <Link
              href="/contact"
              className="flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl text-lg font-medium transition"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Intro section (from "Opening") — no heading, just the body text */}
      {introSection && introSection.body && (
        <section className="py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-4">
              {introSection.body.split('\n').filter(Boolean).map((para, idx) => (
                <p key={idx} className="text-gray-300 text-lg leading-relaxed">{para}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Content Sections */}
      {contentSections.length > 0 && (
        <section className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
            {contentSections.map((section, idx) => (
              <div key={idx}>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">{section.heading}</h2>

                {/* Body text */}
                {section.body && (
                  <div className="max-w-3xl space-y-3 mb-8">
                    {section.body.split('\n').filter(Boolean).map((para, pIdx) => (
                      <p key={pIdx} className="text-gray-400 leading-relaxed">{para}</p>
                    ))}
                  </div>
                )}

                {/* Bullets as cards */}
                {section.bullets.length > 0 && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-3">
                        <div className="h-8 w-8 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="h-4 w-4 text-red-500" />
                        </div>
                        <p className="text-sm text-gray-200">{bullet}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA Section (from AI "CTA" section) — rendered as a styled call-to-action, not a generic heading */}
      {ctaSection && ctaSection.body && (
        <section className="py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Get Help With Your {service.name} Case
              </h2>
              <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto mb-8">{ctaSection.body}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href={BUSINESS.phoneHref}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl text-lg font-semibold transition shadow-lg shadow-red-600/25"
                >
                  <Phone className="h-5 w-5" />
                  Call {BUSINESS.phone}
                </a>
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl text-lg font-medium transition"
                >
                  Send a Message
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Service Areas */}
      {SERVICE_AREAS.length > 0 && (
        <section className="py-20 sm:py-28 bg-gray-900/50 border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {service.name} in Your Area
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl">
              We provide {service.name.toLowerCase()} services across multiple locations. Find us near you.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {SERVICE_AREAS.map((area) => (
                <Link
                  key={area.slug}
                  href={`/${area.slug}/${service.slug}`}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-red-400 transition bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  {area.name}
                  <ChevronRight className="h-3.5 w-3.5 ml-auto text-gray-600" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">
              Frequently Asked Questions
            </h2>
            <FAQAccordion items={faqs} />
          </div>
        </section>
      )}

      <CTASection />

      <SchemaMarkup data={serviceSchema(service.name, service.description)} />
      {faqs.length > 0 && <SchemaMarkup data={faqSchema(faqs)} />}
      <SchemaMarkup
        data={breadcrumbSchema([
          { name: 'Home', url: canonicalUrl('/') },
          { name: service.name, url: canonicalUrl(`/services/${service.slug}`) },
        ])}
      />
    </main>
  );
}
