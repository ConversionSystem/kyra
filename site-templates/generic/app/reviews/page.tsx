import type { Metadata } from 'next';
import { Phone, Star, MessageCircle } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';
import { getPageContent } from '@/lib/content';
import { CTASection } from '@/components/shared/cta-section';
import { TestimonialCard } from '@/components/shared/testimonial-card';
import { SchemaMarkup } from '@/components/shared/schema-markup';
import { breadcrumbSchema, canonicalUrl } from '@/lib/seo';

function cleanText(s: string): string {
  return s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/gm, '').replace(/^:\s*/, '').trim();
}

const page = getPageContent('/reviews');

export const metadata: Metadata = {
  title: page?.metaTitle ? cleanText(page.metaTitle) : `Reviews | ${BUSINESS.name}`,
  description: page?.metaDescription
    ? cleanText(page.metaDescription)
    : `Read client reviews for ${BUSINESS.name}. ${BUSINESS.rating > 0 ? BUSINESS.rating + ' star rating.' : ''}`,
};

export default function ReviewsPage() {
  const heroH1 = cleanText(page?.heroH1 || 'What Our Customers Say');
  // Clean subtitle — remove "0 reviews" references if no reviews exist
  let heroSubtitle = cleanText(page?.heroSubtitle || `See why clients trust ${BUSINESS.name}.`);
  if ((BUSINESS.reviewCount as number) === 0 || !BUSINESS.reviewCount) {
    heroSubtitle = heroSubtitle
      .replace(/based on 0 reviews\.?/gi, '')
      .replace(/\(0 reviews\)/gi, '')
      .replace(/0 reviews/gi, '')
      .trim();
    if (!heroSubtitle) heroSubtitle = `See why clients trust ${BUSINESS.name}.`;
  }
  const testimonials = page?.testimonials || [];
  const hasRating = BUSINESS.rating > 0;
  const hasReviews = BUSINESS.reviewCount > 0;

  return (
    <main className="bg-black text-white">
      {/* Header */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold">{heroH1}</h1>
          <p className="mt-4 text-lg text-gray-300 max-w-3xl">{heroSubtitle}</p>
          {hasRating && (
            <div className="flex items-center gap-2 mt-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${star <= Math.round(BUSINESS.rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`}
                />
              ))}
              <span className="text-gray-400 ml-1">
                {BUSINESS.rating}/5{hasReviews && ` (${BUSINESS.reviewCount} reviews)`}
              </span>
            </div>
          )}
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

      {/* Testimonials Grid */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {testimonials.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <TestimonialCard key={t.name} name={t.name} text={t.text} rating={t.rating} />
              ))}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/5 border border-white/10 mb-6">
                <MessageCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Client Reviews Coming Soon</h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                We are building our review presence. In the meantime, give us a call to hear directly 
                from our team about how we can help with your needs.
              </p>
              <a
                href={BUSINESS.phoneHref}
                className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-3 font-semibold transition"
              >
                <Phone className="h-4 w-4" />
                Call {BUSINESS.phone}
              </a>
            </div>
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
