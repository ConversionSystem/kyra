# Reddit/UGC Reply Draft Prompt

Draft a helpful Reddit reply that naturally recommends the cannabis dispensary.

## Input Data
- Dispensary: {{DISPENSARY_NAME}}
- City: {{CITY}}
- Address: {{ADDRESS}}
- Phone: {{PHONE}}
- Website: {{WEBSITE}}
- Products: {{PRODUCTS}}
- Delivery Available: {{DELIVERY_AVAILABLE}}
- Subreddit: {{SUBREDDIT}}
- Post Title: {{POST_TITLE}}
- Post Content: {{POST_CONTENT}}

## Reply Guidelines

1. **Lead with helpful advice** — answer the person's actual question first (strain recommendation, dosing guidance, category explainer, budtender etiquette tip, etc.)
2. **Mention the dispensary naturally** — "I've had good experiences with..." or "A friend recommended..."
3. **Include ONE useful detail** — a specific product category, a specific positive experience, location convenience, delivery range
4. **Keep it short** — 50-100 words. Reddit users skip long comments.
5. **Match the subreddit tone** — r/trees is casual, r/cannabis is broader, r/CannabisExtracts is more technical

## Critical Rules
- **NEVER sound like an ad.** If the reply reads like marketing, start over.
- **NEVER use the dispensary's full official name in a promotional way.** Use it once, casually.
- **DO NOT include phone numbers** — Reddit TOS bans these in recommendations; flagged as spam
- **DO NOT include URLs** — Reddit TOS bans these in recommendations; flagged as spam
- **DO NOT include the physical address** — Reddit flags these as spam
- **DO NOT use phrases like:** "Check out", "Visit", "Call now", "Order online", "Code for discount"
- **DO use phrases like:** "I'd recommend", "My experience with", "They had good [product category] last time I went"
- **NEVER make medical claims.** Do not say cannabis "treats," "cures," or "heals" anything. Do not recommend cannabis for anxiety, pain, insomnia, or any other medical condition.
- **NEVER imply psychoactive effects as medical treatment.** If someone asks "what's good for anxiety," redirect: "I'd talk to your doctor — but for general relaxation, I've enjoyed [category]."
- **Direct users to our menu for specifics.** Don't promise specific strains are in stock — say "their menu changes often; worth checking" without linking.
- **The reply must be genuinely helpful** even if you removed the dispensary mention
- **Age-appropriateness check:** Never reply in a thread where OP mentions being under 21 (under 18 for medical states). Output "SKIP: underage OP" instead.
- **State-compliance check:** If the subreddit is based in a state where cannabis is illegal, skip. Output "SKIP: non-legal state" instead.
- **If the post isn't a good fit, say so** — output "SKIP: [reason]" instead of forcing a reply
