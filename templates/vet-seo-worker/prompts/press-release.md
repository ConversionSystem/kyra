# Press Release Generation Prompt

Write a professional press release in AP Style format. Follow this structure exactly:

## Input Data
- Clinic: {{CLINIC_NAME}}
- City: {{CITY}}
- Address: {{ADDRESS}}
- Phone: {{PHONE}}
- Website: {{WEBSITE}}
- Lead Vet: {{VET_NAME}}
- Service Angle: {{SERVICE_ANGLE}}
- GBP URL: {{GBP_URL}}

## Requirements

1. **Headline:** Compelling, newsworthy angle about {{CLINIC_NAME}} and {{SERVICE_ANGLE}} in {{CITY}}
2. **Dateline:** {{CITY}}, {{STATE}} — {{DATE}}
3. **Lead paragraph:** Who, what, when, where, why — the core news
4. **Body (2-3 paragraphs):**
   - Expand on the service/achievement/news
   - Include a quote from {{VET_NAME}} (make it sound natural and authoritative)
   - Local context — why this matters to {{CITY}} pet owners
5. **Boilerplate:** "About {{CLINIC_NAME}}" — 2-3 sentences describing the practice
6. **Contact info:** Full NAP data + website

## Rules
- Total length: 450-550 words
- Include 2-3 natural hyperlinks to {{WEBSITE}} and {{GBP_URL}}
- NO keyword stuffing — read naturally
- Tone: Professional, authoritative, newsworthy
- Reference specific {{CITY}} neighborhoods or landmarks when relevant
- The quote should sound like a real veterinarian, not marketing copy
