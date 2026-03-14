/**
 * Unsplash fallback photo fetcher for sites with no uploaded photos.
 * Uses Unsplash Source API (no API key needed, ~10 req/min per IP).
 */

// Industry → search query mapping
const INDUSTRY_QUERIES: Record<string, string[]> = {
  hvac: ['hvac technician', 'air conditioning repair', 'heating system'],
  plumbing: ['plumber', 'plumbing repair', 'pipe work'],
  electrical: ['electrician', 'electrical work', 'wiring'],
  roofing: ['roofing', 'roof repair', 'roofer'],
  landscaping: ['landscaping', 'garden', 'lawn care'],
  'lawn-care': ['lawn mowing', 'landscaping', 'garden'],
  cleaning: ['house cleaning', 'cleaning service', 'maid'],
  painting: ['painting contractor', 'painter', 'house painting'],
  flooring: ['flooring installation', 'hardwood floor', 'tile floor'],
  remodeling: ['home renovation', 'kitchen remodel', 'construction'],
  'pest-control': ['pest control', 'exterminator', 'insect'],
  locksmith: ['locksmith', 'lockpicking', 'key'],
  moving: ['moving truck', 'movers', 'cardboard boxes'],
  dental: ['dentist', 'dental office', 'teeth'],
  medical: ['doctor', 'medical office', 'healthcare'],
  legal: ['lawyer', 'law office', 'courthouse'],
  'auto-repair': ['mechanic', 'car repair', 'auto shop'],
  restaurant: ['restaurant', 'food', 'chef'],
  fitness: ['gym', 'fitness', 'workout'],
  salon: ['hair salon', 'hairstylist', 'beauty'],
  default: ['professional service', 'business', 'team work'],
};

export interface StockPhoto {
  url: string;
  alt: string;
  placement: string;
}

/**
 * Get Unsplash stock photo URLs for a given industry.
 * Returns a list of photo objects suitable for the site template.
 */
export function getStockPhotosForIndustry(industry: string, count = 6): StockPhoto[] {
  const queries = INDUSTRY_QUERIES[industry?.toLowerCase()] || INDUSTRY_QUERIES.default;
  const photos: StockPhoto[] = [];

  const placements = ['hero', 'about', 'service-1', 'service-2', 'team', 'cta'];

  for (let i = 0; i < count; i++) {
    const query = queries[i % queries.length];
    const seed = `${industry}-${i}-${query.replace(/\s+/g, '-')}`;
    // Unsplash Source API: deterministic by seed, no key needed
    const url = `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}&sig=${encodeURIComponent(seed)}`;
    photos.push({
      url,
      alt: `${query} professional`,
      placement: placements[i % placements.length],
    });
  }

  return photos;
}

/**
 * Return stock photos only if none were uploaded for the site.
 */
export function resolvePhotos(
  uploadedPhotos: StockPhoto[] | null | undefined,
  industry: string
): StockPhoto[] {
  if (uploadedPhotos && uploadedPhotos.length > 0) {
    return uploadedPhotos;
  }
  return getStockPhotosForIndustry(industry, 6);
}
