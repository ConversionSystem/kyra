# Semantic Stacker Skill

Build semantic authority stacks on high-trust domains. Each stack page interlinks to all other stack pages + the clinic website, creating a web of topical authority.

## Supported Platforms

| Platform | Trust Level | Method | ClawHub Skill |
|----------|------------|--------|---------------|
| Google Docs | Very High | Google Docs API | google-docs ✅ |
| Google Sites | Very High | Sites API | custom |
| GitHub Pages | High | Git push | github-pages-auto-deploy ✅ |
| Notion | High | Notion API | notion ✅ |
| Telegraph | Medium | Telegraph API | custom (shared with web20-publisher) |

## When to Use

- Initial setup: build the full stack (5 pages, one per platform)
- Monthly refresh: update content + add new interlinks
- After new content is published on any platform (add crosslinks)

## Stack Architecture

```
Google Docs (authority page) ←→ Google Sites (location page)
    ↕                                    ↕
Notion (services overview)  ←→  GitHub Pages (community guide)
    ↕                                    ↕
Telegraph (location guide)  ←→  Clinic Website (home)
```

Every page links to every other page + the clinic website + GBP.

## Content Differentiation

Each platform gets a UNIQUE angle — same clinic, different presentation:

- **Google Docs:** Comprehensive practice overview (encyclopedic tone)
- **Google Sites:** Location-focused with driving directions from landmarks
- **GitHub Pages:** Community resource guide (pet care tips + local resources)
- **Notion:** Services deep-dive with structured data blocks
- **Telegraph:** Personal narrative style ("Why pet owners in [City] trust...")

## Interlink Format

At the bottom of every stack page:

```
--- Learn More About [Clinic Name] ---
• Official Website: [website]
• Google Business Profile: [GBP URL]
• Comprehensive Practice Guide: [Google Docs URL]
• Location & Directions: [Google Sites URL]
• Community Pet Care Resources: [GitHub Pages URL]
• Our Services: [Notion URL]
• Why Pet Owners Trust Us: [Telegraph URL]
```

## Setup Flow

1. Create accounts/pages on each platform (one-time)
2. Generate unique content for each platform via content-writer skill
3. Publish all 5 pages
4. Add interlinks to all pages (requires knowing all URLs first)
5. Update the interlink block monthly as new content is added

## Output

```json
{
  "stack_id": "goodrich-vet-omaha",
  "pages": [
    { "platform": "google_docs", "url": "https://docs.google.com/...", "status": "live" },
    { "platform": "google_sites", "url": "https://sites.google.com/...", "status": "live" },
    { "platform": "github_pages", "url": "https://goodrichvet.github.io/omaha", "status": "live" },
    { "platform": "notion", "url": "https://notion.so/...", "status": "live" },
    { "platform": "telegraph", "url": "https://telegra.ph/...", "status": "live" }
  ],
  "interlinks_updated": true,
  "last_refreshed": "2026-03-04"
}
```
