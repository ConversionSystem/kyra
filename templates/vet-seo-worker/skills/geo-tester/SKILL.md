# GEO Tester Skill

Test whether a veterinary clinic appears in AI-generated search results (ChatGPT, Perplexity). Track citation rates over time.

## When to Use

- Weekly GEO visibility testing (Monday cron)
- On-demand spot checks when requested
- After publishing new content (measure impact)

## How It Works

1. Load the clinic's GEO query templates from config
2. For each query, call ChatGPT (gpt-4o-mini) and Perplexity (sonar) asking the query
3. Analyze the AI response to determine if the clinic is mentioned/cited
4. Score each result: `cited` (boolean), `position` (1-5 if ranked, null if not), `context` (snippet)
5. Calculate overall GEO score: `(cited_count / total_queries) * 100`
6. Compare to previous week's score to determine trend
7. Store results via Kyra SEO API
8. Flag significant changes (>10% swing) for agency review

## Usage

```
Run a GEO visibility test for [clinic name]
```

## Query Execution

For each query template (25 total):

### ChatGPT Test
```
System: You are a helpful assistant answering questions about local services.
User: [query with city/clinic substituted]
```
Parse the response for:
- Exact clinic name match
- Address/phone match
- Website URL match
- Any mention in context

### Perplexity Test
Use `web_search` tool with the query. Parse citations and answer text for clinic mentions.

## Scoring

- **Cited:** Clinic name appears in the AI response
- **Position:** If multiple businesses listed, what position (1 = first mentioned)
- **GEO Score:** Percentage of queries where the clinic was cited
- **Trend:** Compare to last week: `up` (>5% increase), `down` (>5% decrease), `stable`

## Output Format

```json
{
  "test_date": "2026-03-04",
  "clinic": "Goodrich Veterinary Clinic",
  "city": "Omaha",
  "overall_score": 32,
  "trend": "up",
  "previous_score": 24,
  "results": [
    {
      "query": "Best veterinarian in Omaha",
      "provider": "chatgpt",
      "cited": true,
      "position": 3,
      "context": "...including Goodrich Veterinary Clinic on Main St..."
    }
  ],
  "recommendations": [
    "Clinic not appearing for emergency-related queries — consider publishing emergency vet content",
    "Strong performance on dental queries — leverage this angle"
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

## Error Handling

- If ChatGPT API fails: log error, skip that query, report partial results
- If Perplexity fails: fall back to web_search tool
- If <50% of queries succeed: flag as "incomplete test" in report
- Never block on a single query failure
