# GEO Tester Skill

Test whether a cannabis dispensary appears in AI-generated search results (ChatGPT, Perplexity). Track citation rates over time.

## When to Use

- Weekly GEO visibility testing (Monday cron)
- On-demand spot checks when requested
- After publishing new content (measure impact)

## How It Works

1. Load the dispensary's GEO query templates from config
2. For each query, call ChatGPT (gpt-4o-mini) and Perplexity (sonar) asking the query
3. Analyze the AI response to determine if the dispensary is mentioned/cited
4. Score each result: `cited` (boolean), `position` (1-5 if ranked, null if not), `context` (snippet)
5. Calculate overall GEO score: `(cited_count / total_queries) * 100`
6. Compare to previous week's score to determine trend
7. Store results via Kyra SEO API
8. Flag significant changes (>10% swing) for agency review

## Usage

```
Run a GEO visibility test for [dispensary name]
```

## Query Execution

For each query template (25 total):

### ChatGPT Test
```
System: You are a helpful assistant answering questions about local cannabis dispensaries and retail cannabis products (legal adult-use + medical markets only).
User: [query with city/dispensary/product substituted]
```
Parse the response for:
- Exact dispensary name match
- Address/phone match
- Website URL match
- Any mention in context

### Perplexity Test
Use `web_search` tool with the query. Parse citations and answer text for dispensary mentions.

## Scoring

- **Cited:** Dispensary name appears in the AI response
- **Position:** If multiple dispensaries listed, what position (1 = first mentioned)
- **GEO Score:** Percentage of queries where the dispensary was cited
- **Trend:** Compare to last week: `up` (>5% increase), `down` (>5% decrease), `stable`

## Output Format

```json
{
  "test_date": "2026-04-22",
  "dispensary": "Purple Lotus",
  "city": "San Jose",
  "state": "CA",
  "overall_score": 32,
  "trend": "up",
  "previous_score": 24,
  "results": [
    {
      "query": "Best dispensary in San Jose",
      "provider": "chatgpt",
      "cited": true,
      "position": 3,
      "context": "...including Purple Lotus on Lundy Ave..."
    }
  ],
  "recommendations": [
    "Dispensary not appearing for delivery queries — consider publishing after-hours delivery content",
    "Strong performance on pre-roll queries — leverage this angle"
  ]
}
```

## Storage

POST results to Kyra API:
```
PUT /api/agency/clients/{clientId}/seo
Body: { "dataType": "geo_scores", "data": [...results] }
```
Also update:
```
PUT /api/agency/clients/{clientId}/seo
Body: { "dataType": "geo_score_current", "data": 32 }
Body: { "dataType": "geo_score_trend", "data": "up" }
```

## Rate Limits

- ChatGPT: 25 queries × ~500 tokens = ~12,500 tokens per test ($0.005)
- Perplexity: 25 queries × sonar pricing (~$0.01 per query) = ~$0.25 per test
- Total cost per weekly test: ~$0.26
- Run weekly = ~$1.04/month per client

## Competitor Tracking (NEW)

After running GEO tests for the client, identify the top 3 most-cited competitor dispensaries:

1. Run 3 competitor-specific queries from `config/geo-queries.json → competitor_queries`
2. Parse AI responses to extract all mentioned dispensaries in the city
3. Count citations per competitor across all standard query results
4. Store top 3 competitors with their citation rates
5. Track week-over-week trend for each competitor

Output:
```json
{
  "competitors": [
    { "name": "Harborside", "geo_score": 55, "trend": "stable", "most_cited_for": ["best dispensary", "recreational dispensary"] },
    { "name": "Caliva", "geo_score": 40, "trend": "down", "most_cited_for": ["cheapest dispensary", "delivery"] },
    { "name": "Airfield Supply Co", "geo_score": 35, "trend": "up", "most_cited_for": ["best concentrates", "best flower"] }
  ]
}
```

Store via: `PUT /api/agency/clients/{id}/seo` with `dataType: "competitor_scores"`

## Content Gap Analysis (NEW)

After GEO tests complete, identify queries where the dispensary was NOT cited at all (0% citation):

1. Filter results where `cited === false` for BOTH ChatGPT and Perplexity
2. Group by query theme (delivery, product, price, strain, general brand awareness)
3. Prioritize gaps by: query search volume estimate (higher = more urgent)
4. Store as content targets for the content writer

Output:
```json
{
  "gaps": [
    { "query": "Best cannabis delivery in San Jose", "theme": "delivery", "priority": "high", "suggested_content": "After-hours cannabis delivery in San Jose — zones, ETA, and what to order first" },
    { "query": "Best concentrates dispensary San Jose", "theme": "product", "priority": "medium", "suggested_content": "Concentrates at [Dispensary] — rosin, resin, badder, and how to pick" }
  ]
}
```

Store via: `PUT /api/agency/clients/{id}/seo` with `dataType: "content_gaps"`

The content writer skill should check for `content_gaps` data and prioritize content creation for high-priority gaps.

## Error Handling

- If ChatGPT API fails: log error, skip that query, report partial results
- If Perplexity fails: fall back to web_search tool
- If <50% of queries succeed: flag as "incomplete test" in report
- Never block on a single query failure
- Some AI providers restrict cannabis queries in certain geos (notably Gemini) — if the response is a refusal, mark `cited: false` with context `"provider_refusal"` and still count toward total
