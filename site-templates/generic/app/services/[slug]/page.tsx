import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Phone, CheckCircle2, ChevronRight, MapPin } from 'lucide-react';
import { BUSINESS, SERVICES, SERVICE_AREAS } from '@/lib/constants';
import { getPageContent } from '@/lib/content';
import { CTASection } from '@/components/shared/cta-section';
import { FAQAccordion } from '@/components/shared/faq-accordion';
import { SchemaMarkup } from '@/components/shared/schema-markup';
import { serviceSchema, faqSchema, breadcrumbSchema, canonicalUrl } from '@/lib/seo';

type PageProps = {
  params: Promise<{ slug: string }>;
};

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
    title: page?.metaTitle || `${service.name} | ${BUSINESS.name}`,
    description: page?.metaDescription || `${service.description} Contact ${BUSINESS.name} at ${BUSINESS.phone}.`,
    alternates: { canonical: `/services/${slug}` },
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);

  if (!service) notFound();

  const page = getPageContent(`/services/${slug}`);
  const heroH1 = page?.heroH1 || service.name;
  const heroSubtitle = page?.heroSubtitle || service.description;
  const sections = page?.sections || [];
  const faqs = page?.faq || [];

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

      {/* Content Sections */}
      {sections.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            {sections.map((section, idx) => (
              <div key={idx}>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{section.heading}</h2>
                <p className="text-gray-400 max-w-3xl mb-6">{section.body}</p>
                {section.bullets && section.bullets.length > 0 && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.bullets.map((bullet) => (
                      <div key={bullet} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-3">
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

      {/* Service Areas for this service */}
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
