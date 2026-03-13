import Link from 'next/link';
import {
  Phone, Star, Award, CheckCircle2, ChevronRight, MapPin, ArrowRight, Shield,
} from 'lucide-react';
import { BUSINESS, SERVICES, SERVICE_AREAS } from '@/lib/constants';
import { getPageContent } from '@/lib/content';
import { CTASection } from '@/components/shared/cta-section';
import { TestimonialCard } from '@/components/shared/testimonial-card';
import { SchemaMarkup } from '@/components/shared/schema-markup';
import { faqSchema } from '@/lib/seo';

export default function HomePage() {
  const page = getPageContent('/');

  const heroH1 = page?.heroH1 || `Welcome to ${BUSINESS.name}`;
  const heroSubtitle = page?.heroSubtitle || BUSINESS.tagline;
  const sections = page?.sections || [];
  const testimonials = page?.testimonials || [];
  const faqs = page?.faq || [];

  return (
    <main>
      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.15),transparent_60%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {BUSINESS.license && (
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-400 font-medium">{BUSINESS.license}</span>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-4xl">
            {heroH1}
          </h1>

          <p className="mt-4 text-lg text-gray-400 max-w-2xl">{heroSubtitle}</p>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            {BUSINESS.rating > 0 && BUSINESS.reviewCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-gray-300">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold">{BUSINESS.rating}</span> Rating ({BUSINESS.reviewCount} reviews)
              </div>
            )}
            {BUSINESS.yearsInBusiness > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-gray-300">
                <Award className="h-4 w-4 text-red-500" />
                {BUSINESS.yearsInBusiness}+ Years Experience
              </div>
            )}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <a
              href={BUSINESS.phoneHref}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl text-lg font-semibold transition shadow-lg shadow-red-600/25"
            >
              <Phone className="h-5 w-5" />
              Call Now - {BUSINESS.phone}
            </a>
            <a
              href="/contact"
              className="flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl text-lg font-medium transition"
            >
              Contact Us
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-white/10 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {BUSINESS.yearsInBusiness > 0 && (
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-red-500">{BUSINESS.yearsInBusiness}+</div>
                <div className="text-sm text-gray-400 mt-1">Years Experience</div>
              </div>
            )}
            {BUSINESS.rating > 0 && (
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-red-500">{BUSINESS.rating}</div>
                <div className="text-sm text-gray-400 mt-1">Star Rating</div>
              </div>
            )}
            {BUSINESS.reviewCount > 0 && (
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-red-500">{BUSINESS.reviewCount}+</div>
                <div className="text-sm text-gray-400 mt-1">Client Reviews</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-red-500">{SERVICE_AREAS.length}+</div>
              <div className="text-sm text-gray-400 mt-1">Areas Served</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Our Services</h2>
            <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
              Comprehensive solutions tailored to your needs. Explore our areas of expertise.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((svc) => (
              <Link
                key={svc.slug}
                href={`/services/${svc.slug}`}
                className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-red-500/30 hover:bg-white/[0.07] transition-all"
              >
                <h3 className="text-lg font-semibold text-white mb-2">{svc.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{svc.description}</p>
                <div className="flex items-center gap-1 mt-auto text-red-400 text-sm font-medium group-hover:text-red-300 transition">
                  Learn More <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            ))}

            {/* Phone CTA card */}
            <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 flex flex-col justify-center">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Need Help Now?</h3>
              <p className="text-sm text-red-100 mb-6">
                Call us today for immediate assistance. We are ready to help.
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

      {/* Why Choose Us (from pages.json sections) */}
      {sections.length > 0 && (
        <section className="py-20 sm:py-28 bg-gray-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {sections.map((section, idx) => (
              <div key={idx} className={idx > 0 ? 'mt-16' : ''}>
                <div className="text-center mb-10">
                  <h2 className="text-3xl sm:text-4xl font-bold text-white">{section.heading}</h2>
                  <p className="mt-3 text-gray-400 max-w-3xl mx-auto">{section.body}</p>
                </div>

                {section.bullets && section.bullets.length > 0 && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    {section.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-red-500 shrink-0" />
                        <span className="text-gray-300">{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white">What Our Clients Say</h2>
              <p className="mt-3 text-gray-400">Real reviews from real clients</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {testimonials.map((t) => (
                <TestimonialCard key={t.name} name={t.name} text={t.text} rating={t.rating} />
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                href="/reviews"
                className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-medium transition"
              >
                See All Reviews <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Service Areas */}
      <section className="py-20 sm:py-28 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Areas We Serve</h2>
            <p className="text-gray-400 max-w-2xl">
              Proudly serving clients across multiple locations. Contact us to learn more about our services in your area.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {SERVICE_AREAS.map((area) => (
              <Link
                key={area.slug}
                href={`/${area.slug}`}
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-red-400 transition bg-white/5 border border-white/10 rounded-xl px-4 py-3"
              >
                <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                {area.name}, {area.state}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection />

      {/* FAQ Schema */}
      {faqs.length > 0 && <SchemaMarkup data={faqSchema(faqs)} />}
    </main>
  );
}
