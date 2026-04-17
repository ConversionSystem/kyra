/**
 * /feed.xml — RSS 2.0 feed for blog posts.
 * Enables syndication, podcast apps, AI crawlers, and Google Discover.
 */

import { POSTS } from '@/lib/blog/posts';

export const dynamic = 'force-static';

const BASE = 'https://kyra.conversionsystem.com';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET() {
  const sorted = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
  const latestDate = sorted[0]?.date
    ? new Date(sorted[0].date).toUTCString()
    : new Date().toUTCString();

  const items = sorted
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${BASE}/blog/${post.slug}</link>
      <guid isPermaLink="true">${BASE}/blog/${post.slug}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <category>${escapeXml(post.category)}</category>
    </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kyra AI Blog</title>
    <link>${BASE}/blog</link>
    <description>Practical guides on deploying AI agents, white-label AI platforms, and autonomous workforce design for agencies.</description>
    <language>en-us</language>
    <lastBuildDate>${latestDate}</lastBuildDate>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml"/>
    <managingEditor>angel@conversionsystem.com (Conversion System)</managingEditor>
    <webMaster>angel@conversionsystem.com (Conversion System)</webMaster>
    <ttl>1440</ttl>
${items}
  </channel>
</rss>`;

  return new Response(xml.trim(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
