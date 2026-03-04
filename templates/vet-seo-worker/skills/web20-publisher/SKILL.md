# Web 2.0 Publisher Skill

Publish approved content to Web 2.0 platforms via their APIs.

## Supported Platforms

| Platform | Method | Auth | ClawHub Skill |
|----------|--------|------|---------------|
| WordPress.com | REST API | OAuth2 | wordpress-pro ✅ |
| Blogger | Blogger API v3 | Google Service Account | custom |
| Telegraph | Telegraph API | None | custom |
| Notion | Notion API | Token | notion ✅ |

## When to Use

- After content is approved in the review queue
- Batch publishing on scheduled days (Tue-Thu)

## How It Works

1. Receive approved content from review queue (title, HTML, markdown, target platform)
2. Format content for the target platform's requirements
3. Publish via API
4. Record the published URL
5. Store result via Kyra SEO API

## Platform-Specific Notes

### WordPress.com
- Uses ClawHub `wordpress-pro` skill
- Supports full HTML including Maps embed iframes
- Categories: create "Veterinary Care" + city-specific category
- Tags: service keywords + city name

### Blogger
- Google Blogger API v3: `POST https://www.googleapis.com/blogger/v3/blogs/{blogId}/posts`
- Supports full HTML
- Requires Google Service Account with Blogger API enabled
- One blog per client (created during setup)

### Telegraph
- `POST https://api.telegra.ph/createAccount` (once per client)
- `POST https://api.telegra.ph/createPage` with Node content
- No auth needed — uses access_token from account creation
- Supports basic HTML (no iframes — skip Maps embed)
- Instant publish, no moderation

### Notion
- Uses ClawHub `notion` skill
- Create page in client's Notion workspace (or shared workspace)
- Blocks API — convert HTML to Notion block format
- Set page to public for SEO value

## Error Handling

- If API returns auth error → flag for agency to re-authenticate
- If rate limited → queue for retry in 1 hour
- If content rejected by platform → flag with reason for agency review
- Always log the attempt regardless of outcome

## Output

```json
{
  "platform": "wordpress",
  "status": "published",
  "url": "https://goodrichvet.wordpress.com/2026/03/04/pet-dental-care-omaha",
  "published_at": "2026-03-04T14:30:00Z",
  "content_id": "abc123"
}
```
