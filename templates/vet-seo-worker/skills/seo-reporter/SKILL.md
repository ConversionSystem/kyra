# SEO Reporter Skill

Compile weekly SEO performance reports combining all worker activity into a client-facing deliverable.

## When to Use

- Weekly cron (Friday afternoon)
- On-demand when agency requests a status update

## Report Sections

### 1. GEO Visibility Score
- Current score (% of AI queries citing the clinic)
- Trend vs last week (↑ ↓ →)
- **Competitor comparison** — your score vs top 3 competitors (NEW)
- Top performing queries
- Queries where clinic is NOT appearing (content gaps)
- Provider breakdown (ChatGPT vs Perplexity)
- **Content gap impact** — show which gaps got content this week and expected improvement (NEW)

### 2. NAP Consistency
- Total directories audited
- Consistent / Mismatched / Not Found counts
- Specific mismatches requiring action
- New listings claimed since last report

### 3. Content Published
- Number of pieces published this week
- Breakdown by type (PR, Web 2.0, Stack)
- Links to all published content
- Word count total
- Platform coverage

### 4. Link Building & Outreach
- Outreach targets identified
- Pitches sent
- Responses received
- Links secured
- Pipeline status

### 5. Reddit / UGC Activity
- Posts monitored
- Drafts created
- Replies posted (after review)
- Threads where clinic was mentioned organically

### 6. Backlink Profile (NEW)
- Total backlinks and referring domains
- New links this month vs last month
- Outreach conversion rate (pitches → links)
- Spam link warnings (if any detected)

### 7. GBP Posts (NEW)
- Posts published this week
- Post engagement (views, clicks if available via API)
- Upcoming post schedule

### 8. Action Items for Agency
- Directories needing manual update (with pre-filled submission data)
- Content pending review in queue
- Outreach pitches awaiting approval
- GBP posts ready for review
- Reddit drafts awaiting review
- Suggested strategy adjustments based on competitor analysis

## Report Format

Generate in both JSON (for dashboard) and Markdown (for agency email/export):

### JSON (stored via SEO API)
```json
{
  "report_date": "2026-03-07",
  "period": "2026-03-01 to 2026-03-07",
  "geo": {
    "score": 32,
    "trend": "up",
    "previous": 24,
    "competitors": [
      { "name": "VCA Fremont", "score": 55, "trend": "stable" },
      { "name": "Banfield", "score": 40, "trend": "down" }
    ],
    "content_gaps_addressed": 2,
    "content_gaps_remaining": 5
  },
  "nap": { "consistent": 12, "mismatches": 3, "not_found": 5, "total_directories": 20 },
  "content": { "published": 6, "pending_review": 2, "word_count": 4800, "platforms_active": 5 },
  "outreach": { "targets": 8, "pitched": 3, "responses": 1, "links": 0 },
  "ugc": { "monitored": 47, "drafted": 3, "posted": 2 },
  "backlinks": { "total": 47, "new": 3, "lost": 0, "referring_domains": 23 },
  "gbp_posts": { "published": 2, "views": null, "clicks": null },
  "action_items": ["Review 2 pending articles", "Update Yelp listing NAP", "Approve 1 GBP post", "Claim Nextdoor and Apple Maps listings"]
}
```

### Markdown (for agency email)
Clean, branded report with:
- Client logo/name header
- Color-coded status indicators (✅ 🟡 🔴)
- Charts described in text (until dashboard has visual charts)
- Professional but readable tone
- "Powered by Kyra" footer

## Data Sources

Pull from Kyra SEO API:
- `GET /api/agency/clients/{id}/seo` — all SEO data
- Aggregate from: geo_scores, nap_status, content_published, outreach_pipeline, reddit_queue

## Storage

```
PUT /api/agency/clients/{clientId}/seo
Body: { "dataType": "last_report", "data": { ...report } }
```

## Dependencies

- All other skills feed data into the reporter
- No external API calls needed — purely aggregation + formatting
