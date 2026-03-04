# SEO Reporter Skill

Compile weekly SEO performance reports combining all worker activity into a client-facing deliverable.

## When to Use

- Weekly cron (Friday afternoon)
- On-demand when agency requests a status update

## Report Sections

### 1. GEO Visibility Score
- Current score (% of AI queries citing the clinic)
- Trend vs last week (↑ ↓ →)
- Top performing queries
- Queries where clinic is NOT appearing (opportunities)
- Provider breakdown (ChatGPT vs Perplexity)

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

### 6. Action Items for Agency
- Directories needing manual update
- Content pending review
- Outreach pitches awaiting approval
- Suggested strategy adjustments

## Report Format

Generate in both JSON (for dashboard) and Markdown (for agency email/export):

### JSON (stored via SEO API)
```json
{
  "report_date": "2026-03-07",
  "period": "2026-03-01 to 2026-03-07",
  "geo": { "score": 32, "trend": "up", "previous": 24 },
  "nap": { "consistent": 10, "mismatches": 3, "not_found": 2 },
  "content": { "published": 4, "pending_review": 2, "word_count": 3200 },
  "outreach": { "targets": 8, "pitched": 3, "responses": 1, "links": 0 },
  "ugc": { "monitored": 47, "drafted": 3, "posted": 2 },
  "action_items": ["Review 2 pending articles", "Update Yelp listing NAP"]
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
