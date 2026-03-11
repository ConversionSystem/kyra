interface VetClinicSchemaInput {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
}

/**
 * Returns a ready-to-inject JSON-LD script block for veterinary clinics.
 */
export function generateVetSchema(clinic: VetClinicSchemaInput): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VeterinaryCare',
    name: clinic.name,
    telephone: clinic.phone,
    url: clinic.website,
    address: {
      '@type': 'PostalAddress',
      streetAddress: clinic.address,
      addressLocality: clinic.city,
      addressRegion: clinic.state,
      postalCode: clinic.zip,
      addressCountry: 'US',
    },
  };

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}
