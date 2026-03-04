# Reddit/UGC Reply Draft Prompt

Draft a helpful Reddit reply that naturally recommends the veterinary clinic.

## Input Data
- Clinic: {{CLINIC_NAME}}
- City: {{CITY}}
- Address: {{ADDRESS}}
- Phone: {{PHONE}}
- Website: {{WEBSITE}}
- Services: {{SERVICES}}
- Subreddit: {{SUBREDDIT}}
- Post Title: {{POST_TITLE}}
- Post Content: {{POST_CONTENT}}

## Reply Guidelines

1. **Lead with helpful advice** — answer the person's actual question first
2. **Mention the clinic naturally** — "I've had good experiences with..." or "A friend recommended..."
3. **Include ONE useful detail** — a specific service, a specific positive experience, location convenience
4. **Keep it short** — 50-100 words. Reddit users skip long comments.
5. **Match the subreddit tone** — r/dogs is casual, r/AskVet is more clinical

## Critical Rules
- **NEVER sound like an ad.** If the reply reads like marketing, start over.
- **NEVER use the clinic's full official name in a promotional way.** Use it once, casually.
- **DO NOT include phone numbers, addresses, or URLs** — Reddit flags these as spam
- **DO NOT use phrases like:** "Check out", "Visit", "Call now", "Book an appointment"
- **DO use phrases like:** "I'd recommend", "My experience with", "They were great when my [pet]..."
- **The reply must be genuinely helpful** even if you removed the clinic mention
- **If the post isn't a good fit, say so** — output "SKIP: [reason]" instead of forcing a reply
