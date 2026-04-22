# Semantic Stacker Skill

Build semantic authority stacks on high-trust domains. Each stack page interlinks to all other stack pages + the dispensary website, creating a web of topical authority.

## Supported Platforms

| Platform | Trust Level | Method | ClawHub Skill |
|----------|------------|--------|---------------|
| Google Docs | Very High | Google Docs API | google-docs ✅ |
| Google Sites | Very High | Sites API | custom |
| GitHub Pages | High | Git push | github-pages-auto-deploy ✅ |
| Notion | High | Notion API | notion ✅ |
| Telegraph | Medium | Telegraph API | custom (shared with web20-publisher) |

## When to Use

- Initial setup: build the full stack (5 pages, one per platform)
- Monthly refresh: update content + add new interlinks
- After new content is published on any platform (add crosslinks)

## Stack Architecture

```
Google Docs (authority page) ←→ Google Sites (location page)
    ↕                                    ↕
Notion (product catalog)  ←→  GitHub Pages (community guide)
    ↕                                    ↕
Telegraph (location guide)  ←→  Dispensary Website (home)
```

Every page links to every other page + the dispensary website + GBP.

## Content Differentiation

Each platform gets a UNIQUE angle — same dispensary, different presentation:

- **Google Docs:** Comprehensive dispensary overview (encyclopedic tone, includes license + compliance info)
- **Google Sites:** Location-focused with driving directions from landmarks + delivery-zone map
- **GitHub Pages:** Community resource guide (cannabis education + local resources, schema markup)
- **Notion:** Product catalog deep-dive with structured data blocks (flower, pre-rolls, vapes, edibles, concentrates)
- **Telegraph:** Personal narrative style ("Why cannabis consumers in [City] trust...")

## Interlink Format

At the bottom of every stack page:

```
--- Learn More About [Dispensary Name] ---
• Official Website: [website]
• Google Business Profile: [GBP URL]
• Weedmaps Profile: [Weedmaps URL]
• Leafly Profile: [Leafly URL]
• Comprehensive Dispensary Guide: [Google Docs URL]
• Location & Directions: [Google Sites URL]
• Community Cannabis Resources: [GitHub Pages URL]
• Our Product Catalog: [Notion URL]
• Why Cannabis Consumers Trust Us: [Telegraph URL]

Licensed cannabis retailer • State License {{LICENSE_NUMBER}} • Adults 21+ only
```

## JSON-LD Schema Markup (NEW — Critical for AI Citation)

ALL stack pages on HTML-supporting platforms (GitHub Pages, Google Sites) MUST include Store + LocalBusiness schema markup. Schema.org does NOT have a native `Dispensary` type — use `Store` with category `"Cannabis Dispensary"` plus `LocalBusiness` for redundancy. Add `Product` schema for individual menu items and `AggregateRating` for Weedmaps/Leafly review scores.

This is what AI systems read to cite businesses.

Inject this in the `<head>` of every HTML page:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": ["Store", "LocalBusiness"],
  "name": "{{DISPENSARY_NAME}}",
  "description": "Licensed cannabis dispensary in {{CITY}} offering {{PRODUCTS}}. State license {{LICENSE_NUMBER}}.",
  "category": "Cannabis Dispensary",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "{{STREET_ADDRESS}}",
    "addressLocality": "{{CITY}}",
    "addressRegion": "{{STATE}}",
    "postalCode": "{{ZIP}}",
    "addressCountry": "US"
  },
  "telephone": "{{PHONE}}",
  "url": "{{WEBSITE}}",
  "image": "{{LOGO_URL}}",
  "priceRange": "$$",
  "openingHoursSpecification": {{HOURS_JSON}},
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "{{LAT}}",
    "longitude": "{{LNG}}"
  },
  "sameAs": [
    "{{GBP_URL}}",
    "{{WEEDMAPS_URL}}",
    "{{LEAFLY_URL}}",
    "{{FACEBOOK_URL}}"
  ],
  "hasMap": "{{GOOGLE_MAPS_URL}}",
  "areaServed": {
    "@type": "City",
    "name": "{{CITY}}"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "{{WEEDMAPS_RATING}}",
    "reviewCount": "{{WEEDMAPS_REVIEW_COUNT}}"
  },
  "identifier": {
    "@type": "PropertyValue",
    "propertyID": "State Cannabis License",
    "value": "{{LICENSE_NUMBER}}"
  }
}
</script>
```

Also add separate `Product` schema blocks for each featured product category (flower, pre-rolls, vapes, edibles, concentrates). AI systems vary in which schema types they prioritize.

For non-HTML platforms (Notion, Google Docs, Telegraph):
- Include structured NAP data + license number in a clearly formatted block at the top
- Use consistent formatting that AI crawlers can parse
- Include age-gate notice (21+ / medical-patient-only)

## Setup Flow

1. **Auto-provisioned by Kyra** — platforms are created automatically when the SEO worker deploys (no manual setup)
2. Generate unique content for each platform via content-writer skill
3. Publish all 5 pages
4. Add interlinks to all pages (requires knowing all URLs first)
5. Update the interlink block monthly as new content is added

## Output

```json
{
  "stack_id": "purple-lotus-san-jose",
  "pages": [
    { "platform": "google_docs", "url": "https://docs.google.com/...", "status": "live" },
    { "platform": "google_sites", "url": "https://sites.google.com/...", "status": "live" },
    { "platform": "github_pages", "url": "https://purplelotus.github.io/sanjose", "status": "live" },
    { "platform": "notion", "url": "https://notion.so/...", "status": "live" },
    { "platform": "telegraph", "url": "https://telegra.ph/...", "status": "live" }
  ],
  "interlinks_updated": true,
  "last_refreshed": "2026-04-22"
}
```
