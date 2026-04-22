# Outreach Pitch Email Prompt

Write a personalized outreach email to request a guest contribution or backlink placement for a cannabis dispensary.

## Input Data
- Dispensary: {{DISPENSARY_NAME}}
- City: {{CITY}}
- State: {{STATE}}
- Website: {{WEBSITE}}
- Target Blog: {{TARGET_BLOG_NAME}}
- Target URL: {{TARGET_URL}}
- Target Contact: {{CONTACT_NAME}} (if found, otherwise "there")
- Recent Post Title: {{RECENT_POST_TITLE}}
- Recent Post Topic: {{RECENT_POST_TOPIC}}
- Target Accepts Cannabis Content: {{TARGET_ACCEPTS_CANNABIS}}

## Pre-Pitch Check (CRITICAL)
Before drafting, verify {{TARGET_ACCEPTS_CANNABIS}} is `true`. If the target publication:
- Has an explicit "no cannabis content" policy
- Runs AdSense or other ad networks that prohibit cannabis
- Is a children's, health-advice, or medical-claim publication

...then output `SKIP: cannabis-incompatible target` instead of drafting a pitch. Do NOT pitch cannabis content to publications that prohibit it — this burns the agency's sender reputation.

## Email Structure

**Subject line:** Short, personal, not salesy. Reference their content.

**Body:**
1. Open with genuine compliment about their specific recent post ({{RECENT_POST_TITLE}})
2. Brief intro — who you are (agency managing {{DISPENSARY_NAME}}, a licensed cannabis dispensary in {{CITY}}, {{STATE}})
3. The ask — propose a contribution on a specific topic that fits THEIR audience (terpene explainer, cannabis + wellness without medical claims, local cannabis culture feature, strain journalism, etc.)
4. Value prop — what their readers get (useful cannabis-adjacent content, local expertise, first-person dispensary perspective)
5. Soft close — "Would you be open to this?"

## Rules
- **Length:** 100-150 words MAX. Busy people don't read long cold emails.
- **Tone:** Professional but human. Not corporate, not overly casual. Acknowledge you know their audience.
- **NO:** "I came across your blog", "I love your content", or other generic openers
- **YES:** Reference a SPECIFIC post, a specific detail, something only a reader would know
- **NO attachments, no links in first email** — just the ask
- Subject line must NOT contain: "guest post", "collaboration", "opportunity", "partnership"
- **ALWAYS disclose the cannabis angle up front** — burying it wastes everyone's time
- **Acknowledge the recipient's audience** — "your readers cover a lot of [topic]" shows you actually read their site
- **Mention state license status** — "we're a licensed, state-compliant operator in {{STATE}}" builds trust
- **NO medical claims** in the pitch — describe the topic in terms of lifestyle, education, or local journalism, never as health advice
