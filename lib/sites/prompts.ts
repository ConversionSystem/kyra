// ============================================================================
// Content Generation Prompts
// Tiered LLM prompts for the Website Builder content engine.
// Each function returns a fully formatted prompt string.
//
// RULES:
// - Every prompt injects the business's unique data
// - No em dashes anywhere
// - Temperature 0.8-1.0 for diversity (set by caller)
// - "No generic filler" instruction in every prompt
// - Anti-patterns to avoid in every prompt
// ============================================================================

import type { ClientSite, SiteService, SiteCity } from './types';

// ---------- Shared anti-pattern block ----------

const ANTI_PATTERNS = [
  'Do NOT use any of these phrases or anything similar:',
  '- "we pride ourselves"',
  '- "your satisfaction is our priority"',
  '- "don\'t hesitate to contact us"',
  '- "dedicated to excellence"',
  '- "state-of-the-art"',
  '- "second to none"',
  '- "look no further"',
  '- "in today\'s fast-paced world"',
  '- "at the end of the day"',
  '- "one-stop shop"',
  '',
  'Do NOT use em dashes (--) anywhere in the output.',
  'No generic filler. Every sentence must be specific to THIS business.',
  'Write like a skilled human copywriter, not an AI template.',
].join('\n');

// ---------- Helper ----------

function formatServices(services: SiteService[] | null): string {
  if (!services?.length) return 'Not specified';
  return services.map((s) => s.name).join(', ');
}

function formatHours(site: ClientSite): string {
  if (!site.hours) return 'Not specified';
  const h = site.hours;
  const entries = Object.entries(h).filter(([, v]) => v);
  if (!entries.length) return 'Not specified';
  return entries.map(([day, val]) => `${day}: ${val}`).join(', ');
}

function city(site: ClientSite): string {
  return site.address?.city || 'the local area';
}

function state(site: ClientSite): string {
  return site.address?.state || '';
}

function toneInstruction(site: ClientSite): string {
  switch (site.ai_tone) {
    case 'casual':
      return 'Tone: Casual and approachable. Write like a friendly neighbor who happens to be great at their job.';
    case 'friendly':
      return 'Tone: Warm and friendly. Professional but personable, like talking to someone you trust.';
    default:
      return 'Tone: Professional and confident. Knowledgeable but not stiff or corporate.';
  }
}

// ============================================================================
// HOMEPAGE PROMPT (Claude Sonnet 4)
// ============================================================================

export function homepagePrompt(site: ClientSite): string {
  return `You are a conversion copywriter writing a homepage for a real local business.
This is NOT a template. Write as if you personally know this business.

Business: ${site.business_name}
Owner: ${site.owner_name || 'the owner'}
Location: ${city(site)}, ${state(site)}
Years in business: ${site.years_in_business || 'established'}
Their story: ${site.owner_story || 'A dedicated local business serving the community.'}
License: ${site.license || 'Licensed and insured'}
Phone: ${site.phone || 'Available by phone'}
Rating: ${site.rating || 5}/5 (${site.review_count || 0} reviews)
Services offered: ${formatServices(site.services)}
Business hours: ${formatHours(site)}

Write a complete homepage with these sections. Output each section with a clear heading.

## Hero Section
1. H1 headline (max 10 words, includes "${city(site)}", feels personal not corporate)
2. Subtitle (1 sentence describing what a customer FEELS when they call, not a feature list)
3. 3 trust signals (real data: years, license, reviews. Not generic "quality service")
4. CTA button text (action-oriented, specific to the service)

## Services Overview
For each service (${formatServices(site.services)}):
- Short 2-sentence description of what the service involves
- A specific detail that shows expertise (mention equipment brands, techniques, or scenarios)

## Why Choose Us
3-4 reasons rooted in real differentiators:
- ${site.owner_name ? `Owner-operated by ${site.owner_name}` : 'Locally owned and operated'}
- ${site.years_in_business ? `${site.years_in_business} years of experience` : 'Years of local experience'}
- ${site.license ? `Licensed: ${site.license}` : 'Fully licensed and insured'}
- Specific to their industry and story

## Social Proof
A brief paragraph referencing their ${site.review_count || 0} reviews and ${site.rating || 5}-star rating.
Include a call to action.

## Service Area
Mention ${city(site)} and nearby areas they serve.

${toneInstruction(site)}

${ANTI_PATTERNS}`;
}

// ============================================================================
// ABOUT PAGE PROMPT (Claude Sonnet 4)
// ============================================================================

export function aboutPrompt(site: ClientSite): string {
  return `You are writing an About page for a real local business. This page should tell the story
of this business in a way that builds trust and makes a visitor want to call.

Business: ${site.business_name}
Owner: ${site.owner_name || 'the owner'}
Location: ${city(site)}, ${state(site)}
Years in business: ${site.years_in_business || 'established'}
Their story: ${site.owner_story || 'A local business built on hard work and community trust.'}
License: ${site.license || 'Licensed and insured'}
Industry: ${site.industry}
Services: ${formatServices(site.services)}

Write the About page with these sections:

## Our Story
2-3 paragraphs telling the story of ${site.business_name}. Weave in:
- How the business started (use their story as a seed)
- What drives ${site.owner_name || 'the owner'} personally
- Connection to ${city(site)} and the community
- How the business has grown over ${site.years_in_business || 'the'} years
Make it feel like a real person telling their story, not a corporate bio.

## Our Values
3-4 values that are specific and actionable, not generic platitudes.
Each value should have a 1-2 sentence explanation rooted in how the business actually operates.
Example: "Same-day response" is better than "commitment to excellence."

## Credentials
- License: ${site.license || 'Fully licensed'}
- Years: ${site.years_in_business || 'Established'} years serving ${city(site)}
- Rating: ${site.rating || 5}/5 from ${site.review_count || 0} reviews
- Any relevant industry specifics

## Meet the Team
A brief section about ${site.owner_name || 'the owner'} and the team.
Keep it human and warm.

${toneInstruction(site)}

${ANTI_PATTERNS}

Write like someone who sat down with ${site.owner_name || 'the owner'} for 30 minutes
and actually listened to their story. No corporate speak.`;
}

// ============================================================================
// SERVICE PAGE PROMPT (GPT-4o)
// ============================================================================

export function servicePrompt(site: ClientSite, service: SiteService): string {
  return `Write a service page for a real ${site.industry} business. This must read like a human
wrote it who understands the trade, not like an AI marketing template.

Business: ${site.business_name} | Owner: ${site.owner_name || 'the owner'}
Location: ${city(site)}, ${state(site)} | ${site.years_in_business || 'Established'} years experience
Service: ${service.name}
Service description from the owner: ${service.description || 'Not provided'}
${service.price_from ? `Starting price: ${service.price_from}` : ''}
License: ${site.license || 'Licensed and insured'}
Phone: ${site.phone || 'Available by phone'}

Write the page with these clearly labeled sections:

## H1
Service name + city, SEO optimized but natural sounding. Max 10 words.

## Opening
What this service actually involves and when someone needs it.
Write for the customer, not the technician. 3-4 sentences.

## What We Do
4-5 specific things ${site.business_name} does for this service.
Be concrete: "We install Carrier and Trane systems up to 5-ton capacity" beats
"We provide quality installation services."

## Why ${site.business_name}
3 reasons rooted in real differentiators:
- Years of experience (${site.years_in_business || 'many'})
- Owner-operated by ${site.owner_name || 'a local professional'}
- License type: ${site.license || 'fully licensed'}
- Specific brands serviced or techniques used

## Signs You Need ${service.name}
4-5 practical symptoms the customer would recognize in everyday language.

## CTA
Clear call to action with phone number: ${site.phone || 'Call us today'}

## Meta
- meta_title (max 60 chars): Include "${service.name}" and "${city(site)}"
- meta_description (max 155 chars): Include the service, location, and a reason to click

${toneInstruction(site)}

${ANTI_PATTERNS}

Be specific. Use numbers. Reference the actual business, not generic industry claims.`;
}

// ============================================================================
// CITY PAGE PROMPT (GPT-4o)
// ============================================================================

export function cityPrompt(site: ClientSite, targetCity: SiteCity): string {
  return `Write a city-specific service page for a local business expanding into a nearby city.

Business: ${site.business_name} | Based in: ${city(site)}
Serving: ${targetCity.name}, ${targetCity.state}${targetCity.distance_mi ? ` (${targetCity.distance_mi} miles from base)` : ''}
Services offered: ${formatServices(site.services)}
Owner: ${site.owner_name || 'the owner'}
Years in business: ${site.years_in_business || 'established'}
Industry: ${site.industry}

CRITICAL: This page must be genuinely about ${targetCity.name}, not just "${city(site)}"
with the city name swapped. The content must feel like it was written specifically for
residents of ${targetCity.name}.

Write the page with these sections:

## H1
"${site.industry} Services in ${targetCity.name}, ${targetCity.state}" or similar.
Natural, includes the city name.

## Opening
A paragraph that actually mentions something specific about ${targetCity.name}.
Reference the community character, neighborhoods, or what makes it distinct from ${city(site)}.
2-3 sentences.

## Services Available in ${targetCity.name}
For each service (${formatServices(site.services)}):
- 1-2 sentence description tailored to ${targetCity.name} residents

## Our Commitment to ${targetCity.name}
- Response time and service commitment
- How long ${site.business_name} has served this area
- Connection between ${city(site)} base and ${targetCity.name}

## Trust Signals
- "Serving ${targetCity.name} for ${site.years_in_business || 'years'} from our ${city(site)} office"
- License: ${site.license || 'Fully licensed'}
- Rating: ${site.rating || 5}/5

## CTA
Call to action with phone: ${site.phone || 'Call us today'}

## Meta
- meta_title (max 60 chars): Include "${targetCity.name}" and the primary service
- meta_description (max 155 chars): Specific to ${targetCity.name}

${toneInstruction(site)}

${ANTI_PATTERNS}

If you cannot say something genuinely specific to ${targetCity.name}, write a shorter,
more honest page rather than padding with generic content. Quality over length.`;
}

// ============================================================================
// CITY x SERVICE COMBO PROMPT (GPT-4o-mini)
// ============================================================================

export function cityServicePrompt(
  site: ClientSite,
  targetCity: SiteCity,
  service: SiteService,
): string {
  return `Write a focused page about ${service.name} in ${targetCity.name}, ${targetCity.state}
for ${site.business_name}.

Business: ${site.business_name} | Based in: ${city(site)}, ${state(site)}
Owner: ${site.owner_name || 'the owner'}
Service: ${service.name}
Service details: ${service.description || 'Professional service'}
${service.price_from ? `Starting at: ${service.price_from}` : ''}
Target city: ${targetCity.name}, ${targetCity.state}${targetCity.distance_mi ? ` (${targetCity.distance_mi} mi away)` : ''}
License: ${site.license || 'Licensed'}

Write the page with these sections:

## H1
"${service.name} in ${targetCity.name}, ${targetCity.state}" or a natural variation. Max 10 words.

## Opening
2-3 sentences about why ${targetCity.name} residents choose ${site.business_name} for ${service.name}.
Reference something real about the area or the service need.

## What We Offer
3-4 bullet points about what this service includes, written for a ${targetCity.name} homeowner or customer.

## Why Choose Us for ${service.name} in ${targetCity.name}
2-3 short reasons: experience (${site.years_in_business || 'years'}), proximity, license (${site.license || 'licensed'}), reputation.

## CTA
"Call ${site.phone || 'us'} for ${service.name} in ${targetCity.name}"

## Meta
- meta_title (max 60 chars)
- meta_description (max 155 chars)

${toneInstruction(site)}

${ANTI_PATTERNS}

Keep this page concise but genuinely useful. 300-500 words total.
Do not pad with generic content about the industry.`;
}

// ============================================================================
// FAQ PROMPT (Claude Haiku)
// ============================================================================

export function faqPrompt(site: ClientSite): string {
  const hasEmergency = site.hours?.sat || site.hours?.sun ? 'Yes' : 'Check availability';
  const nearbyCities = site.cities?.map((c) => c.name).join(', ') || 'nearby areas';

  return `Generate 15-20 FAQs for a ${site.industry} business in ${city(site)}, ${state(site)}.

Business: ${site.business_name} | ${site.years_in_business || 'Established'} years | License: ${site.license || 'Licensed'}
Owner: ${site.owner_name || 'the owner'}
Services: ${formatServices(site.services)}
Hours: ${formatHours(site)}
Emergency/weekend availability: ${hasEmergency}
Phone: ${site.phone || 'Available by phone'}
Cities served: ${city(site)}, ${nearbyCities}
${site.booking_url ? `Booking URL: ${site.booking_url}` : ''}

Categories (mix evenly across all categories):
- Pricing/cost ("How much does X cost in ${city(site)}?")
- Service-specific ("Do you service [brand]? How long does X take?")
- Practical ("How often should I...? What's the difference between...?")
- Trust/local ("Are you licensed? How fast can you get here? Do you serve ${nearbyCities}?")

Output as a JSON array:
[
  { "question": "...", "answer": "..." },
  ...
]

Rules for each FAQ:
- Each answer: 2-3 sentences maximum
- Include "${site.business_name}" naturally in answers (not every single one, but most)
- Be specific with numbers where possible ("typically $150-$400" not "costs vary")
- Reference real data: ${site.years_in_business || 'years'} years, ${site.license || 'licensed'}, ${city(site)}
- Questions should be what a real customer would type into Google

${ANTI_PATTERNS}`;
}

// ============================================================================
// META TITLES + DESCRIPTIONS PROMPT (Claude Haiku)
// ============================================================================

export function metaPrompt(site: ClientSite): string {
  const pages: string[] = ['homepage', 'about', 'contact', 'reviews', 'faq'];
  if (site.services) {
    for (const s of site.services) {
      pages.push(`service: ${s.name}`);
    }
  }
  if (site.cities) {
    for (const c of site.cities) {
      pages.push(`city: ${c.name}`);
    }
  }

  return `Generate SEO meta titles and descriptions for all pages of a ${site.industry} website.

Business: ${site.business_name}
Location: ${city(site)}, ${state(site)}
Phone: ${site.phone || ''}

Pages to generate meta for:
${pages.map((p) => `- ${p}`).join('\n')}

Output as a JSON array:
[
  { "page": "homepage", "meta_title": "...", "meta_description": "..." },
  ...
]

Rules:
- meta_title: max 60 characters. Include primary keyword + location + brand.
- meta_description: max 155 characters. Include a benefit and call to action.
- Each must be unique across pages (no two pages share the same title/description).
- Include "${city(site)}" in homepage and service page titles.
- Make descriptions compelling enough to click, not just keyword-stuffed.

${ANTI_PATTERNS}`;
}

// ============================================================================
// CONTACT PAGE (Template, no LLM needed)
// ============================================================================

export function contactPageData(site: ClientSite): {
  title: string;
  hero_h1: string;
  hero_subtitle: string;
  content_sections: Array<{ heading: string; body: string; bullets?: string[] }>;
} {
  return {
    title: `Contact ${site.business_name}`,
    hero_h1: `Contact ${site.business_name}`,
    hero_subtitle: `Reach out to us in ${city(site)}, ${state(site)}. We are here to help.`,
    content_sections: [
      {
        heading: 'Get in Touch',
        body: [
          site.phone ? `Phone: ${site.phone}` : '',
          site.address
            ? `Address: ${[site.address.street, site.address.city, site.address.state, site.address.zip].filter(Boolean).join(', ')}`
            : '',
          site.hours ? `Hours: ${formatHours(site)}` : '',
          site.booking_url ? `Book online: ${site.booking_url}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      },
      {
        heading: 'Service Area',
        body: `We proudly serve ${city(site)} and surrounding areas.`,
        bullets: site.cities?.map((c) => `${c.name}, ${c.state}`) || [],
      },
    ],
  };
}

// ============================================================================
// REVIEWS PAGE (Template, no LLM needed)
// ============================================================================

export function reviewsPageData(site: ClientSite): {
  title: string;
  hero_h1: string;
  hero_subtitle: string;
  content_sections: Array<{ heading: string; body: string }>;
} {
  return {
    title: `Reviews | ${site.business_name}`,
    hero_h1: `What Our Customers Say`,
    hero_subtitle: `${site.business_name} is rated ${site.rating || 5}/5 based on ${site.review_count || 0} reviews.`,
    content_sections: [
      {
        heading: 'Our Reputation',
        body: `With ${site.review_count || 0} reviews and a ${site.rating || 5}-star rating, ${site.business_name} has built a reputation for quality ${site.industry} services in ${city(site)}, ${state(site)}. Our customers trust us because we deliver on our promises, every time.`,
      },
      {
        heading: 'Leave a Review',
        body: `Had a great experience with ${site.business_name}? We would love to hear from you. Your feedback helps us improve and helps other ${city(site)} residents find reliable ${site.industry} services.`,
      },
    ],
  };
}
