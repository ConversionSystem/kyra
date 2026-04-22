# Semantic Authority Stack Content Prompt

Write a comprehensive location page for {{PLATFORM}}. This page builds topical authority on a high-trust domain for a cannabis dispensary.

## Input Data
- Dispensary: {{DISPENSARY_NAME}}
- City: {{CITY}}
- State: {{STATE}}
- Address: {{ADDRESS}}
- Phone: {{PHONE}}
- Website: {{WEBSITE}}
- GBP URL: {{GBP_URL}}
- Owner: {{OWNER_NAME}}
- State License Number: {{LICENSE_NUMBER}}
- Products: {{PRODUCTS}}
- Delivery Available: {{DELIVERY_AVAILABLE}}
- Other Stack URLs: {{STACK_URLS}}

## Requirements

1. **Length:** 600-1,000 words
2. **Content sections:**
   - About {{DISPENSARY_NAME}} — comprehensive introduction (include license number and retail/medical classification)
   - Product overview — detailed but readable descriptions of each product category ({{PRODUCTS}}) — flower, pre-rolls, vapes, edibles, concentrates, topicals
   - Location & directions — driving directions from 3 major {{CITY}} landmarks, plus delivery zone description if {{DELIVERY_AVAILABLE}}
   - Meet the team — brief bio of {{OWNER_NAME}} and head budtender
   - Community involvement — mention commitment to {{CITY}} community, any social equity or local sourcing programs
   - Compliance & testing — note that all products are {{STATE}}-regulated, lab-tested for potency and contaminants
   - Age-gate notice — "This dispensary serves adults 21+ with valid ID" (or medical equivalent)
   - Contact information — full NAP block + license number
3. **Google Maps embed** (if platform supports HTML)
4. **Interlinking:** Link to ALL other stack pages for this dispensary: {{STACK_URLS}}
5. **Links:** Include links to {{WEBSITE}} and {{GBP_URL}}

## Authority Signals
- Write in an authoritative, encyclopedic tone
- Include specific details (years in operation, number of staff, square footage, drive-through availability, delivery radius)
- Reference the cannabis community in {{CITY}}
- Mention state-regulatory affiliations (state cannabis control board, NCIA membership) if applicable
- Reference specific neighborhoods, cross-streets, and landmarks near the dispensary

## JSON-LD Schema Markup (REQUIRED for HTML platforms)
For GitHub Pages and Google Sites, include this in the `<head>`. Schema.org does NOT have a distinct `Dispensary` type — use `Store` with category `"Cannabis Dispensary"`, plus `LocalBusiness` + `Product` + `AggregateRating` for redundancy:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": ["Store", "LocalBusiness"],
  "name": "{{DISPENSARY_NAME}}",
  "description": "Cannabis dispensary in {{CITY}}, {{STATE}} — state license {{LICENSE_NUMBER}}",
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
    "{{LEAFLY_URL}}"
  ],
  "hasMap": "{{GOOGLE_MAPS_URL}}",
  "areaServed": {
    "@type": "City",
    "name": "{{CITY}}"
  },
  "identifier": {
    "@type": "PropertyValue",
    "propertyID": "State Cannabis License",
    "value": "{{LICENSE_NUMBER}}"
  }
}
</script>
```

This is CRITICAL for AI citation — structured data is what ChatGPT, Perplexity, and Gemini use to verify and recommend businesses.

## Rules
- Each stack page must have a UNIQUE angle — different structure, different emphasis
- Platform-appropriate formatting (Notion uses blocks, Google Docs uses headers, Telegraph uses simple HTML)
- No duplicate content across stack pages — same information, different presentation
- For HTML platforms: ALWAYS include JSON-LD schema (Store + LocalBusiness + AggregateRating where review data exists)
- For non-HTML platforms: include a clearly formatted NAP block + state license number at the top
- **NO medical claims.** Products are described by category, strain, and lab-tested cannabinoid profile only.
- **Always include state license number** — required by state cannabis regulators for all published dispensary content
- **Include age-gate language** on every stack page (21+ recreational, 18+ medical with recommendation)
- **Say "cannabis" not "marijuana"** for all authority-building content
