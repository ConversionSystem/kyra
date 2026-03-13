import { Phone, ArrowRight, Star, Award, Shield } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';

type HeroSectionProps = {
  h1: string;
  subtitle: string;
  showBadges?: boolean;
  ctaText?: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
};

export function HeroSection({
  h1,
  subtitle,
  showBadges = true,
  ctaText,
  ctaHref,
  secondaryCtaText = 'Contact Us',
  secondaryCtaHref = '/contact',
}: HeroSectionProps) {
  return (
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
          {h1}
        </h1>

        <p className="mt-4 text-lg text-gray-400 max-w-2xl">
          {subtitle}
        </p>

        {showBadges && (
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
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <a
            href={ctaHref || BUSINESS.phoneHref}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl text-lg font-semibold transition shadow-lg shadow-red-600/25"
          >
            <Phone className="h-5 w-5" />
            {ctaText || `Call ${BUSINESS.phone}`}
          </a>
          <a
            href={secondaryCtaHref}
            className="flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl text-lg font-medium transition"
          >
            {secondaryCtaText}
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </div>
    </section>
  );
}
