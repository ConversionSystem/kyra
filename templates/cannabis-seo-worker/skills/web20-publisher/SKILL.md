# Web 2.0 Publisher Skill

Publish approved content to Web 2.0 platforms via their APIs. All platforms are auto-provisioned by Kyra — agencies never configure API keys.

## Supported Platforms

| Platform | Method | Auth | Status |
|----------|--------|------|--------|
| Telegraph | Telegraph API | None (auto-created) | ✅ Fully automated — cannabis friendly |
| WordPress.com | REST API | Kyra-managed token | ✅ Auto-provisioned — allows cannabis content |
| Blogger | Blogger API v3 | Kyra Google SA | ✅ Auto-provisioned — cannabis permitted, no psychoactive claims |
| Notion | Notion API | Kyra-managed token | ✅ Auto-provisioned |
| GitHub Pages | Contents API | Kyra-managed token | ✅ Auto-provisioned (with schema markup) |
| Google Docs | Docs API | Kyra Google SA | ✅ Auto-provisioned |
| Google Sites | — | — | 🔜 Coming soon |

## When to Use

- **Automatically** — content approved in review queue triggers auto-publish to assigned platform
- Batch publishing on scheduled days (Tue-Thu) if review queue has approved content

## How It Works

1. Receive approved content from review queue (title, HTML, markdown, target platform)
2. Format content for the target platform's requirements
3. Verify compliance metadata (license number present, age-gate present, no medical claims)
4. Publish via API
5. Record the published URL
6. Store result via Kyra SEO API

## Platform-Specific Notes

### WordPress.com
- Uses ClawHub `wordpress-pro` skill
- Supports full HTML including Maps embed iframes
- Categories: create "Cannabis" + "Dispensary News" + city-specific category
- Tags: product keywords + city name + strain names
- WordPress.com allows cannabis content on dispensary-operated blogs in legal states; do NOT publish to WordPress.com on non-legal-state blogs

### Blogger
- Google Blogger API v3: `POST https://www.googleapis.com/blogger/v3/blogs/{blogId}/posts`
- Supports full HTML
- Requires Google Service Account with Blogger API enabled
- One blog per client (created during setup)
- Google demonetizes cannabis content on AdSense — acceptable since we don't monetize via ads; SEO is the goal

### Telegraph
- `POST https://api.telegra.ph/createAccount` (once per client)
- `POST https://api.telegra.ph/createPage` with Node content
- No auth needed — uses access_token from account creation
- Supports basic HTML (no iframes — skip Maps embed)
- Instant publish, no moderation — safest cannabis publishing platform
- Include age-gate warning at top of every Telegraph cannabis article

### Notion
- Uses ClawHub `notion` skill
- Create page in client's Notion workspace (or shared workspace)
- Blocks API — convert HTML to Notion block format
- Set page to public for SEO value

## Error Handling

- If API returns auth error → flag for agency to re-authenticate
- If rate limited → queue for retry in 1 hour
- If content rejected by platform (WordPress/Blogger may flag cannabis terms) → flag with reason for agency review; suggest alternate wording that preserves SEO intent
- Always log the attempt regardless of outcome
- If a platform strips or rejects cannabis content 3 times in a row → escalate to agency; may need to drop that platform for this client

## Output

```json
{
  "platform": "wordpress",
  "status": "published",
  "url": "https://purplelotus.wordpress.com/2026/04/22/best-pre-rolls-san-jose",
  "published_at": "2026-04-22T14:30:00Z",
  "content_id": "abc123",
  "compliance_verified": {
    "license_number_present": true,
    "age_gate_present": true,
    "medical_claims_flagged": []
  }
}
```
