import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Phone, Star, Award, ChevronRight } from 'lucide-react';
import { BUSINESS, SERVICES, SERVICE_AREAS } from '@/lib/constants';
import { getPageContent } from '@/lib/content';
import { CTASection } from '@/components/shared/cta-section';
import { SchemaMarkup } from '@/components/shared/schema-markup';
import { breadcrumbSchema, canonicalUrl } from '@/lib/seo';

type PageProps = {
  params: Promise<{ city: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICE_AREAS.map((area) => ({ city: area.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city: slug } = await params;
  const area = SERVICE_AREAS.find((a) => a.slug === slug);

  if (!area) {
    return { title: `Services | ${BUSINESS.name}` };
  }

  return {
    title: `${BUSINESS.name} in ${area.name}, ${area.state}`,
    description: `${BUSINESS.name} proudly serves ${area.name}, ${area.state}. ${BUSINESS.tagline}. Call ${BUSINESS.phone} for a free consultation.`,
    alternates: { canonical: `/${area.slug}` },
  };
}

export default async function CityPage({ params }: PageProps) {
  const { city: slug } = await params;
  const area = SERVICE_AREAS.find((a) => a.slug === slug);

  if (!area) notFound();

  const page = getPageContent(`/${slug}`);
  const heroH1 = page?.heroH1 || `${BUSINESS.name} in ${area.name}, ${area.state}`;
  const heroSubtitle = page?.heroSubtitle ||
    `Serving ${area.name} and surrounding communities with professional services. Call us today for a free consultation.`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `${BUSINESS.name} - ${area.name}`,
    url: `${BUSINESS.url}/${area.slug}`,
    telephone: BUSINESS.phoneHref,
    areaServed: {
      '@type': 'City',
      name: area.name,
    },
    aggregateRating: BUSINESS.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: BUSINESS.rating,
      reviewCount: BUSINESS.reviewCount,
    } : undefined,
  };

  return (
    <main>
      {/* Hero */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.15),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-400 font-medium">
              Serving {area.name}, {area.state}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            {heroH1}
          </h1>

          <p className="mt-4 text-lg text-gray-400 max-w-2xl">{heroSubtitle}</p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            {BUSINESS.rating > 0 && BUSINESS.reviewCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-gray-300">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold">{BUSINESS.rating}</span> Rating
              </div>
            )}
            {BUSINESS.yearsInBusiness > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-gray-300">
                <Award className="h-4 w-4 text-red-500" />
                {BUSINESS.yearsInBusiness}+ Years Experience
              </div>
            )}
          </div>

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

      {/* Services in this city */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Our Services in {area.name}
            </h2>
            <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
              Comprehensive services for {area.name} residents and businesses. Explore our areas of expertise.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((svc) => (
              <Link
                key={svc.slug}
                href={`/${area.slug}/${svc.slug}`}
                className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-red-500/30 hover:bg-white/[0.07] transition-all"
              >
                <h3 className="text-lg font-semibold text-white mb-2">{svc.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{svc.description}</p>
                <div className="flex items-center gap-1 mt-auto text-red-400 text-sm font-medium group-hover:text-red-300 transition">
                  Learn More <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            ))}

            {/* Emergency CTA card */}
            <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 flex flex-col justify-center">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Need Help in {area.name}?</h3>
              <p className="text-sm text-red-100 mb-6">
                Contact us today for immediate assistance in {area.name} and surrounding areas.
              </p>
              <a
                href={BUSINESS.phoneHref}
                className="flex items-center justify-center gap-2 bg-white text-red-600 px-4 py-3 rounded-xl font-semibold hover:bg-red-50 transition"
              >
                <Phone className="h-4 w-4" />
                {BUSINESS.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      <CTASection />

      <SchemaMarkup data={schema} />
      <SchemaMarkup
        data={breadcrumbSchema([
          { name: 'Home', url: canonicalUrl('/') },
          { name: area.name, url: canonicalUrl(`/${area.slug}`) },
        ])}
      />
    </main>
  );
}
