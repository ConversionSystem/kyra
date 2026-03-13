'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Menu, X } from 'lucide-react';
import { BUSINESS, SERVICES } from '@/lib/constants';

const NAV_LINKS = [
  { label: 'Services', href: `/services/${SERVICES[0]?.slug || ''}` },
  { label: 'About', href: '/about' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
      {/* Emergency / notice banner */}
      {BUSINESS.emergencyText ? (
        <div className="bg-red-600 text-white text-center py-1.5 text-sm font-medium">
          <a href={BUSINESS.phoneHref} className="hover:underline">
            {BUSINESS.emergencyText} - Call {BUSINESS.phone}
          </a>
        </div>
      ) : null}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Business name */}
          <Link href="/" className="flex items-center gap-3">
            <div>
              <div className="text-lg font-bold text-white leading-tight">{BUSINESS.name}</div>
              {BUSINESS.tagline && (
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                  {BUSINESS.tagline}
                </div>
              )}
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-gray-300 hover:text-white transition"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={BUSINESS.phoneHref}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              <Phone className="h-4 w-4" />
              {BUSINESS.phone}
            </a>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-white p-2"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden bg-gray-900 border-t border-white/10 px-4 pb-4 space-y-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-gray-300 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <a
            href={BUSINESS.phoneHref}
            className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold mt-2"
          >
            <Phone className="h-4 w-4" />
            Call {BUSINESS.phone}
          </a>
        </div>
      )}
    </header>
  );
}
