# Backlink Monitor Skill

Track new and lost backlinks pointing to the dispensary's website. Monitor outreach success and detect organic link growth.

## When to Use

- Monthly cron: comprehensive backlink scan on the 1st of each month
- After outreach pitches are sent: check for new links from targeted blogs
- On-demand when agency requests link profile status

## How It Works

1. Search for backlinks using web_search and Firecrawl:
   - `link:{{WEBSITE}}` (Google)
   - `"{{DISPENSARY_NAME}}" -site:{{WEBSITE}}` (mentions that might have links)
   - `"{{WEBSITE}}" -site:{{WEBSITE}}` (explicit URL citations)
2. For each found link: verify it's actually a backlink (not just a mention)
3. Classify: do-follow vs no-follow, editorial vs directory vs social
4. Compare to previous month's scan — identify new links and lost links
5. Cross-reference with outreach pipeline — which pitched targets actually linked?
6. Calculate simple metrics: total backlinks, new this month, referring domains
7. Store results for the SEO reporter

## Link Classification

| Type | Value | Examples |
|------|-------|---------|
| Editorial | ★★★★★ | Guest post on cannabis/lifestyle blog, news article mention |
| Cannabis Directory | ★★★★☆ | Weedmaps, Leafly, Jane, AllBud listings (highest trust for cannabis SEO) |
| Directory | ★★★☆☆ | Yelp, BBB, Yellowpages listing |
| Social | ★★☆☆☆ | Reddit, Facebook, Nextdoor |
| Self-Published | ★★★☆☆ | WordPress.com, Blogger, Medium article |
| Semantic Stack | ★★★★☆ | Google Docs, Google Sites, GitHub Pages, Notion |
| Spam | ☆☆☆☆☆ | Link farms, irrelevant foreign sites, cannabis link farms |

## What to Track Per Link

```json
{
  "url": "https://cannabisnewsla.com/best-dispensaries-2026",
  "anchor_text": "Purple Lotus Dispensary",
  "link_type": "editorial",
  "follow_status": "do-follow",
  "domain_authority_estimate": "medium",
  "first_seen": "2026-03-15",
  "last_verified": "2026-04-01",
  "status": "active",
  "source": "outreach"
}
```

## Outreach Cross-Reference

After each scan, match new backlinks against the outreach pipeline:
1. Load outreach targets from seo_data
2. For each new backlink domain, check if it was a pitched target
3. If match: update outreach status to "link_secured" with the URL
4. Calculate outreach success rate: links_secured / pitches_sent

## Monthly Report Data

```json
{
  "scan_date": "2026-04-01",
  "total_backlinks": 47,
  "referring_domains": 23,
  "new_this_month": 5,
  "lost_this_month": 1,
  "by_type": {
    "editorial": 3,
    "cannabis_directory": 8,
    "directory": 7,
    "social": 8,
    "self_published": 12,
    "semantic_stack": 5,
    "spam": 4
  },
  "outreach_conversions": {
    "pitched": 8,
    "secured": 2,
    "rate": 0.25
  },
  "new_links": [
    { "url": "...", "anchor_text": "...", "type": "editorial", "first_seen": "..." }
  ],
  "lost_links": [
    { "url": "...", "reason": "page_removed", "last_seen": "..." }
  ]
}
```

Store via: `PUT /api/agency/clients/{id}/seo` with `dataType: "backlink_profile"`

## Disavow Detection

If spam backlinks are detected (cannabis link farms, irrelevant foreign sites):
- Flag in report with ⚠️ warning
- Suggest: "Consider adding these domains to Google's disavow file"
- Track spam link count over time — increasing spam = potential negative SEO attack (common in competitive cannabis markets)

## Cron Schedule

Add to `config/cron-schedule.json`:
```json
{
  "id": "backlink-scan-monthly",
  "skill": "backlink-monitor",
  "schedule": "0 8 1 * *",
  "description": "Monthly backlink scan — 1st of each month at 8 AM",
  "enabled": true
}
```

## Dependencies

- `firecrawl-search` (ClawHub) — verify backlink pages
- `web_search` (built-in) — discover backlinks
- No API key beyond Firecrawl

## Cost

- ~20-30 Firecrawl scrapes per scan × $0.005/scrape = ~$0.15 per monthly scan
- web_search queries: ~10 queries × $0.01 = ~$0.10
- Total: ~$0.25/month per client
