import Link from 'next/link';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { BUSINESS, SERVICES, SERVICE_AREAS } from '@/lib/constants';

export function Footer() {
  const hoursDisplay = String(BUSINESS.hours.mon) !== 'Closed'
    ? `Mon-Fri: ${BUSINESS.hours.mon}`
    : 'See hours on contact page';

  return (
    <footer className="border-t border-white/10 bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <span className="font-bold text-white text-lg">{BUSINESS.name}</span>
            {BUSINESS.tagline && (
              <p className="text-sm text-gray-400 mt-2">{BUSINESS.tagline}</p>
            )}
            {BUSINESS.license && (
              <p className="text-sm text-gray-400 mt-1">{BUSINESS.license}</p>
            )}
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Services
            </h4>
            <div className="space-y-2">
              {SERVICES.map((s) => (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className="block text-sm text-gray-400 hover:text-white transition"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Service Areas — only show if areas exist */}
          {SERVICE_AREAS.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                Service Areas
              </h4>
              <div className="space-y-2">
                {SERVICE_AREAS.slice(0, 6).map((area) => (
                  <Link
                    key={area.slug}
                    href={`/${area.slug}`}
                    className="block text-sm text-gray-400 hover:text-white transition"
                  >
                    {area.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
              Contact
            </h4>
            <div className="space-y-3">
              <a
                href={BUSINESS.phoneHref}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
              >
                <Phone className="h-4 w-4 text-red-500" />
                {BUSINESS.phone}
              </a>
              <a
                href={`mailto:${BUSINESS.email}`}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
              >
                <Mail className="h-4 w-4 text-red-500" />
                {BUSINESS.email}
              </a>
              <div className="flex items-start gap-2 text-sm text-gray-400">
                <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                {BUSINESS.address}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="h-4 w-4 text-red-500" />
                {hoursDisplay}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
