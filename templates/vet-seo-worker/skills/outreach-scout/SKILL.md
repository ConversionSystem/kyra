# Outreach Scout Skill

Find, score, and pitch pet/lifestyle blogs for backlink opportunities.

## When to Use

- On-demand when agency requests outreach targets
- Monthly scouting runs (find 10-20 new targets)
- Follow-up on unanswered pitches (5 days after initial)

## How It Works

### Phase 1: Discovery
Search for link building targets using web_search + firecrawl-search:

**Search queries:**
- `"pet blog" "guest post" [city]`
- `"veterinary" "write for us" [state]`
- `"pet care" blog [city] -pinterest -youtube`
- `"animal lover" blog [city/state]`
- `"dog mom" blog [city/state]`
- `site:wordpress.com pet [city]`
- `site:medium.com veterinary [city]` (for discovery, not publishing)

### Phase 2: Scoring
For each discovered blog, score on 0-100:

| Factor | Weight | Criteria |
|--------|--------|----------|
| Topical Fit | 30% | Pet/vet/animal content? |
| Content Freshness | 25% | Published in last 6 months? |
| Engagement | 20% | Comments, shares visible? |
| Domain Quality | 15% | Not spam, real content? |
| Local Relevance | 10% | Same city/state/region? |

**Minimum score to qualify: 40/100**

### Phase 3: Pitch Drafting
For qualified targets:
1. Scrape their most recent relevant post (firecrawl-search)
2. Use `prompts/outreach-pitch.md` template
3. Generate a personalized 100-150 word email
4. Queue in review for agency approval

### Phase 4: Follow-Up
- 5 days after initial pitch with no reply → draft one follow-up
- Follow-up is shorter (50-75 words), references original email
- Only ONE follow-up per target — never spam

## Critical Rules

- **NEVER send emails without agency approval** — all pitches go to review queue
- **NEVER pitch the same blog twice** — track all contacted targets
- Maximum 10 pitches per month per client (quality > quantity)
- Skip any blog that explicitly says "no guest posts" or "not accepting submissions"
- Skip blogs with <5 posts or no posts in 12+ months (dead blogs)

## Output

```json
{
  "targets_found": 15,
  "targets_qualified": 8,
  "pitches_drafted": 8,
  "targets": [
    {
      "blog_name": "Omaha Pet Parents",
      "url": "https://omahapetparents.com",
      "contact": "Sarah",
      "score": 72,
      "recent_post": "10 Tips for Summer Pet Safety",
      "pitch_status": "draft_pending_review",
      "proposed_topic": "How to Choose the Right Vet for Your Pet"
    }
  ]
}
```

## Dependencies

- `firecrawl-search` (ClawHub) — blog discovery + scraping
- `gmail` (ClawHub) — sending approved pitches (optional — agency can send manually)
- `web_search` (built-in) — target discovery
