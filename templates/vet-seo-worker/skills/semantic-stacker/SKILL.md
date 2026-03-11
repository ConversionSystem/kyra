# Semantic Stacker Skill

Build semantic authority stacks on high-trust domains. Each stack page interlinks to all other stack pages + the clinic website, creating a web of topical authority.

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
Notion (services overview)  ←→  GitHub Pages (community guide)
    ↕                                    ↕
Telegraph (location guide)  ←→  Clinic Website (home)
```

Every page links to every other page + the clinic website + GBP.

## Content Differentiation

Each platform gets a UNIQUE angle — same clinic, different presentation:

- **Google Docs:** Comprehensive practice overview (encyclopedic tone)
- **Google Sites:** Location-focused with driving directions from landmarks
- **GitHub Pages:** Community resource guide (pet care tips + local resources)
- **Notion:** Services deep-dive with structured data blocks
- **Telegraph:** Personal narrative style ("Why pet owners in [City] trust...")

## Interlink Format

At the bottom of every stack page:

```
--- Learn More About [Clinic Name] ---
• Official Website: [website]
• Google Business Profile: [GBP URL]
• Comprehensive Practice Guide: [Google Docs URL]
• Location & Directions: [Google Sites URL]
• Community Pet Care Resources: [GitHub Pages URL]
• Our Services: [Notion URL]
• Why Pet Owners Trust Us: [Telegraph URL]
```

## JSON-LD Schema Markup (NEW — Critical for AI Citation)

ALL stack pages on HTML-supporting platforms (GitHub Pages, Google Sites) MUST include VeterinaryCare schema markup. This is what AI systems read to cite businesses.

Inject this in the `<head>` of every HTML page:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VeterinaryCare",
  "name": "{{CLINIC_NAME}}",
  "description": "Full-service veterinary clinic in {{CITY}} offering {{SERVICES}}.",
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
    "{{FACEBOOK_URL}}",
    "{{YELP_URL}}"
  ],
  "hasMap": "{{GOOGLE_MAPS_URL}}",
  "areaServed": {
    "@type": "City",
    "name": "{{CITY}}"
  }
}
</script>
```

Also add LocalBusiness and Organization markup for redundancy. AI systems vary in which schema types they prioritize.

For non-HTML platforms (Notion, Google Docs, Telegraph):
- Include structured NAP data in a clearly formatted block at the top
- Use consistent formatting that AI crawlers can parse

## Setup Flow

1. **Auto-provisioned by Kyra** — platforms are created automatically when the SEO worker deploys (no manual setup)
2. Generate unique content for each platform via content-writer skill
3. Publish all 5 pages
4. Add interlinks to all pages (requires knowing all URLs first)
5. Update the interlink block monthly as new content is added

## Output

```json
{
  "stack_id": "goodrich-vet-omaha",
  "pages": [
    { "platform": "google_docs", "url": "https://docs.google.com/...", "status": "live" },
    { "platform": "google_sites", "url": "https://sites.google.com/...", "status": "live" },
    { "platform": "github_pages", "url": "https://goodrichvet.github.io/omaha", "status": "live" },
    { "platform": "notion", "url": "https://notion.so/...", "status": "live" },
    { "platform": "telegraph", "url": "https://telegra.ph/...", "status": "live" }
  ],
  "interlinks_updated": true,
  "last_refreshed": "2026-03-04"
}
```
