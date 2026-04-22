# SEO Content Writer Skill

Generate SEO-optimized content for cannabis dispensaries: press releases, Web 2.0 articles, and semantic stack pages.

## When to Use

- Tuesday-Thursday content creation (scheduled)
- On-demand content generation when agency requests
- After GEO test reveals gaps (targeted content for weak queries)

## Content Types

### 1. Press Releases
- **Length:** 450-550 words, AP Style format
- **Angle:** Newsworthy event/product drop/community involvement
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

## GEO-Driven Content Targeting (PRIORITY)

Before generating content, ALWAYS check the content gap analysis data:

1. Fetch `GET /api/agency/clients/{id}/seo` → look for `dataType: "content_gaps"`
2. High-priority gaps get content FIRST — before any scheduled content
3. Match gap themes to content types:
   - "delivery" gaps → press release about after-hours delivery + Web 2.0 article on delivery zones
   - "product" gaps → semantic stack page about that product category (e.g., concentrates, edibles)
   - "location" gaps → location-focused Web 2.0 with neighborhood references
   - "strain/genetics" gaps → educational articles about strain lineage and terpene profiles
4. After publishing gap-targeted content, re-test that query in the next GEO run

Example flow:
- GEO test shows 0% citation for "best cannabis delivery in San Jose"
- Content writer creates: "After-Hours Cannabis Delivery in San Jose — What [Dispensary] Customers Order Most"
- Published to Telegraph + WordPress + GitHub Pages
- Next week's GEO test re-checks that query → track improvement

## Content Calendar

Generate a monthly content calendar based on:
1. **GEO content gaps (highest priority)** — queries where dispensary has 0% citation
2. **Competitor analysis** — topics where competitor dispensaries are cited but client isn't
3. Dispensary products (rotate through all categories: flower, pre-rolls, vapes, edibles, concentrates, topicals)
4. Seasonal relevance (4/20 promotions, summer festival flower, Croptober harvest, Green Wednesday/Black Friday)
5. Platform coverage (ensure all platforms get content)

## Uniqueness Requirements

- Every piece MUST be unique — no duplicate content across platforms
- Vary: angles, structure, examples, local references, tone emphasis
- Track all published titles to prevent overlap
- Use different local landmarks/neighborhoods in each piece

## Compliance Checks (NEW — cannabis-specific)

Every piece MUST pass these checks before going to review:
- **License number present** — state license must appear in every article/page
- **Age-gate language present** — "21+" or "medical patients only" somewhere in the copy
- **No medical claims** — scan for "treats", "cures", "heals", "remedy", "medicine" and flag if present
- **No inducement language** — scan for "free cannabis", "free joint", "free sample" and flag
- **"Cannabis" preferred over "marijuana"** — flag if "marijuana" used more than once (may be intentional for SEO, but warn)
- **State-appropriate** — if client is in a medical-only state, all references to recreational use should be flagged

## Review Queue Integration

ALL content goes through Kyra's review queue before publishing:
1. Content generated → saved as draft
2. Draft queued for agency review (with compliance check results attached)
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
  "license_number_included": true,
  "age_gate_included": true,
  "medical_claims_flagged": [],
  "maps_embed_included": true,
  "links_to_website": 2,
  "links_to_gbp": 1,
  "city_mentions": 4,
  "status": "draft_pending_review"
}
```
