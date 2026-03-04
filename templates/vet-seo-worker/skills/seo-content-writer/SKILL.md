# SEO Content Writer Skill

Generate SEO-optimized content for veterinary clinics: press releases, Web 2.0 articles, and semantic stack pages.

## When to Use

- Tuesday-Thursday content creation (scheduled)
- On-demand content generation when agency requests
- After GEO test reveals gaps (targeted content for weak queries)

## Content Types

### 1. Press Releases
- **Length:** 450-550 words, AP Style format
- **Angle:** Newsworthy event/service/community involvement
- **Template:** `prompts/press-release.md`
- **Frequency:** 2 per month per client

### 2. Web 2.0 Articles
- **Length:** 650-800 words, locally-optimized
- **Platforms:** WordPress.com, Blogger, Telegraph, Notion
- **Template:** `prompts/web20-article.md`
- **Frequency:** 4-6 per month per client

### 3. Semantic Stack Pages
- **Length:** 600-1,000 words, authority-focused
- **Platforms:** Google Docs, Google Sites, GitHub Pages, Notion, Telegraph
- **Template:** `prompts/stack-content.md`
- **Frequency:** 5-7 per month per client (one per platform)

## Content Calendar

Generate a monthly content calendar based on:
1. GEO test results (weak areas need content)
2. Clinic services (rotate through all services)
3. Seasonal relevance (flea/tick spring, holiday boarding, etc.)
4. Platform coverage (ensure all platforms get content)

## Uniqueness Requirements

- Every piece MUST be unique — no duplicate content across platforms
- Vary: angles, structure, examples, local references, tone emphasis
- Track all published titles to prevent overlap
- Use different local landmarks/neighborhoods in each piece

## Review Queue Integration

ALL content goes through Kyra's review queue before publishing:
1. Content generated → saved as draft
2. Draft queued for agency review
3. Agency approves / edits / rejects
4. On approval → passed to publisher skill

## Output

Each content piece outputs:
```json
{
  "type": "press_release | web20 | semantic_stack",
  "title": "...",
  "content_html": "...",
  "content_markdown": "...",
  "target_platform": "wordpress | blogger | telegraph | notion | google_docs | google_sites | github_pages",
  "target_keyword": "...",
  "word_count": 720,
  "nap_included": true,
  "maps_embed_included": true,
  "links_to_website": 2,
  "links_to_gbp": 1,
  "city_mentions": 4,
  "status": "draft_pending_review"
}
```
