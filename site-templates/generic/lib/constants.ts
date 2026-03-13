// ── Business Constants ─────────────────────────────────────────────────────
// TEMPLATE FILE - Will be overwritten by the Kyra build service.
// Sample data below is for a law firm to verify the template builds correctly.

export const BUSINESS = {
  name: 'Carter & Associates Law Firm',
  phone: '(555) 987-6543',
  phoneHref: 'tel:+15559876543',
  email: 'info@carterlaw.com',
  address: '450 Market Street, Suite 200, San Francisco, CA 94105',
  license: '',
  rating: 4.9,
  reviewCount: 47,
  yearsInBusiness: 15,
  hours: {
    mon: '8:00 AM - 6:00 PM',
    tue: '8:00 AM - 6:00 PM',
    wed: '8:00 AM - 6:00 PM',
    thu: '8:00 AM - 6:00 PM',
    fri: '8:00 AM - 6:00 PM',
    sat: '9:00 AM - 1:00 PM',
    sun: 'Closed',
  },
  coordinates: { lat: 37.7909, lng: -122.3987 },
  tagline: 'Fighting for Your Rights Since 2011',
  url: 'https://carterlaw.com',
  emergencyText: '',
} as const;

export const SERVICES = [
  {
    name: 'Personal Injury',
    slug: 'personal-injury',
    description: 'Aggressive representation for accident victims. We fight to get you the compensation you deserve for medical bills, lost wages, and pain and suffering.',
  },
  {
    name: 'Family Law',
    slug: 'family-law',
    description: 'Compassionate guidance through divorce, custody disputes, child support, and other family matters. Protecting what matters most.',
  },
  {
    name: 'Criminal Defense',
    slug: 'criminal-defense',
    description: 'Experienced defense attorneys protecting your rights. From misdemeanors to serious felonies, we build the strongest possible defense.',
  },
  {
    name: 'Estate Planning',
    slug: 'estate-planning',
    description: 'Protect your legacy with comprehensive wills, trusts, and estate plans tailored to your unique situation and goals.',
  },
  {
    name: 'Business Law',
    slug: 'business-law',
    description: 'Strategic legal counsel for businesses of all sizes. Contracts, formation, disputes, and compliance handled with precision.',
  },
] as const;

export const SERVICE_AREAS = [
  { name: 'San Francisco', slug: 'san-francisco', state: 'CA' },
  { name: 'Oakland', slug: 'oakland', state: 'CA' },
  { name: 'San Jose', slug: 'san-jose', state: 'CA' },
  { name: 'Berkeley', slug: 'berkeley', state: 'CA' },
  { name: 'Palo Alto', slug: 'palo-alto', state: 'CA' },
  { name: 'Fremont', slug: 'fremont', state: 'CA' },
] as const;
