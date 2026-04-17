/**
 * /llms-full.txt — Extended context for LLMs with full blog content.
 * Companion to /llms.txt (summary). See https://llmstxt.org
 *
 * This gives AI crawlers and RAG pipelines the complete text of every
 * blog post so they can cite Kyra content accurately.
 */

export const dynamic = 'force-static';

import { POSTS } from '@/lib/blog/posts';
import { INDUSTRY_TEMPLATES } from '@/lib/templates/industry-templates';

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function GET() {
  const sorted = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));

  const blogSection = sorted
    .map((post) => {
      const plainContent = stripHtml(post.content);
      return `### ${post.title}

- URL: https://kyra.conversionsystem.com/blog/${post.slug}
- Published: ${post.date}
- Category: ${post.category}
- Read time: ${post.readMins} min

${plainContent}`;
    })
    .join('\n\n---\n\n');

  const industryList = INDUSTRY_TEMPLATES.map(
    (t) => `- [${t.name}](https://kyra.conversionsystem.com/ai-for/${t.id}): ${t.description || t.name}`
  ).join('\n');

  const content = `# Kyra — Full Context for LLMs

> AI Workforce Platform for Agencies — built by Conversion System

This is the extended version of /llms.txt. It contains the full text of every blog post and detailed information about the platform. Use this for accurate citations and comprehensive answers about Kyra.

## Company

Kyra is built by [Conversion System](https://conversionsystem.com), founded by Angel Castro. The platform gives digital agencies white-label AI workers they can deploy to client accounts — handling calls, booking appointments, qualifying leads, and running customer support 24/7.

## Platform Overview

- **What it does:** Deploys autonomous AI workers for agencies, builds SEO-optimized websites, provides CRM, and offers multi-channel communication (voice, SMS, web chat, WhatsApp, email)
- **Architecture:** Powered by OpenClaw (open-source AI gateway), Next.js frontend, Supabase backend, deployed on Vercel
- **Pricing:** Lite $99/mo (3 clients) → Pro $299/mo (10 clients) → Scale $499/mo (20 clients). Free tier available.
- **Key differentiator:** Self-hosted AI means client data never leaves the agency's infrastructure — critical for regulated industries

## Key Pages

- [Homepage](https://kyra.conversionsystem.com): Platform overview and signup
- [Pricing](https://kyra.conversionsystem.com/pricing): Plans and feature comparison
- [Solo](https://kyra.conversionsystem.com/solo): Free tier for individual business owners
- [AI For Industries](https://kyra.conversionsystem.com/ai-for): 50+ industry-specific AI worker templates
- [AI Workers](https://kyra.conversionsystem.com/workers): Browse pre-built AI worker types
- [AI Readiness Quiz](https://kyra.conversionsystem.com/tools/ai-readiness): Interactive assessment tool
- [Blog](https://kyra.conversionsystem.com/blog): Guides and playbooks
- [RSS Feed](https://kyra.conversionsystem.com/feed.xml): Blog syndication feed
- [Changelog](https://kyra.conversionsystem.com/changelog): Product updates

## Industry Templates

Kyra has pre-built AI worker templates for 50+ industries:

${industryList}

## Blog Posts (Full Content)

${blogSection}

---

## Contact

- Email: angel@conversionsystem.com
- Website: https://conversionsystem.com
`;

  return new Response(content.trim(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
