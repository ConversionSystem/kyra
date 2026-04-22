# Outreach Scout Skill

Find, score, and pitch cannabis/lifestyle blogs for backlink opportunities.

## When to Use

- On-demand when agency requests outreach targets
- Monthly scouting runs (find 10-20 new targets)
- Follow-up on unanswered pitches (5 days after initial)

## How It Works

### Phase 1: Discovery
Search for link building targets using web_search + firecrawl-search:

**Search queries:**
- `"cannabis blog" "guest post" [city]`
- `"dispensary" "write for us" [state]`
- `"cannabis lifestyle" blog [city] -pinterest -youtube`
- `"cannabis culture" blog [city/state]`
- `"weed blog" [state]`
- `site:wordpress.com cannabis [city]`
- `site:medium.com dispensary [city]` (for discovery, not publishing)

### Phase 2: Cannabis-Compatibility Screen (NEW — CRITICAL)
Before scoring, filter OUT any blog that:
- Has an explicit "no cannabis content" policy
- Runs AdSense (Google prohibits cannabis on most AdSense inventory)
- Is a children's, faith-based, medical-advice, or recovery-focused publication
- Is based in a state/country where cannabis is illegal (link still has value, but the publication won't accept)

Mark each target as `accepts_cannabis: true|false|unknown`. Only pitch `true` targets.

### Phase 3: Scoring
For each cannabis-compatible blog, score on 0-100:

| Factor | Weight | Criteria |
|--------|--------|----------|
| Topical Fit | 30% | Cannabis/dispensary/lifestyle content? |
| Content Freshness | 25% | Published in last 6 months? |
| Engagement | 20% | Comments, shares visible? |
| Domain Quality | 15% | Not spam, real content? |
| Local Relevance | 10% | Same city/state/region? |

**Minimum score to qualify: 40/100**

### Phase 4: Pitch Drafting
For qualified targets:
1. Scrape their most recent relevant post (firecrawl-search)
2. Use `prompts/outreach-pitch.md` template
3. Generate a personalized 100-150 word email
4. Queue in review for agency approval

### Phase 5: Follow-Up
- 5 days after initial pitch with no reply → draft one follow-up
- Follow-up is shorter (50-75 words), references original email
- Only ONE follow-up per target — never spam

## Critical Rules

- **NEVER send emails without agency approval** — all pitches go to review queue
- **NEVER pitch the same blog twice** — track all contacted targets
- **NEVER pitch cannabis content to publications that prohibit it** — burns sender reputation
- Maximum 10 pitches per month per client (quality > quantity)
- Skip any blog that explicitly says "no guest posts" or "not accepting submissions"
- Skip blogs with <5 posts or no posts in 12+ months (dead blogs)
- Skip any publication whose ad network prohibits cannabis (AdSense, most mainstream programmatic)

## Output

```json
{
  "targets_found": 15,
  "targets_cannabis_compatible": 10,
  "targets_qualified": 8,
  "pitches_drafted": 8,
  "targets": [
    {
      "blog_name": "NorCal Cannabis Journal",
      "url": "https://norcalcannabisjournal.com",
      "contact": "Sarah",
      "score": 72,
      "accepts_cannabis": true,
      "recent_post": "10 California Dispensaries Worth the Drive",
      "pitch_status": "draft_pending_review",
      "proposed_topic": "Terpene Profiles 101: What Budtenders Wish Customers Knew"
    }
  ]
}
```

## Backlink Tracking Integration (NEW)

After pitches are sent, the backlink-monitor skill (monthly cron) checks whether targeted blogs actually linked:
1. Outreach Scout stores pitched targets in seo_data
2. Backlink Monitor scans for new links and cross-references against pitched targets
3. If a link is found from a pitched target → status updated to "link_secured"
4. Conversion rate tracked in weekly SEO report

This closes the loop: scout → pitch → track → report.

## Dependencies

- `firecrawl-search` (ClawHub) — blog discovery + scraping
- `gmail` (ClawHub) — sending approved pitches (optional — agency can send manually)
- `web_search` (built-in) — target discovery
- `backlink-monitor` — cross-references pitched targets with actual links (NEW)
