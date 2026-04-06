/**
 * /llms.txt — Structured context for LLMs discovering this site.
 * See https://llmstxt.org for the spec.
 */

export const dynamic = 'force-static';

export function GET() {
  const content = `# Kyra

> AI Workforce Platform for Agencies

Kyra is a white-label AI workforce platform built for agencies. Agencies use it to deploy, manage, and monetize autonomous AI workers for their clients — without writing code, without managing infrastructure.

## What Kyra Does

- Deploys AI workers that answer calls, book appointments, qualify leads, and handle customer support 24/7
- Builds 15–25 page SEO-optimized websites per client in minutes
- Provides a CRM with pipeline management, lead scoring, and conversation tracking
- Offers web chat widgets, SMS, voice AI, and multi-channel communication
- White-labels everything so agencies can resell under their own brand

## Key Pages

- [Homepage](https://kyra.conversionsystem.com): Platform overview and signup
- [Pricing](https://kyra.conversionsystem.com/pricing): Plans from $99/mo (Lite) to $499/mo (Scale)
- [Solo](https://kyra.conversionsystem.com/solo): Free tier for individual business owners
- [AI For Industries](https://kyra.conversionsystem.com/ai-for): 50+ industry-specific AI worker templates
- [AI Workers](https://kyra.conversionsystem.com/workers): Browse pre-built AI worker types
- [AI Readiness Quiz](https://kyra.conversionsystem.com/tools/ai-readiness): Interactive assessment tool

## Plans

- **Lite** ($99/mo): 3 clients, AI website builder, AI workers, CRM, web chat
- **Pro** ($299/mo): 10 clients, priority support, advanced analytics
- **Scale** ($499/mo): 20 clients, white-label portals, dedicated infrastructure
- Free plan available — no credit card required

## Company

Built by [Conversion System](https://conversionsystem.com). Contact: angel@conversionsystem.com

## Technical

- Powered by OpenClaw autonomous agent framework
- Next.js frontend, Supabase backend, Vercel hosting
- API docs available at /api for authenticated users
`;

  return new Response(content.trim(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
