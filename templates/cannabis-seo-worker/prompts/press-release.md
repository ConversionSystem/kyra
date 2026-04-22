# Press Release Generation Prompt

Write a professional press release in AP Style format for a cannabis dispensary. Follow this structure exactly.

## Input Data
- Dispensary: {{DISPENSARY_NAME}}
- City: {{CITY}}
- State: {{STATE}}
- Address: {{ADDRESS}}
- Phone: {{PHONE}}
- Website: {{WEBSITE}}
- Owner: {{OWNER_NAME}}
- State License Number: {{LICENSE_NUMBER}}
- Product/Service Angle: {{SERVICE_ANGLE}}
- Delivery Available: {{DELIVERY_AVAILABLE}}
- GBP URL: {{GBP_URL}}

## Requirements

1. **Headline:** Compelling, newsworthy angle about {{DISPENSARY_NAME}} and {{SERVICE_ANGLE}} in {{CITY}}
2. **Dateline:** {{CITY}}, {{STATE}} — {{DATE}}
3. **Lead paragraph:** Who, what, when, where, why — the core news
4. **Body (2-3 paragraphs):**
   - Expand on the product, event, or community involvement
   - Include a quote from {{OWNER_NAME}} (make it sound natural and authoritative)
   - Local context — why this matters to {{CITY}} cannabis consumers
5. **Boilerplate:** "About {{DISPENSARY_NAME}}" — 2-3 sentences describing the dispensary, including state license number {{LICENSE_NUMBER}}
6. **Age-gate disclaimer:** Include "For use by adults 21+ only. Please consume responsibly." (for recreational) or "For qualified medical patients 18+ with valid state medical recommendation." (for medical)
7. **Contact info:** Full NAP data + website + license number

## Rules
- Total length: 450-550 words
- Include 2-3 natural hyperlinks to {{WEBSITE}} and {{GBP_URL}}
- NO keyword stuffing — read naturally
- Tone: Professional, authoritative, newsworthy
- Reference specific {{CITY}} neighborhoods or landmarks when relevant
- The quote should sound like a real dispensary owner, not marketing copy
- **Say "cannabis" — not "marijuana"** — the industry has moved on; "cannabis" reads more professional and most wire services prefer it
- **NO medical claims.** Do not say the product "treats," "cures," "heals," or "relieves" any condition. Describe products by their category (flower, pre-roll, vape, edible, concentrate), strain lineage, and terpene profile — not their effects.
- **Never imply psychoactive effects as medical treatment.** You can say "a relaxing sativa profile"; you cannot say "helps with anxiety."
- **Always include the state license number** in the boilerplate — state regulations require it in press releases for dispensaries.
- Reference compliance language when relevant: "Products have been tested in accordance with {{STATE}} state regulations."
