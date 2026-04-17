# Kyra Content Voice Spec

**This file is the source of truth for every piece of content Kyra publishes.** Blog posts, LinkedIn posts, Facebook posts, X posts. Every scheduled routine reads this file before writing. If you change the rules here, the voice changes everywhere.

Last updated: 2026-04-17

---

## Strategic Frame

**We teach the ecosystem. We never pitch the product.** Kyra gets mentioned at the end of a post, or not at all, or just as "the platform we use." Our job is to be the smartest voice on OpenClaw, Claude Code, Claude Skills, Cowork, AI agents, MCP, self-hosted AI, multi-agent systems, and AI worker deployment. When people need to deploy this for clients, we are the name they already know.

**The audience:** agency owners, GHL resellers, technical founders, AI-curious operators. They know AI exists. They do not know how to actually deploy it for a business. Our content closes that gap.

**The Ryze model:** 80% education, 20% soft product reference. Ryze built authority by explaining Claude Skills, Claude connectors, and agentic marketing workflows — not by pitching Ryze. We do the same for the OpenClaw ecosystem.

---

## The Seven Content Pillars

Every post maps to one pillar. Weekly rotation: Week 1 = Pillar 1, Week 2 = Pillar 2, and so on. After Pillar 7 the cycle restarts with fresh angles.

| # | Pillar | One-Line |
|---|---|---|
| 1 | What OpenClaw Actually Is | Explain the technology — gateway, daemon, self-hosted, MIT. |
| 2 | Skills, Tools, and Agent Capabilities | What agents can actually do — 60+ tools, skills, MCP. |
| 3 | Multi-Channel AI Deployment | One gateway, 24+ channels — WhatsApp, Slack, SMS, web. |
| 4 | Self-Hosted vs Cloud AI | Data sovereignty, cost, control, regulated industries. |
| 5 | Agent Architecture Patterns | Memory, sessions, workspaces, sub-agents, compaction. |
| 6 | Automation with Hooks, Cron, and Tasks | Event-driven AI, scheduled runs, durable flows. |
| 7 | Deploying AI Workers | Practical step-by-step — from install to first client. |

---

## Voice Rules (non-negotiable)

1. **Teach, do not sell.** Every post answers a real question a reader has.
2. **Short lines.** Max 10 words per line on social. Max 22 words per sentence on blog.
3. **One idea per line.** Break between ideas. No run-on paragraphs.
4. **Numbers over adjectives.** "24 channels" beats "many channels." "2,660 words" beats "comprehensive."
5. **Verbs first in lists.** "Pulls data, suggests fixes" — not "It is a tool that pulls data."
6. **No corporate words.** Banned: leverage, synergize, revolutionary, game-changer, seamless, robust, solutions, cutting-edge.
7. **No em-dashes in social posts.** Use a period or a line break. (Em-dashes are fine in blog prose.)
8. **No "I'm excited to announce."** No announcement energy. Just the thing.
9. **Kyra is invisible until the CTA.** Mention once, at the end, and only if it genuinely fits.
10. **Specific > vague, always.** "Books appointments at 2am" beats "improves customer service."

---

## Platform-Specific Format

### LinkedIn (daily)
- **Length:** 150–300 words
- **Structure:**
  1. Bold hook (1 line, punchy claim)
  2. Subhook with 👇 emoji
  3. 2–3 lines of context or credibility
  4. Numbered list — each item = feature name + one-line outcome
  5. Time-compression proof line ("2 hours → 5 minutes") when applicable
  6. "No X, no Y" simplicity close
  7. CTA: `Comment "[Keyword]" and I'll send the [thing]`
- **Formatting:** Every sentence on its own line. Single-line spacing inside the post.

### Facebook (daily)
- **Length:** 100–200 words
- **Structure:** More conversational than LinkedIn. Starts with a question or observation.
- **Tone:** Less polished, more casual. Can ask the reader directly ("Anyone else seeing this?").
- **CTA:** Same comment-gated format as LinkedIn.

### X / Twitter (daily)
- **Length:** Main tweet 260 chars max, leave room for hook
- **Structure:** Hook + thread (4–8 tweets) OR single tweet with high density
- **Thread format:** Number each tweet (1/ 2/ 3/), save the CTA for the last tweet
- **Formatting:** No emoji clusters. One emoji max per tweet. No hashtag spam — 0–2 hashtags total.

### Blog (daily, auto-PR)
- **Length:** 2,000 words minimum. Target 2,500–3,000.
- **Structure:**
  1. H1 via `title` field — keyword-rich, clear promise
  2. Intro (~200 words) — hook, problem, what the article delivers
  3. 6–9 H2 sections, each with a clear subhead
  4. At least one **step-by-step setup guide** with real CLI commands when relevant
  5. FAQ section with 4–6 Q&As (helps GEO / AI citation)
  6. Honest "when this is not for you" section (builds trust)
  7. Soft Kyra mention at end + internal link to another Kyra blog post
- **Format:** HTML content, not markdown (stored as a string in `lib/blog/posts.ts`)
- **Tags:** `<h2>`, `<h3>`, `<p>`, `<ul>`, `<ol>`, `<li>`, `<strong>`, `<em>`, `<a>`, `<code>`, `<pre>`, `<blockquote>`, `<table>`, `<tr>`, `<th>`, `<td>`

---

## SEO / GEO Rules (blog only)

**SEO (traditional search):**
- Target a primary keyword in the H1, first paragraph, and one H2
- Include 3–5 semantic variants throughout the post
- Every post must have at least 3 internal links to other Kyra pages
- Every post must have at least 2 external authority links (OpenClaw GitHub, Anthropic, MDN, official docs)
- Meta description: 140–260 characters, answer the promise in the title
- URL slug: keyword-rich, hyphen-separated, under 60 characters

**GEO (AI citation surfacing — Perplexity, Gemini, ChatGPT web):**
- First paragraph must contain a clean definitional sentence: "X is Y that does Z."
- Include a structured FAQ section with Q&As — AI engines cite these directly
- Use specific numbers and dates (AI engines prefer specific over vague claims)
- Include at least one comparison table or structured list (easy for AI to extract)
- Use clear H2/H3 hierarchy — no skipping levels
- Write in declarative sentences, not marketing copy
- Schema.org Article markup is auto-injected via `app/blog/[slug]/page.tsx` — no manual action needed

---

## Research Requirements

Every post — blog and social — goes through a **research pass** before writing:

1. **Web search** for current news on the pillar topic:
   - OpenClaw: releases, new channel integrations, security updates
   - Anthropic: Claude Code updates, new Skills announcements, API changes
   - Cowork: new plugins, integrations, community skills
   - Broader ecosystem: MCP spec updates, competing frameworks, agentic workflow trends

2. **Pull at least one real, verifiable stat or fact** to cite. Examples: "OpenClaw 0.14 added E2EE for Matrix rooms" or "Anthropic released Claude Skills in October 2025."

3. **Link to sources** — external links to docs.openclaw.ai, github.com/openclaw/openclaw, docs.anthropic.com, etc.

4. **Never fabricate numbers.** If you do not have a real stat, do not invent one. Say "most" or "many" or leave the claim out.

---

## Proofread Pass (every post, every platform)

Before the routine ships a draft, it self-reviews against this checklist:

- [ ] Primary pillar keyword appears in the first 100 words
- [ ] No banned corporate words (see list above)
- [ ] Every claim is factually accurate or clearly framed as opinion
- [ ] Numbered lists have verb-first items
- [ ] No em-dashes in social posts
- [ ] Kyra mentioned zero or one times, and only in the CTA zone
- [ ] CTA is comment-gated with a real lead magnet name (not "learn more")
- [ ] For blog: word count ≥ 2,000, internal links ≥ 3, external links ≥ 2, FAQ present
- [ ] For social: sentence lengths short, one idea per line, platform-specific format respected

---

## Lead Magnet Keywords (CTA targets)

The "Comment X" keyword at the end of every post gates a real lead magnet. Current magnet inventory (expand over time):

| Keyword | What you send |
|---|---|
| `OpenClaw` | The OpenClaw setup guide (PDF / blog link) |
| `Skills` | 5 Kyra skill templates (markdown files) |
| `Deploy` | Step-by-step deploy checklist for an agency client |
| `Templates` | 6 industry AI worker configs (dental, real estate, auto, etc.) |
| `Margin` | Agency pricing calculator (Google Sheet) |
| `GHL` | GHL + OpenClaw integration guide |
| `Worker` | Chatbot vs AI worker comparison doc |
| `Autopilot` | Automation setup checklist (hooks + cron + tasks) |
| `Architecture` | OpenClaw gateway architecture breakdown (PDF) |
| `Isolation` | Per-client container security doc |
| `Stack` | The 2026 AI agent deployment playbook |
| `Routing` | Multi-channel routing config cheat sheet |
| `Memory` | Workspace + SOUL.md setup guide |
| `Automation` | Cron + hooks + tasks examples (4 patterns) |
| `Selfhost` | Self-hosted hardening guide |
| `Multiagent` | Multi-agent routing config |
| `WhatsApp` | Exact WhatsApp AI worker setup files |

Routines should pick keywords that match the post pillar. Rotate keywords so the same one does not appear two weeks in a row per platform.

---

## Anti-Duplication Rule

Before writing, every routine checks the `content_calendar` table for the last 30 days of posts in the same `(pillar, platform)` combination. If a specific angle or keyword has already been covered, the routine picks a fresh angle within the same pillar.

There are many angles per pillar. Example for Pillar 1 (What OpenClaw Is):
- What it is (definitional)
- What it replaces
- The gateway architecture
- Why self-hosted
- OpenClaw vs X (compared to a competitor)
- The open source story
- A day-in-the-life of running OpenClaw
- Common misconceptions

Routines should never publish the same angle twice within a 30-day window per platform.

---

## When to Mention Kyra

Kyra is **invisible** throughout the educational content. It appears only:

1. **At the end of a blog post** — soft handoff: "If you want the OpenClaw architecture without the infrastructure work, Kyra deploys it for you."
2. **In the author byline/footer** (auto-added)
3. **Never** in LinkedIn/Facebook/X post bodies. The comment-gated DM is where the conversation starts — that is where Kyra enters.

**The test:** If you removed every mention of Kyra, would the post still be valuable? If yes, it is correctly structured. If it falls apart without Kyra, rewrite it.

---

## Governance

- This file lives in the repo so voice changes are tracked in git.
- Every routine reads this file at the start of every run — no stale copies.
- Breaking voice rules is a blocker. Proofread pass must flag and regenerate.
- Quarterly review: update pillar angles, banned words, and lead magnet inventory.
