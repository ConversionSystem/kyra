import type { Metadata } from 'next';
import { Phone, Star } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';
import { getPageContent } from '@/lib/content';
import { CTASection } from '@/components/shared/cta-section';
import { TestimonialCard } from '@/components/shared/testimonial-card';
import { SchemaMarkup } from '@/components/shared/schema-markup';
import { breadcrumbSchema, canonicalUrl } from '@/lib/seo';

const page = getPageContent('/reviews');

export const metadata: Metadata = {
  title: page?.metaTitle || `Reviews | ${BUSINESS.name}`,
  description: page?.metaDescription || `Read client reviews for ${BUSINESS.name}. ${BUSINESS.rating} star rating.`,
};

export default function ReviewsPage() {
  const heroH1 = page?.heroH1 || 'What Our Clients Say';
  const heroSubtitle = page?.heroSubtitle || 'Real reviews from real clients.';
  const testimonials = page?.testimonials || [];

  return (
    <main className="bg-black text-white">
      {/* Header */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold">{heroH1}</h1>
          <p className="mt-4 text-lg text-gray-300 max-w-3xl">{heroSubtitle}</p>
          <div className="mt-8">
            <a
              href={BUSINESS.phoneHref}
              className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-3 font-semibold transition"
            >
              <Phone className="h-5 w-5" />
              Call {BUSINESS.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Rating Summary */}
      {BUSINESS.rating > 0 && BUSINESS.reviewCount > 0 && (
        <section className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <p className="text-sm uppercase tracking-wider text-red-400 font-semibold">
                Overall Rating
              </p>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mt-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-5xl font-bold">{BUSINESS.rating}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < Math.round(BUSINESS.rating)
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-300 mt-1">Based on {BUSINESS.reviewCount} reviews</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Grid */}
      <section className="py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {testimonials.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <TestimonialCard key={t.name} name={t.name} text={t.text} rating={t.rating} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center">
              Reviews coming soon. Contact us to learn more about our services.
            </p>
          )}
        </div>
      </section>

      <CTASection />

      <SchemaMarkup
        data={breadcrumbSchema([
          { name: 'Home', url: canonicalUrl('/') },
          { name: 'Reviews', url: canonicalUrl('/reviews') },
        ])}
      />
    </main>
  );
}
