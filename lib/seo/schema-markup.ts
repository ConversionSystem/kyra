interface BusinessSchemaInput {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  industry?: string;
  services?: string[];
  description?: string;
}

/** Map industry slugs to Schema.org @type values */
const INDUSTRY_SCHEMA_TYPES: Record<string, string> = {
  'veterinary': 'VeterinaryCare',
  'dental': 'Dentist',
  'medical': 'MedicalBusiness',
  'chiropractic': 'Physician',
  'optometry': 'Optician',
  'physical-therapy': 'MedicalBusiness',
  'plumbing': 'Plumber',
  'hvac': 'HVACBusiness',
  'electrical': 'Electrician',
  'roofing': 'RoofingContractor',
  'landscaping': 'LandscapingBusiness',
  'pest-control': 'ProfessionalService',
  'auto-repair': 'AutoRepair',
  'restaurant': 'Restaurant',
  'real-estate': 'RealEstateAgent',
  'law': 'Attorney',
  'accounting': 'AccountingService',
  'insurance': 'InsuranceAgency',
  'fitness': 'HealthClub',
  'salon': 'BeautySalon',
  'spa': 'DaySpa',
  'cleaning': 'ProfessionalService',
  'moving': 'MovingCompany',
  'photography': 'ProfessionalService',
  'painting': 'HousePainter',
  'locksmith': 'Locksmith',
  'florist': 'Florist',
  'pet-grooming': 'ProfessionalService',
  'tutoring': 'EducationalOrganization',
  'daycare': 'ChildCare',
};

/**
 * Returns a ready-to-inject JSON-LD script block for any local business.
 * Falls back to LocalBusiness if the industry has no specific Schema.org type.
 */
export function generateBusinessSchema(business: BusinessSchemaInput): string {
  const schemaType = business.industry
    ? (INDUSTRY_SCHEMA_TYPES[business.industry] || 'LocalBusiness')
    : 'LocalBusiness';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: business.name,
    telephone: business.phone,
    url: business.website,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address,
      addressLocality: business.city,
      addressRegion: business.state,
      postalCode: business.zip,
      addressCountry: 'US',
    },
  };

  if (business.description) {
    schema.description = business.description;
  }

  if (business.services && business.services.length > 0) {
    schema.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: business.services.map((svc, i) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: svc },
        position: i + 1,
      })),
    };
  }

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}

/** @deprecated Use generateBusinessSchema instead */
export function generateVetSchema(clinic: Omit<BusinessSchemaInput, 'industry'>): string {
  return generateBusinessSchema({ ...clinic, industry: 'veterinary' });
}
