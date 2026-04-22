# UGC Monitor Skill

Monitor Reddit for cannabis-related discussions in the client's city. Draft helpful replies that naturally recommend the dispensary.

## When to Use

- Daily cron (2x per day — morning and evening)
- On-demand when agency wants to check for new threads

## How It Works

1. Load subreddit list from `config/subreddits.json`
2. Add city-specific cannabis subreddit (e.g., r/SeattleCannabis, r/cacannabis)
3. Use `reddit-readonly` ClawHub skill to search recent posts
4. Filter by keywords + location + recency (< 48 hours old)
5. Score each post for relevance (0-1.0, min 0.5 to qualify)
6. Draft a natural, helpful reply for qualifying posts
7. Queue ALL drafts for agency review — NEVER auto-post

## Search Strategy

### Subreddits to Monitor
- **City cannabis sub:** r/{city}cannabis or r/cannabis{state} (e.g., r/SeattleCannabis, r/cacannabis)
- **General city sub:** r/{City} (e.g., r/SanJose)
- **Cannabis subs:** r/trees, r/weed, r/cannabis, r/CannabisExtracts, r/CannabisGrowers, r/eldersgrove, r/entwives

### Keywords
`dispensary`, `delivery`, `best flower`, `best prerolls`, `indica`, `sativa`, `hybrid`, `edibles`, `vape cart`, `best dispensary`, `cannabis deals`, `new strain`, `recommendation`, `budtender`, `concentrates`, `rosin`, `live resin`, `gummies`, `tincture`, `recreational`, `medical card`, `cannabis delivery`

### Relevance Scoring
- Post mentions city name: +0.3
- Post mentions specific product the dispensary offers: +0.2
- Post is asking for recommendations: +0.3
- Post is in city/state cannabis subreddit: +0.2
- Post has <20 comments (less competition): +0.1
- Post is <24 hours old: +0.1

## Reply Guidelines (from prompts/ugc-reply.md)

- Lead with helpful advice — answer the actual question first
- Mention dispensary naturally — "I've had good experiences with..."
- Keep it short — 50-100 words
- Match subreddit tone
- **NEVER** include phone numbers, addresses, or URLs (Reddit TOS flags as spam)
- **NEVER** sound like an ad
- **NEVER** make medical claims
- **NEVER** imply psychoactive effects as medical treatment
- Direct users to our menu for specifics ("their menu changes often; worth checking")
- If the post isn't a good fit → output "SKIP: [reason]"

## Output

```json
{
  "scan_date": "2026-04-22",
  "posts_scanned": 47,
  "posts_qualified": 3,
  "drafts": [
    {
      "subreddit": "r/cacannabis",
      "post_title": "Need a good dispensary in San Jose for concentrates",
      "post_url": "https://reddit.com/r/cacannabis/...",
      "post_age_hours": 12,
      "relevance_score": 0.8,
      "draft_reply": "For concentrates you want somewhere with a good rotating selection of solventless rosin + live resin. I've had a good experience at Purple Lotus — the budtenders actually know their stuff and the glass case rotates weekly. Worth checking their menu; pricing has been fair when I've gone.",
      "status": "pending_review"
    }
  ]
}
```

## Critical Rules

1. **NEVER auto-post to Reddit** — all drafts go to review queue
2. Maximum 3 replies per day per client (avoid looking like a shill)
3. Skip posts where someone already recommended the dispensary
4. Skip posts that are complaints about the dispensary (escalate to agency instead)
5. Skip posts older than 48 hours (thread is dead)
6. **Skip underage threads** — never reply where OP references being <21 (or <18 for medical states). Cannabis brands replying to minors is a legal and ethical red line.
7. **Skip non-legal state threads** — if the subreddit or OP is in a state where cannabis is illegal, do not reply (liability).
8. If the dispensary has negative sentiment in the thread → SKIP and alert agency
9. **Never make medical claims in replies.** Never recommend cannabis for anxiety, pain, sleep, depression, or any condition. Always redirect medical questions to a physician.

## Dependencies

- `reddit-readonly` (ClawHub) — subreddit monitoring + post reading
