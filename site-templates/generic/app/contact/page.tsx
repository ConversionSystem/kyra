import type { Metadata } from 'next';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';
import { getPageContent } from '@/lib/content';
import { CTASection } from '@/components/shared/cta-section';
import { SchemaMarkup } from '@/components/shared/schema-markup';
import { breadcrumbSchema, canonicalUrl } from '@/lib/seo';
import { ContactForm } from './contact-form';

const page = getPageContent('/contact');

export const metadata: Metadata = {
  title: page?.metaTitle || `Contact ${BUSINESS.name}`,
  description: page?.metaDescription || `Contact ${BUSINESS.name}. Call ${BUSINESS.phone} or visit our office.`,
};

export default function ContactPage() {
  const heroH1 = page?.heroH1 || `Contact ${BUSINESS.name}`;
  const heroSubtitle = page?.heroSubtitle || `Reach out for assistance. We are here to help.`;

  return (
    <main className="bg-black text-white">
      {/* Header */}
      <section className="pt-32 pb-12 sm:pt-40 sm:pb-16 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold">{heroH1}</h1>
          <p className="mt-4 text-lg text-gray-300 max-w-3xl">{heroSubtitle}</p>
        </div>
      </section>

      {/* Quick Call Banner */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-white font-semibold text-lg">Need immediate help? Call us now</p>
            <a
              href={BUSINESS.phoneHref}
              className="inline-flex items-center justify-center gap-2 bg-white text-red-600 rounded-xl px-5 py-3 font-semibold hover:bg-red-50 transition"
            >
              <Phone className="h-5 w-5" />
              {BUSINESS.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
            <div className="space-y-5">
              <a
                href={BUSINESS.phoneHref}
                className="flex items-start gap-3 text-gray-200 hover:text-white transition"
              >
                <span className="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center mt-0.5">
                  <Phone className="h-5 w-5 text-red-500" />
                </span>
                <span>
                  <span className="block text-sm text-gray-400">Phone</span>
                  <span className="font-semibold">{BUSINESS.phone}</span>
                </span>
              </a>

              <a
                href={`mailto:${BUSINESS.email}`}
                className="flex items-start gap-3 text-gray-200 hover:text-white transition"
              >
                <span className="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center mt-0.5">
                  <Mail className="h-5 w-5 text-red-500" />
                </span>
                <span>
                  <span className="block text-sm text-gray-400">Email</span>
                  <span className="font-semibold">{BUSINESS.email}</span>
                </span>
              </a>

              <div className="flex items-start gap-3 text-gray-200">
                <span className="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center mt-0.5">
                  <MapPin className="h-5 w-5 text-red-500" />
                </span>
                <span>
                  <span className="block text-sm text-gray-400">Address</span>
                  <span className="font-semibold">{BUSINESS.address}</span>
                </span>
              </div>

              <div className="flex items-start gap-3 text-gray-200">
                <span className="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center mt-0.5">
                  <Clock className="h-5 w-5 text-red-500" />
                </span>
                <span>
                  <span className="block text-sm text-gray-400">Hours</span>
                  <span className="font-semibold">Mon-Fri: {BUSINESS.hours.mon}</span>
                  {String(BUSINESS.hours.sat) !== 'Closed' && (
                    <span className="block text-sm text-gray-400">Sat: {BUSINESS.hours.sat}</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold mb-2">Send Us a Message</h2>
            <p className="text-gray-400 mb-6">Fill out the form and we will get back to you shortly.</p>
            <ContactForm />
          </div>
        </div>
      </section>

      <CTASection />

      <SchemaMarkup
        data={breadcrumbSchema([
          { name: 'Home', url: canonicalUrl('/') },
          { name: 'Contact', url: canonicalUrl('/contact') },
        ])}
      />
    </main>
  );
}
