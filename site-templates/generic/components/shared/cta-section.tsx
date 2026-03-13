import { Phone, MessageSquare } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';

type CTASectionProps = {
  heading?: string;
  subtitle?: string;
};

export function CTASection({
  heading = 'Ready to Get Started?',
  subtitle = 'Contact us today for a free consultation. We are here to help.',
}: CTASectionProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-3xl p-8 sm:p-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">{heading}</h2>
          <p className="text-red-100 max-w-lg mx-auto mb-8">{subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={BUSINESS.phoneHref}
              className="flex items-center justify-center gap-2 bg-white text-red-600 px-6 py-3.5 rounded-xl text-lg font-semibold hover:bg-red-50 transition"
            >
              <Phone className="h-5 w-5" />
              Call {BUSINESS.phone}
            </a>
            <a
              href="/contact"
              className="flex items-center justify-center gap-2 border-2 border-white/30 text-white px-6 py-3.5 rounded-xl text-lg font-medium hover:bg-white/10 transition"
            >
              <MessageSquare className="h-5 w-5" />
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
