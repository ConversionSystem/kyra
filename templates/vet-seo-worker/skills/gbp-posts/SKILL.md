# GBP Posts Skill

Generate and publish Google Business Profile posts to boost local SEO visibility. GBP posts are one of the strongest signals for local pack rankings and AI citation.

## When to Use

- Weekly: 2-3 GBP posts per week (Tuesday, Thursday, Saturday)
- After events: new service launched, seasonal promotion, community involvement
- After positive reviews: amplify with a thank-you post

## How It Works

1. Generate post content via Claude (150-300 words max, GBP enforces limits)
2. Include a call-to-action button (Book, Call, Learn More, Order)
3. Queue to Kyra review queue for agency approval
4. On approval: publish via Google Business Profile API
5. Track engagement (views, clicks) for reporting

## Post Types

### Update Posts (most common)
- Share clinic news, tips, seasonal advice
- "Spring is here! Time to check your pet's flea and tick prevention. Book a wellness exam today."
- Include relevant photo suggestion

### Offer Posts
- Limited-time promotions or discounts
- "20% off dental cleanings this month — book before March 31!"
- Include: title, details, coupon code (optional), dates

### Event Posts
- Community events, vaccination drives, adoption days
- Include: event name, date, time, description

### Product Posts
- Highlight specific services or products
- "Now offering laser therapy for arthritis and joint pain in senior pets"

## Content Guidelines

- **Tone:** Match the clinic's brand voice (from SOUL.md CONTENT_TONE variable)
- **Keywords:** Naturally include target keywords + city name
- **Photos:** Suggest a photo type for each post (agency provides or uses stock)
- **CTA:** Every post MUST have a call-to-action button
- **Frequency:** 2-3 posts per week — consistent posting beats sporadic bursts
- **Link:** Include website URL when post type allows
- **NO medical claims** — "many pets benefit from..." not "this cures..."

## API Integration

Google Business Profile API (formerly Google My Business API):
- Endpoint: `POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts`
- Auth: Google Service Account with GBP API enabled
- Requires: GBP location ID (stored in client settings as `gbp_location_id`)

If GBP API access is not configured:
- Generate posts as text + image suggestion
- Queue in review queue with label "GBP Post — Copy to Google Business Profile"
- Agency copies and posts manually (still valuable — the AI generates the content)

## Post Calendar

| Day | Post Type | Theme |
|-----|-----------|-------|
| Tuesday | Update | Pet care tip related to season or service |
| Thursday | Update/Offer | Service highlight or promotion |
| Saturday | Update | Community content, fun pet facts, behind-the-scenes |

## Output

```json
{
  "post_type": "update",
  "text": "Spring allergy season is here! Just like humans, pets can suffer from seasonal allergies too. Watch for excessive scratching, watery eyes, or sneezing. Our team at [Clinic] can help — book a wellness check today!",
  "cta": { "type": "BOOK", "url": "https://website.com/book" },
  "suggested_photo": "Spring flowers with a happy dog in a garden setting",
  "keywords_used": ["pet allergies", "veterinarian Fremont", "wellness check"],
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
