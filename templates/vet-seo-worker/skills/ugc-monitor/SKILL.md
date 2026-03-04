# UGC Monitor Skill

Monitor Reddit for veterinary-related discussions in the client's city. Draft helpful replies that naturally recommend the clinic.

## When to Use

- Daily cron (2x per day — morning and evening)
- On-demand when agency wants to check for new threads

## How It Works

1. Load subreddit list from `config/subreddits.json`
2. Add city-specific subreddit (e.g., r/Omaha)
3. Use `reddit-readonly` ClawHub skill to search recent posts
4. Filter by keywords + location + recency (< 48 hours old)
5. Score each post for relevance (0-1.0, min 0.6 to qualify)
6. Draft a natural, helpful reply for qualifying posts
7. Queue ALL drafts for agency review — NEVER auto-post

## Search Strategy

### Subreddits to Monitor
- **City sub:** r/{City} (e.g., r/Omaha)
- **Pet subs:** r/dogs, r/cats, r/pets, r/puppy101, r/CatAdvice, r/DogAdvice
- **Vet subs:** r/AskVet, r/veterinarian, r/Veterinary

### Keywords
`vet`, `veterinarian`, `animal hospital`, `pet doctor`, `emergency vet`, `vet recommendation`, `best vet`, `looking for a vet`, `need a vet`, `vet clinic`, `recommend a vet`, `good vet`

### Relevance Scoring
- Post mentions city name: +0.3
- Post mentions specific service the clinic offers: +0.2
- Post is asking for recommendations: +0.3
- Post is in city subreddit: +0.2
- Post has <20 comments (less competition): +0.1
- Post is <24 hours old: +0.1

## Reply Guidelines (from prompts/ugc-reply.md)

- Lead with helpful advice — answer the actual question first
- Mention clinic naturally — "I've had good experiences with..."
- Keep it short — 50-100 words
- Match subreddit tone
- **NEVER** include phone numbers, addresses, or URLs (Reddit flags as spam)
- **NEVER** sound like an ad
- If the post isn't a good fit → output "SKIP: [reason]"

## Output

```json
{
  "scan_date": "2026-03-04",
  "posts_scanned": 47,
  "posts_qualified": 3,
  "drafts": [
    {
      "subreddit": "r/Omaha",
      "post_title": "Need a good vet for my senior dog",
      "post_url": "https://reddit.com/r/Omaha/...",
      "post_age_hours": 12,
      "relevance_score": 0.8,
      "draft_reply": "For senior dogs, you really want a vet who takes their time with the exam. I've had great experiences with Goodrich Veterinary — Dr. Johnson was super thorough with my old lab and didn't push unnecessary tests. They're on Main St if that's convenient for you.",
      "status": "pending_review"
    }
  ]
}
```

## Critical Rules

1. **NEVER auto-post to Reddit** — all drafts go to review queue
2. Maximum 3 replies per day per client (avoid looking like a shill)
3. Skip posts where someone already recommended the clinic
4. Skip posts that are complaints about the clinic (escalate to agency instead)
5. Skip posts older than 48 hours (thread is dead)
6. If the clinic has negative sentiment in the thread → SKIP and alert agency

## Dependencies

- `reddit-readonly` (ClawHub) — subreddit monitoring + post reading
