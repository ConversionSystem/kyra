# Web 2.0 Article Generation Prompt

Write a locally-optimized SEO article for a cannabis dispensary. This will be published on {{PLATFORM}}.

## Input Data
- Dispensary: {{DISPENSARY_NAME}}
- City: {{CITY}}
- State: {{STATE}}
- Address: {{ADDRESS}}
- Phone: {{PHONE}}
- Website: {{WEBSITE}}
- GBP URL: {{GBP_URL}}
- State License Number: {{LICENSE_NUMBER}}
- Target Keyword: {{TARGET_KEYWORD}}
- Content Angle: {{CONTENT_ANGLE}}
- Delivery Available: {{DELIVERY_AVAILABLE}}

## Requirements

1. **Title:** Include {{CITY}} and {{TARGET_KEYWORD}} naturally
2. **Length:** 650-800 words
3. **Structure:**
   - Opening paragraph introducing the topic + {{DISPENSARY_NAME}} in {{CITY}}
   - H2 section about the specific product category, strain type, or terpene profile
   - H2 section about why cannabis consumers in {{CITY}} choose {{DISPENSARY_NAME}}
   - H2 section with genuinely useful cannabis education (terpene basics, indica vs sativa explainer, dosing for edibles, pre-roll vs flower tradeoffs, delivery zones if DELIVERY_AVAILABLE, etc.)
   - Closing paragraph with call to action (visit the menu, check today's deals)
4. **NAP Block:** Include full Name, Address, Phone, and state license number {{LICENSE_NUMBER}} at the end
5. **Age-gate line:** Include "21+ only" (recreational) or "medical patients only" (medical market) near the top or bottom
6. **Google Maps:** Include this embed code: `<iframe src="https://www.google.com/maps/embed?pb=PLACE_ID" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>`
7. **Links:** 2-3 natural links to {{WEBSITE}} and {{GBP_URL}}

## Local SEO Rules
- Mention {{CITY}} 3-5 times naturally (not forced)
- Reference 1-2 specific neighborhoods, landmarks, or cross-streets
- Include phrases like "cannabis consumers in {{CITY}}", "{{CITY}} area adults 21+"
- Use location-specific language ("our {{CITY}} community", "right here in {{CITY}}")
- If {{DELIVERY_AVAILABLE}} is true, mention delivery radius/zones

## Cannabis-Specific Angle
- Strain education, terpene profiles, local delivery benefits, harvest timing, budtender picks
- Talk about PRODUCTS (flower, pre-rolls, vapes, edibles, concentrates, topicals) — these are what cannabis consumers search for
- Reference strain genealogy (e.g., "Blue Dream is a sativa-dominant hybrid descended from Blueberry × Haze")
- Highlight lab-tested, compliant product practices — {{STATE}}-regulated means every product passes potency + pesticide testing

## Content Rules
- 100% unique — do NOT repeat content from other articles for this dispensary
- No keyword stuffing — readability score should be high
- Write for cannabis consumers, not search engines
- Tone: {{CONTENT_TONE}}
- **Say "cannabis" not "marijuana"** — industry preference; most directories flag "marijuana" as dated
- **NO medical claims.** Never say cannabis "treats," "cures," or "heals" a condition. Describe effects as "commonly reported" or "traditionally associated with" — never as medical fact.
- **Never imply psychoactive effects as medical treatment.** Direct readers to their physician for medical questions.
- Always include the state license number and age-gate language — required by state regulations for retail cannabis content
