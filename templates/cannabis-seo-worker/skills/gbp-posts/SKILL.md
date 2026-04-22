# GBP Posts Skill

Generate and publish Google Business Profile posts for a cannabis dispensary to boost local SEO visibility. GBP posts are one of the strongest signals for local pack rankings and AI citation.

## When to Use

- Weekly: 2-3 GBP posts per week (Tuesday, Thursday, Saturday)
- After events: new product drop, 4/20 promotion, community involvement, license renewal
- After positive reviews: amplify with a thank-you post

## How It Works

1. Generate post content via Claude (150-300 words max, GBP enforces limits)
2. Include a call-to-action button (Learn More, Order, Call)
3. Queue to Kyra review queue for agency approval
4. On approval: publish via Google Business Profile API
5. Track engagement (views, clicks) for reporting

## Post Types

### Update Posts (most common)
- Share dispensary news, product drops, seasonal notes
- "New live rosin just landed — check the menu for today's strain lineup."
- Include relevant photo suggestion

### Offer Posts
- Limited-time promotions or discounts (subject to state rules — NO free cannabis samples; NO giveaway language that implies inducement)
- "Green Wednesday: 20% off all pre-rolls, November 27 only. Adults 21+ with valid ID."
- Include: title, details, dates
- **Never** state percentage discounts without the 21+/compliance caveat if state requires it

### Event Posts
- Community events, industry education nights, compliance-friendly meet-the-grower events
- Include: event name, date, time, description
- 21+ only language is required

### Product Posts
- Highlight specific product categories
- "Now stocking solventless rosin from [Brand] — cold-cured, full-spectrum, lab-tested."
- Describe by category, strain, and cannabinoid content — NEVER by medical effect

## Content Guidelines

- **Tone:** Match the dispensary's brand voice (from SOUL.md CONTENT_TONE variable)
- **Keywords:** Naturally include target keywords + city name
- **Photos:** Suggest a photo type for each post (product hero shots, storefront, budtender at work)
- **CTA:** Every post MUST have a call-to-action button
- **Frequency:** 2-3 posts per week — consistent posting beats sporadic bursts
- **Link:** Include website URL when post type allows (Google sometimes hides links in cannabis-category profiles — plan accordingly)
- **NO medical claims.** "Users report a mellow, relaxed vibe" is OK; "helps with anxiety" is NOT OK.
- **NO free cannabis language.** Never say "free sample," "free joint," or imply product giveaway — this violates state inducement rules in most markets.
- **ALWAYS include age-gate.** "21+" (recreational) or "medical patients only" (medical-only markets).
- **Say "cannabis" not "marijuana."**
- **Include state license number** in at least one post per week — required for compliance in most state-regulated markets.

## API Integration

Google Business Profile API (formerly Google My Business API):
- Endpoint: `POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts`
- Auth: Google Service Account with GBP API enabled
- Requires: GBP location ID (stored in client settings as `gbp_location_id`)
- **Cannabis dispensary profiles face tighter GBP scrutiny** — posts may be reviewed before going live. Expect occasional rejections for any language that could be read as medical claim or inducement.

If GBP API access is not configured:
- Generate posts as text + image suggestion
- Queue in review queue with label "GBP Post — Copy to Google Business Profile"
- Agency copies and posts manually (still valuable — the AI generates the content)

## Post Calendar

| Day | Post Type | Theme |
|-----|-----------|-------|
| Tuesday | Update | Cannabis education tip, strain of the week, terpene focus |
| Thursday | Update/Offer | Product drop, weekend deal, new arrival |
| Saturday | Update | Community content, behind-the-scenes, budtender pick |

## Output

```json
{
  "post_type": "update",
  "text": "Just got in a fresh batch of Wedding Cake flower from [Brand] — a GSC × Cherry Pie hybrid with a creamy vanilla terpene profile. Check today's menu for pricing. 21+ only. State License {{LICENSE_NUMBER}}.",
  "cta": { "type": "LEARN_MORE", "url": "https://website.com/menu" },
  "suggested_photo": "Macro shot of Wedding Cake flower in a product jar",
  "keywords_used": ["cannabis dispensary", "best flower {{CITY}}", "hybrid strain"],
  "status": "pending_review"
}
```

## Cron Schedule

Add to `config/cron-schedule.json`:
```json
{
  "id": "gbp-post-tue",
  "skill": "gbp-posts",
  "schedule": "0 10 * * 2",
  "description": "GBP post — Tuesday at 10 AM",
  "enabled": true,
  "params": { "post_type": "update" }
},
{
  "id": "gbp-post-thu",
  "skill": "gbp-posts",
  "schedule": "0 10 * * 4",
  "description": "GBP post — Thursday at 10 AM",
  "enabled": true,
  "params": { "post_type": "update_or_offer" }
}
```

## Dependencies

- Google Business Profile API (optional — works in manual mode without it)
- No ClawHub dependencies
