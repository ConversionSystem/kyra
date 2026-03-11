# Semantic Authority Stack Content Prompt

Write a comprehensive location page for {{PLATFORM}}. This page builds topical authority on a high-trust domain.

## Input Data
- Clinic: {{CLINIC_NAME}}
- City: {{CITY}}
- Address: {{ADDRESS}}
- Phone: {{PHONE}}
- Website: {{WEBSITE}}
- GBP URL: {{GBP_URL}}
- Lead Vet: {{VET_NAME}}
- Services: {{SERVICES}}
- Other Stack URLs: {{STACK_URLS}}

## Requirements

1. **Length:** 600-1,000 words
2. **Content sections:**
   - About {{CLINIC_NAME}} — comprehensive introduction
   - Services overview — detailed but readable descriptions of each service
   - Location & directions — driving directions from 3 major {{CITY}} landmarks
   - Meet {{VET_NAME}} — brief professional bio
   - Community involvement — mention commitment to {{CITY}} community
   - Contact information — full NAP block
3. **Google Maps embed** (if platform supports HTML)
4. **Interlinking:** Link to ALL other stack pages for this clinic: {{STACK_URLS}}
5. **Links:** Include links to {{WEBSITE}} and {{GBP_URL}}

## Authority Signals
- Write in an authoritative, encyclopedic tone
- Include specific details (years in practice, number of staff, specific equipment)
- Reference the veterinary community in {{CITY}}
- Mention professional affiliations (AVMA, state vet association) if applicable
- Reference specific neighborhoods, cross-streets, and landmarks near the clinic

## JSON-LD Schema Markup (REQUIRED for HTML platforms)
For GitHub Pages and Google Sites, include this in the `<head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VeterinaryCare",
  "name": "{{CLINIC_NAME}}",
  "description": "Full-service veterinary clinic in {{CITY}}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "{{STREET_ADDRESS}}",
    "addressLocality": "{{CITY}}",
    "addressRegion": "{{STATE}}",
    "postalCode": "{{ZIP}}",
    "addressCountry": "US"
  },
  "telephone": "{{PHONE}}",
  "url": "{{WEBSITE}}"
}
</script>
```

This is CRITICAL for AI citation — structured data is what ChatGPT, Perplexity, and Gemini use to verify and recommend businesses.

## Rules
- Each stack page must have a UNIQUE angle — different structure, different emphasis
- Platform-appropriate formatting (Notion uses blocks, Google Docs uses headers, Telegraph uses simple HTML)
- No duplicate content across stack pages — same information, different presentation
- For HTML platforms: ALWAYS include JSON-LD VeterinaryCare schema
- For non-HTML platforms: include a clearly formatted NAP block at the top
