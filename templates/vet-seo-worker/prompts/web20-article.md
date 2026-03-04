# Web 2.0 Article Generation Prompt

Write a locally-optimized SEO article for a veterinary clinic. This will be published on {{PLATFORM}}.

## Input Data
- Clinic: {{CLINIC_NAME}}
- City: {{CITY}}
- Address: {{ADDRESS}}
- Phone: {{PHONE}}
- Website: {{WEBSITE}}
- GBP URL: {{GBP_URL}}
- Target Keyword: {{TARGET_KEYWORD}}
- Content Angle: {{CONTENT_ANGLE}}

## Requirements

1. **Title:** Include {{CITY}} and {{TARGET_KEYWORD}} naturally
2. **Length:** 650-800 words
3. **Structure:**
   - Opening paragraph introducing the topic + {{CLINIC_NAME}} in {{CITY}}
   - H2 section about the specific service/topic
   - H2 section about why pet owners in {{CITY}} choose {{CLINIC_NAME}}
   - H2 section with practical pet care tips related to the topic
   - Closing paragraph with call to action
4. **NAP Block:** Include full Name, Address, Phone at the end
5. **Google Maps:** Include this embed code: `<iframe src="https://www.google.com/maps/embed?pb=PLACE_ID" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`
6. **Links:** 2-3 natural links to {{WEBSITE}} and {{GBP_URL}}

## Local SEO Rules
- Mention {{CITY}} 3-5 times naturally (not forced)
- Reference 1-2 specific neighborhoods, landmarks, or cross-streets
- Include phrases like "pet owners in {{CITY}}", "{{CITY}} area families"
- Use location-specific language ("our {{CITY}} community", "right here in {{CITY}}")

## Content Rules
- 100% unique — do NOT repeat content from other articles for this clinic
- No keyword stuffing — readability score should be high
- Write for pet owners, not search engines
- Tone: {{CONTENT_TONE}}
- Include genuinely useful pet care information (not just promotional)
