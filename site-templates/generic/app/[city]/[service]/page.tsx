import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Phone, Star, Award, CheckCircle2, MapPin, Shield } from 'lucide-react';
import { BUSINESS, SERVICES, SERVICE_AREAS } from '@/lib/constants';
import { getPageContent } from '@/lib/content';
import { CTASection } from '@/components/shared/cta-section';
import { SchemaMarkup } from '@/components/shared/schema-markup';
import { serviceSchema, breadcrumbSchema, canonicalUrl } from '@/lib/seo';

type RouteParams = {
  city: string;
  service: string;
};

type PageProps = {
  params: Promise<RouteParams>;
};

export const dynamicParams = false;

export function generateStaticParams(): RouteParams[] {
  return SERVICE_AREAS.flatMap((area) =>
    SERVICES.map((svc) => ({
      city: area.slug,
      service: svc.slug,
    }))
  );
}

function getAreaAndService(p: RouteParams) {
  const area = SERVICE_AREAS.find((a) => a.slug === p.city);
  const service = SERVICES.find((s) => s.slug === p.service);
  return { area, service };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const { area, service } = getAreaAndService(resolved);

  if (!area || !service) {
    return { title: `Services | ${BUSINESS.name}` };
  }

  const title = `${service.name} in ${area.name}, ${area.state} | ${BUSINESS.name}`;
  const description = `${service.description} Serving ${area.name}, ${area.state}. Call ${BUSINESS.phone} for a free consultation.`;

  return {
    title,
    description,
    alternates: { canonical: `/${area.slug}/${service.slug}` },
  };
}

export default async function CityServicePage({ params }: PageProps) {
  const resolved = await params;
  const { area, service } = getAreaAndService(resolved);

  if (!area || !service) notFound();

  const page = getPageContent(`/${area.slug}/${service.slug}`);
  const heroH1 = page?.heroH1 || `${service.name} in ${area.name}, ${area.state}`;
  const heroSubtitle = page?.heroSubtitle || service.description;
  const sections = page?.sections || [];

  // Get service page content as fallback for more details
  const servicePageContent = getPageContent(`/services/${service.slug}`);
  const combinedSections = sections.length > 0 ? sections : (servicePageContent?.sections || []);

  return (
    <main className="pt-28 sm:pt-32">
      {/* Hero */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-gray-900 to-black border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <p className="text-sm text-red-400 font-medium mb-4">
              <Link href={`/${area.slug}`} className="hover:text-red-300">
                {area.name} Services
              </Link>
              {' / '}
              {service.name}
            </p>

            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              {heroH1}
            </h1>

            <p className="mt-5 text-lg text-gray-300 max-w-3xl">{heroSubtitle}</p>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <a
                href={BUSINESS.phoneHref}
                className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl font-semibold transition"
              >
                <Phone className="h-5 w-5" />
                Call {BUSINESS.phone}
              </a>
              <Link
                href={`/${area.slug}`}
                className="inline-flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl font-medium transition"
              >
                <MapPin className="h-5 w-5" />
                All {area.name} Services
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid md:grid-cols-3 gap-4 mt-10">
            {BUSINESS.rating > 0 && BUSINESS.reviewCount > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-3">
                <Star className="h-5 w-5 text-yellow-400" />
                <div className="text-sm text-gray-200">
                  <span className="font-semibold text-white">{BUSINESS.rating} rating</span> ({BUSINESS.reviewCount} reviews)
                </div>
              </div>
            )}
            {BUSINESS.yearsInBusiness > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-3">
                <Award className="h-5 w-5 text-red-500" />
                <div className="text-sm text-gray-200">
                  <span className="font-semibold text-white">{BUSINESS.yearsInBusiness}+ years</span> of experience
                </div>
              </div>
            )}
            {BUSINESS.license && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-500" />
                <div className="text-sm text-gray-200">
                  <span className="font-semibold text-white">Licensed</span> {BUSINESS.license}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Why choose us in this city */}
      <section className="py-20 sm:py-28 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Why {area.name} Residents Choose {BUSINESS.name}
          </h2>
          <p className="text-gray-400 max-w-3xl mb-10">
            We provide dedicated {service.name.toLowerCase()} services to {area.name} and surrounding communities with the expertise and care your case deserves.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <article className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <Shield className="h-6 w-6 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-white">Experienced Team</h3>
              <p className="text-sm text-gray-400 mt-3">
                Our experienced professionals serve {area.name} clients with expertise built over {BUSINESS.yearsInBusiness}+ years in the field.
              </p>
            </article>
            <article className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <MapPin className="h-6 w-6 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-white">Local Knowledge</h3>
              <p className="text-sm text-gray-400 mt-3">
                We understand the {area.name} community and tailor our services to meet local needs with personalized attention.
              </p>
            </article>
            <article className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <Phone className="h-6 w-6 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-white">Responsive Service</h3>
              <p className="text-sm text-gray-400 mt-3">
                We prioritize responsiveness and keep you informed every step of the way. Your satisfaction is our top priority.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Content sections */}
      {combinedSections.length > 0 && (
        <section className="py-20 sm:py-28 bg-gray-900/60 border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            {combinedSections.map((section, idx) => (
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

      {/* Map / CTA Section */}
      <section className="py-20 sm:py-28 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Serving {area.name}, {area.state} and Surrounding Areas
          </h2>
          <p className="text-gray-400 mt-4 max-w-2xl mb-8">
            Contact us for {service.name.toLowerCase()} services in {area.name} and nearby communities. We are ready to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={BUSINESS.phoneHref}
              className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl font-semibold transition"
            >
              <Phone className="h-5 w-5" />
              Call {BUSINESS.phone}
            </a>
            <Link
              href={`/${area.slug}`}
              className="inline-flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl font-medium transition"
            >
              View All {area.name} Services
            </Link>
          </div>
        </div>
      </section>

      <CTASection />

      <SchemaMarkup data={serviceSchema(service.name, service.description, area.name)} />
      <SchemaMarkup
        data={breadcrumbSchema([
          { name: 'Home', url: canonicalUrl('/') },
          { name: area.name, url: canonicalUrl(`/${area.slug}`) },
          { name: service.name, url: canonicalUrl(`/${area.slug}/${service.slug}`) },
        ])}
      />
    </main>
  );
}
