export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readMins: number;
  category: string;
  emoji: string;
  content: string; // Markdown-like HTML
}

export const POSTS: BlogPost[] = [
  {
    slug: 'ghl-ai-employee-agency',
    title: 'How to Add an AI worker to Every GHL Client (and Charge $1,000/mo for It)',
    description: 'GHL agencies are sitting on a goldmine. Here\'s how to turn your existing client base into a recurring AI revenue stream — without building anything from scratch.',
    date: '2026-02-22',
    readMins: 6,
    category: 'Agency Growth',
    emoji: '🚀',
    content: `
<p>Most GHL agencies have the same problem: you charge a setup fee, maybe a retainer, and then the relationship goes quiet. The client stops replying. Revenue stagnates.</p>

<p>There's a simple fix. And it's worth $1,000–$2,000/month per client.</p>

<h2>What is an AI worker?</h2>

<p>An AI worker is an autonomous AI agent that:</p>
<ul>
  <li>Responds to every inbound SMS in under 60 seconds — 24/7</li>
  <li>Books appointments by checking availability and confirming times</li>
  <li>Updates GHL CRM with tags and notes after every conversation</li>
  <li>Detects frustrated customers and escalates to your human team instantly</li>
  <li>Handles opt-outs, business hours, and multi-channel messages automatically</li>
</ul>

<p>It's not a chatbot. It's not a canned response bot. It's a real AI that understands context, remembers conversation history, and operates like a trained employee — except it never sleeps, never takes a vacation, and never calls in sick.</p>

<h2>Why GHL Agencies Are Perfectly Positioned</h2>

<p>You already have the infrastructure. GHL gives you the CRM, the pipelines, the phone numbers, and the messaging channels. An AI worker like Kyra plugs directly into your existing GHL setup using a Private Integration Token — no OAuth approval, no marketplace hurdles.</p>

<p>The moment your client adds their GHL token, the AI starts monitoring their conversations and responding automatically. Setup takes about 10 minutes. The AI goes live immediately.</p>

<h2>The Pricing Model That Works</h2>

<p>Most agencies bill their AI workers as a retainer:</p>

<ul>
  <li><strong>Local service businesses</strong> (dental, HVAC, fitness): $500–$1,000/month</li>
  <li><strong>High-ticket service businesses</strong> (real estate, law, med spa): $1,000–$3,000/month</li>
  <li><strong>Volume businesses</strong> (cannabis, auto, restaurant): $500–$2,000/month</li>
</ul>

<p>The pitch is simple: "Your AI worker responds to every lead in 60 seconds, books appointments, and updates your CRM — while you sleep. If it books one extra appointment per week, it's paid for itself."</p>

<p>For a dental practice at $150/cleaning, three extra bookings per week = $450/week = $1,800/month. You charge $800. They're ahead.</p>

<h2>How to Get Your First Client Live</h2>

<ol>
  <li><strong>Sign up for Kyra</strong> — free account at kyra.conversionsystem.com</li>
  <li><strong>Add the client</strong> — pick an industry template (dental, real estate, auto, etc.)</li>
  <li><strong>Connect GHL</strong> — add the client's Private Integration Token (from their GHL Settings → Integrations)</li>
  <li><strong>Customize the personality</strong> — or click "Generate with AI" to auto-write the AI's persona in seconds</li>
  <li><strong>Go live</strong> — the AI starts responding within 60 seconds</li>
</ol>

<p>The whole process takes under 10 minutes. The AI does the rest.</p>

<h2>Scaling to 10+ Clients</h2>

<p>Once you have your first AI worker live and your client sees results, scaling is straightforward. Every new client follows the same 5-step process. The AI personalities are different, the channels might vary, but the infrastructure is the same.</p>

<p>At 10 clients charging $800/month each: $8,000/month in recurring revenue. At 20 clients: $16,000/month. Kyra Pro handles 10 clients at $299/month — your gross margin is 96% before API costs.</p>

<h2>The Competitive Moat</h2>

<p>Once your client's AI worker is live and working, they won't want to turn it off. The AI builds up conversation history, learns the business's tone, and becomes genuinely useful over time. Churn on a working AI worker is near zero.</p>

<p>Every booking it makes, every lead it handles, every CRM update it logs — that's value your client can see. It's not abstract "automation." It's results they can count.</p>

<p>Ready to add your first AI worker? <a href="/try/dental">Try a live demo</a> or <a href="/signup/agency">start your free account</a>.</p>
`,
  },
  {
    slug: 'ai-for-dental-practices',
    title: 'AI for Dental Practices: How It Works, What It Does, and What to Expect',
    description: 'Dental practices lose thousands in missed appointments and unanswered after-hours inquiries every month. AI workers change that — here\'s exactly how.',
    date: '2026-02-22',
    readMins: 5,
    category: 'Industry Guide',
    emoji: '🦷',
    content: `
<p>Dental practices have a lead problem that most dentists don't realize: their phones go unanswered.</p>

<p>A patient texts at 7pm asking about a cleaning. The office is closed. By morning, they've booked with another practice. That's $150 lost on a cleaning — potentially $2,000+ if they become a regular patient.</p>

<p>An AI worker fixes this problem permanently.</p>

<h2>What the Dental AI Worker Does</h2>

<p>When a patient texts your practice's GHL number, the AI responds within 60 seconds — day or night. It:</p>

<ul>
  <li>Answers questions about pricing, services, and insurance</li>
  <li>Books appointments by offering available time slots</li>
  <li>Handles insurance questions ("Do you take Delta Dental?" — yes, with most major plans)</li>
  <li>Sends appointment confirmations and preparation instructions</li>
  <li>Follows up with no-shows</li>
  <li>Tags the contact in GHL (new patient, appointment requested, insurance verified, etc.)</li>
</ul>

<p>It does all of this automatically, without staff involvement, 24 hours a day.</p>

<h2>A Real Example</h2>

<p>Here's an actual conversation a dental AI worker handles:</p>

<blockquote>
<p><strong>Patient:</strong> Hi, I need a cleaning. How much does it cost?</p>
<p><strong>Kyra AI:</strong> Hi! 😊 A routine cleaning is $150, or fully covered with most insurance. We're accepting new patients — want to book?</p>
<p><strong>Patient:</strong> Yes! Do you have anything this week?</p>
<p><strong>Kyra AI:</strong> Tuesday at 2pm or Thursday at 10am. Which works? And which insurance do you have?</p>
<p><strong>Patient:</strong> Tuesday works. I have Delta Dental.</p>
<p><strong>Kyra AI:</strong> ✅ Reserved! Tuesday 2pm, Smile Dental. With Delta Dental you're fully covered. Confirmation text coming tomorrow morning!</p>
</blockquote>

<p>This conversation happened at 9:30pm. Without the AI, that patient sends a text to a closed practice and books elsewhere in the morning. With the AI, they're booked before they go to sleep.</p>

<h2>What About HIPAA?</h2>

<p>The AI doesn't access or store patient medical records. It handles scheduling and basic inquiries — the same type of communication a front desk receptionist would have via text. However, your practice should review AI communications with your compliance officer to ensure alignment with your specific policies.</p>

<h2>Integration With GoHighLevel</h2>

<p>If your practice uses GoHighLevel (or you're a marketing agency that manages their GHL account), the AI worker integrates directly. It:</p>

<ul>
  <li>Reads and responds to GHL SMS conversations</li>
  <li>Tags contacts automatically (new-patient, appointment-scheduled, insurance-verified)</li>
  <li>Moves contacts through your pipeline stages</li>
  <li>Writes notes after every conversation</li>
  <li>Escalates urgent situations immediately</li>
</ul>

<h2>What to Expect in the First Week</h2>

<p>Most dental practices see results within 48 hours of going live. The AI starts catching inquiries that would have otherwise gone unanswered. Typical outcomes in the first 30 days:</p>

<ul>
  <li>3–8 new patient appointments booked from after-hours inquiries</li>
  <li>Significant reduction in "quick question" calls during business hours</li>
  <li>100% response rate on new patient inquiries</li>
</ul>

<p>Ready to see it in action? <a href="/try/dental">Try the live dental AI demo</a> — type anything a patient would say.</p>
`,
  },
  {
    slug: 'agency-recurring-revenue-ai',
    title: 'How Agencies Add $10,000/Month in Recurring Revenue with AI Workers',
    description: 'The math is simple: 10 clients × $1,000/month = $10K MRR at ~97% gross margin. Here\'s the exact playbook to get there in 90 days.',
    date: '2026-02-22',
    readMins: 7,
    category: 'Agency Growth',
    emoji: '💰',
    content: `
<p>Most digital marketing agencies have a ceiling problem. You can only take on so many clients. Every new client means more work, more management, more headaches. Revenue grows linearly. Costs grow almost as fast.</p>

<p>AI workers break this model. Here's why: the marginal cost of adding a 15th AI worker is almost zero. You configure a personality, connect GHL, and the AI does the rest. The infrastructure scales automatically. You don't hire more staff. You don't increase overhead.</p>

<p>That's the opportunity.</p>

<h2>The Math</h2>

<p>Let's run the numbers on a basic agency AI operation:</p>

<ul>
  <li><strong>Platform cost:</strong> $299/month (Kyra Pro, up to 10 AI workers)</li>
  <li><strong>API cost:</strong> ~$1–3/client/month at moderate conversation volume</li>
  <li><strong>Your price to clients:</strong> $800–$1,500/month per AI worker</li>
  <li><strong>10 clients at $1,000/month:</strong> $10,000 MRR</li>
  <li><strong>Your costs:</strong> ~$290/month (platform + API)</li>
  <li><strong>Gross margin:</strong> ~97%</li>
</ul>

<p>At 10 clients — Kyra Pro capacity — you're at $10,000/month with essentially no marginal cost increase.</p>

<h2>The 90-Day Playbook</h2>

<h3>Days 1–14: Foundation</h3>

<ol>
  <li>Sign up for Kyra at kyra.conversionsystem.com</li>
  <li>Set up a demo AI worker in your own agency's name (dental or real estate work great)</li>
  <li>Get comfortable with the dashboard: adding clients, customizing personalities, viewing conversations</li>
  <li>Use the Pitch Generator to create shareable demo links for 3 industries you know well</li>
</ol>

<h3>Days 15–30: First Client</h3>

<ol>
  <li>Pick your easiest existing client — probably someone you talk to regularly who trusts you</li>
  <li>Show them a live demo using their industry's pitch page</li>
  <li>Offer a 30-day trial at $0 (or a reduced rate) to prove the value</li>
  <li>Get them live on Kyra, connect their GHL, customize their personality</li>
  <li>Let the AI run for 2 weeks and review the results together</li>
</ol>

<h3>Days 31–60: Three Paying Clients</h3>

<p>With one live success story, the sell becomes much easier. Now you have a real example: "My client John at ABC Dental had 5 appointments booked by the AI in the first week." That's all you need.</p>

<p>Use the pitch pages and the live demo to show prospects. The demo does the heavy lifting — most people are convinced after 3 minutes of watching the AI respond.</p>

<h3>Days 61–90: Scale to $10K MRR</h3>

<p>By day 60, you should have 3–5 paying clients. The system is running itself. Now you systematize:</p>

<ul>
  <li>Use the Business in a Box templates for cold emails and LinkedIn outreach</li>
  <li>Set up the referral program — give existing clients a free month for every referral that converts</li>
  <li>Expand within existing clients: if you have a dental practice, ask if they have partner practices</li>
</ul>

<h2>Who to Target First</h2>

<p>The best first prospects are businesses that:</p>

<ul>
  <li>Receive high volumes of repetitive text inquiries (pricing, hours, availability)</li>
  <li>Have staff time wasted on simple Q&A</li>
  <li>Miss leads after hours</li>
  <li>Are already in GHL (or you can get them there)</li>
</ul>

<p>Best industries for fast results: dental, real estate, auto dealerships, cannabis dispensaries, restaurants, med spas, and fitness studios.</p>

<h2>The Retention Play</h2>

<p>Here's the best part: AI worker churn is nearly zero. Once it's live and working, clients don't want to turn it off. The AI builds up institutional knowledge — it knows the business's tone, the common questions, the pipeline stages. Replacing it means starting over.</p>

<p>Compare this to typical agency services where clients churn after 3–6 months. An AI worker that books appointments and handles leads creates ongoing, measurable value that compounds over time.</p>

<p>Ready to start? <a href="/signup/agency">Create your free agency account</a> — no credit card required.</p>
`,
  },
  {
    slug: 'ghl-ai-employee-complete-guide',
    title: 'GoHighLevel AI Worker: The Complete Guide for GHL Agencies (2026)',
    description: 'Everything GHL agencies need to know about adding a real AI worker to every sub-account — not automations, not a chatbot. A real AI that talks, thinks, and books appointments.',
    date: '2026-02-23',
    readMins: 8,
    category: 'GHL Integration',
    emoji: '⚡',
    content: `
<p>If you're running a GoHighLevel agency, you've already heard the buzzword: "AI." GHL has started integrating AI features, and every agency is trying to figure out what to do with them. But most GHL agencies are doing AI wrong — and leaving serious money on the table.</p>

<p>This guide explains how to add a <strong>real AI worker</strong> to every GHL sub-account — not a workflow automation, not a keyword chatbot, but a conversational AI that responds to every inbound SMS within 60 seconds, 24/7.</p>

<h2>The Difference Between GHL Automations and a Real AI Worker</h2>

<p>GHL automations are powerful. You can trigger SMS sequences, send follow-ups, move contacts through pipelines — all automatically. But automations are <em>scripts</em>. They match conditions and fire responses. They can't handle:</p>

<ul>
<li>Questions they weren't explicitly programmed for</li>
<li>Natural conversation flow that goes off-script</li>
<li>Emotional or frustrated customers who need nuance</li>
<li>Open-ended questions like "what do you recommend?"</li>
</ul>

<p>A real AI worker — like Kyra — uses a large language model to <em>understand</em> what the customer is asking, then compose a contextually appropriate response. It reads the CRM, knows the contact's history, and replies like a trained team member would.</p>

<h2>How Kyra Connects to GHL</h2>

<p>Kyra connects to any GHL sub-account using a <strong>Private Integration Token</strong> — no marketplace approval, no waiting, no OAuth setup. You create the token inside the sub-account settings in about 2 minutes.</p>

<p>Once connected, Kyra:</p>
<ul>
<li>Polls the GHL inbox for new inbound messages every 60 seconds</li>
<li>Reads the contact's tags, pipeline stage, and recent notes for context</li>
<li>Composes and sends a reply via the GHL conversations API</li>
<li>Auto-updates the CRM: tags, pipeline stage, and notes after every conversation</li>
<li>Escalates frustrated customers to your team via Slack/email webhook</li>
</ul>

<p>This works across all 7 GHL channels: SMS, WhatsApp, Instagram, Facebook, Live Chat, Email, and Google My Business.</p>

<h2>What GHL Channel Does Kyra Cover?</h2>

<p>Kyra uses GHL's unified conversations API, which means the AI sees messages from all channels in one inbox. The response goes back through whichever channel the customer used. Here's the channel map:</p>

<table>
<tr><th>GHL Channel</th><th>Kyra Support</th></tr>
<tr><td>SMS</td><td>✅ Full support</td></tr>
<tr><td>WhatsApp</td><td>✅ Full support</td></tr>
<tr><td>Instagram DM</td><td>✅ Full support</td></tr>
<tr><td>Facebook Messenger</td><td>✅ Full support</td></tr>
<tr><td>Live Chat</td><td>✅ Full support</td></tr>
<tr><td>Email</td><td>✅ Full support</td></tr>
<tr><td>Google My Business</td><td>✅ Full support</td></tr>
</table>

<h2>Setting Up a GHL AI Worker in 10 Minutes</h2>

<p>Here's the exact process:</p>

<ol>
<li><strong>Create your Kyra agency account</strong> at <a href="/signup/agency">kyra.conversionsystem.com/signup/agency</a> (free, no credit card)</li>
<li><strong>Add a client</strong> — pick the industry (dental, real estate, auto, etc.) and the AI personality is pre-built</li>
<li><strong>Customize the personality</strong> — add the business name, AI name, pricing, FAQs, booking link</li>
<li><strong>Generate the GHL Private Integration Token</strong> — in the sub-account: Settings → Integrations → Private Integration Tokens → Create</li>
<li><strong>Paste the token</strong> into Kyra — the AI goes live instantly</li>
</ol>

<p>From that point, every inbound message to that GHL sub-account will be handled by the AI within 60 seconds.</p>

<h2>How Much Should You Charge?</h2>

<p>Most GHL agencies are charging $500–$2,000/month per AI worker. The pricing depends on your client's industry and volume:</p>

<ul>
<li><strong>Dental/Med Spa:</strong> $750–$1,500/mo (high ticket, high volume, high impact)</li>
<li><strong>Real Estate:</strong> $1,000–$2,000/mo (high lead value)</li>
<li><strong>Auto Dealership:</strong> $1,000–$1,500/mo (high-volume, high-value leads)</li>
<li><strong>Cannabis Dispensary:</strong> $500–$1,000/mo (compliance requirements = premium pricing)</li>
<li><strong>Restaurant:</strong> $300–$600/mo (lower AOV but steady volume)</li>
</ul>

<p>Your cost to Kyra: $99/month for up to 5 clients. That's gross margin of $2,400–$9,900/month on the Starter plan alone.</p>

<h2>The Proactive Outreach Feature</h2>

<p>One underrated feature: Kyra watches for <em>new contacts</em> in GHL and proactively reaches out — even without an inbound message. Within ~60 seconds of a new lead being created, the AI sends a personalized greeting via SMS.</p>

<p>This is the equivalent of your best salesperson immediately calling every new lead the moment they come in. For most clients, this alone recovers 20–30% of leads that would have gone cold.</p>

<h2>CRM Automation That Happens Automatically</h2>

<p>Every AI conversation updates the GHL CRM automatically. After each reply, Kyra:</p>
<ul>
<li>Adds a CRM note summarizing the conversation</li>
<li>Tags the contact based on what they asked (e.g., "appointment-interest", "price-question")</li>
<li>Moves them to the appropriate pipeline stage (e.g., "AI Qualified" → "Ready to Book")</li>
</ul>

<p>This means your clients get a cleaner CRM and better pipeline visibility — without any manual data entry.</p>

<h2>Common Questions from GHL Agencies</h2>

<p><strong>Does Kyra replace GHL automations?</strong> No — they complement each other. GHL automations handle rule-based sequences (appointment reminders, review requests, etc.). Kyra handles conversational replies that require understanding.</p>

<p><strong>What if a client already has GHL workflows set up?</strong> Kyra only responds to inbound messages — it doesn't interfere with your outbound automations. They work in parallel.</p>

<p><strong>Can I white-label this?</strong> Yes. The AI personality is fully configurable — you name it, set its personality, and it represents the client's business. There's no "Kyra" branding in client-facing messages.</p>

<p>Ready to add AI workers to your GHL agency? <a href="/signup/agency">Create your free account</a> and have your first AI live in 10 minutes.</p>
`,
  },
  {
    slug: 'what-is-openclaw-ai-gateway-explained',
    title: 'What Is OpenClaw? The Open-Source AI Gateway That Connects Every Messaging App to Your AI Agent',
    description: 'OpenClaw is the self-hosted AI gateway most people still haven\'t heard of. One daemon connects WhatsApp, Telegram, Slack, Discord, Signal, iMessage and 18 more channels to a single AI agent. Here\'s what it does, how it works, and how to set it up in 10 minutes.',
    date: '2026-04-16',
    readMins: 12,
    category: 'AI Infrastructure',
    emoji: '🦞',
    content: `
<p>Most of the AI chat tools on the market today are closed black boxes. You sign up, you hand over your data, you pay per seat, and you pray the vendor doesn't change their pricing next quarter. Your conversations sit on someone else's server. Your customers get answers from the same shared infrastructure as everyone else. If the service goes down, your business goes down with it.</p>

<p>There is a different path. It is called <strong>OpenClaw</strong>, and it is quietly becoming the backbone of serious AI deployments in 2026. This guide explains what OpenClaw actually is, what problem it solves, how the architecture works, and exactly how to set it up — even if you have never run a server before.</p>

<p>By the end of this article, you will understand why agencies, solo operators, and regulated businesses are moving off shared chatbot platforms onto self-hosted AI gateways — and why OpenClaw is the one they are choosing.</p>

<h2>What Is OpenClaw? The One-Sentence Definition</h2>

<p><strong>OpenClaw is an open-source, self-hosted AI gateway that runs as a single daemon on your machine or server and connects your messaging apps — WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Microsoft Teams, Matrix, and more — to an AI agent that you fully control.</strong></p>

<p>That definition packs a lot in, so let us unpack it.</p>

<p><strong>Open-source:</strong> MIT licensed. The code is on GitHub at <code>github.com/openclaw/openclaw</code>. You can read every line. You can fork it. You can contribute. There is no vendor to go out of business and take your bot with them.</p>

<p><strong>Self-hosted:</strong> OpenClaw runs on your hardware. Your laptop, a Mac Mini in a closet, a Raspberry Pi, a cheap VPS, a dedicated server, a Docker container — wherever you want. Your data lives in <code>~/.openclaw/</code> on your disk. Nothing is sent to a cloud service unless you explicitly configure it.</p>

<p><strong>AI gateway:</strong> This is the important word. A gateway is not a chatbot. It is not a workflow automation tool. It is a bridge — a single process that sits between your messaging channels on one side and an AI model on the other, routing messages, managing sessions, invoking tools, and keeping state.</p>

<p><strong>Single daemon:</strong> One background process. One port. One config file. You do not have to stitch together seven different services, manage a Kubernetes cluster, or learn four new languages. You install Node, run one command, and it is live.</p>

<h2>What OpenClaw Replaces</h2>

<p>OpenClaw is the most interesting when you look at what it makes obsolete. Four categories of tools disappear the moment you deploy it.</p>

<h3>1. Zapier-Style Automation for AI</h3>

<p>Most businesses glue AI into their stack with Zapier, Make, or n8n. It works — barely — until you hit a rate limit, a per-task fee, or a broken trigger at 2am. OpenClaw has built-in cron jobs, event hooks, background tasks, and multi-step task flows. They run inside the gateway, tied to your agent, with no per-task billing and no external scheduler to fail.</p>

<h3>2. Shared Chatbot Platforms</h3>

<p>If you are using a SaaS chatbot tool, your client's conversations are likely sitting on a shared server with thousands of other businesses. Their data, their prompts, their patient intake forms — mixed with a random e-commerce store in another industry. For regulated businesses (dental, legal, medical, financial), this is not a feature. It is a liability. OpenClaw runs on your machine. Every client can have their own isolated container with their own data, their own personality, and their own knowledge base.</p>

<h3>3. Custom-Built Bots for Every Channel</h3>

<p>If you have ever tried to ship a WhatsApp bot, a Telegram bot, a Slack bot, and a Discord bot as separate projects, you know the pain. Four codebases. Four auth flows. Four message formats. Four deploy pipelines. OpenClaw collapses this into one process. You write the agent once. It speaks every channel. When a message comes in on Telegram, the reply goes to Telegram. When it comes in on Slack, the reply goes to Slack. The routing is deterministic and configurable.</p>

<h3>4. Prompt Chains That Break</h3>

<p>Handcrafted prompt chains are brittle. One new product update, one odd customer question, one edge case — and the whole chain falls apart. OpenClaw agents use persistent sessions, structured memory, built-in tool use, and automatic context compaction. The agent remembers what it learned yesterday. It can search the web. It can read files. It can write to a CRM. It does not forget your customer after every message.</p>

<h2>24+ Channels, One Gateway</h2>

<p>OpenClaw ships with first-party integrations for the channels real businesses use every day. Here is the list as of 2026.</p>

<p><strong>Built-in channels:</strong> WhatsApp (via Baileys with QR pairing), Telegram (via bot token — the fastest setup), Discord (with guild routing, threads, and slash commands), Slack (via the Bolt SDK in socket mode or HTTP webhooks), Signal (via signal-cli bridge), iMessage (via Mac or BlueBubbles), Google Chat, IRC, and WebChat (an embeddable widget for any website).</p>

<p><strong>Bundled plugin channels:</strong> Matrix (with end-to-end encryption support), Microsoft Teams (with full Graph API integration), Feishu, LINE, Mattermost, Nextcloud Talk, Nostr, QQ Bot, Synology Chat, Tlon, Twitch, Zalo, and Zalo Personal.</p>

<p>That is more than twenty-four channels. Every one of them runs from the same gateway. You add a channel by editing a config file or running a CLI command. You do not write a new bot for each one.</p>

<p>And the replies route intelligently. If a customer messages your WhatsApp number, the reply goes to WhatsApp. If a teammate pings your agent in a Slack thread, the reply goes into that thread. Session state is isolated per channel, per group, per user — so conversations never cross-contaminate.</p>

<h2>The Core Architecture in Plain English</h2>

<p>You do not need to be a systems engineer to use OpenClaw, but it helps to understand the moving parts. Here is the picture.</p>

<p><strong>The Gateway:</strong> a single long-lived daemon. It opens one port (default <code>18789</code>, loopback only by default) and listens for WebSocket connections from channels, clients, and nodes. It is the single source of truth for sessions, routing, and channel connections.</p>

<p><strong>The Agent Runtime:</strong> embedded inside the gateway. When a message arrives, the gateway hands it to the agent runtime, which assembles a context, calls the language model, invokes tools if needed, streams the response back, and persists the conversation transcript.</p>

<p><strong>The Workspace:</strong> a directory on your disk (default <code>~/.openclaw/workspace</code>). Inside it, a handful of markdown files define how your agent behaves. <code>SOUL.md</code> is the personality file — tone, voice, boundaries. <code>AGENTS.md</code> is operating rules and memory. <code>USER.md</code> is who you are. <code>TOOLS.md</code> is your notes on how to use specific tools. These files inject into the agent's context at the start of every new session.</p>

<p><strong>Sessions:</strong> every conversation is a session, stored as a JSONL file. Sessions reset on a schedule (default 4am local) or when they go idle. Old tool results are pruned in memory to save tokens. When context fills up, older messages are summarized into a single compact entry — a process called compaction — so the conversation can continue indefinitely.</p>

<p><strong>Tools:</strong> the agent has more than sixty built-in tools. It can execute shell commands. It can read and write files. It can search the web through ten different providers. It can drive a Chromium browser. It can send messages across channels. It can generate images, audio, and video. It can spawn sub-agents for complex tasks. You control which tools it can use through simple allow and deny lists.</p>

<p><strong>Skills:</strong> reusable markdown instruction files that teach the agent specific workflows. Write a skill once — "generate a weekly client report" — and the agent will follow those steps forever. Skills load from six locations with clear precedence, so you can ship skills per-workspace, per-user, or bundled with the install.</p>

<h2>How to Set Up OpenClaw in 10 Minutes</h2>

<p>This is the part everyone wants. Here is the exact, step-by-step installation for a typical developer or power user. Total time, start to first message: under ten minutes.</p>

<h3>Step 1. Check Your Node Version</h3>

<p>OpenClaw recommends Node 24, but it works on Node 22.14 or later for compatibility. Check what you have:</p>

<pre><code>node --version</code></pre>

<p>If you do not have Node, install it from <code>nodejs.org</code> or via a version manager like <code>nvm</code>. This is the only real dependency.</p>

<h3>Step 2. Install OpenClaw Globally</h3>

<pre><code>npm install -g openclaw@latest</code></pre>

<p>This puts the <code>openclaw</code> CLI on your path. Takes about thirty seconds on a reasonable internet connection.</p>

<h3>Step 3. Run the Onboarding Wizard</h3>

<pre><code>openclaw onboard --install-daemon</code></pre>

<p>The wizard walks you through three things. First, it asks for an API key from a model provider. Claude from Anthropic is the default recommendation, but OpenClaw supports more than fifty providers including OpenAI, Google Gemini, Mistral, Groq, DeepSeek, OpenRouter, and local models via Ollama. Pick whichever you have credentials for.</p>

<p>Second, it creates your workspace at <code>~/.openclaw/workspace</code> and seeds it with template files. Third, it installs the daemon as a service so it starts automatically when your computer boots. On macOS this is launchd. On Linux it is systemd. On Windows it is a Scheduled Task.</p>

<h3>Step 4. Customize Your Agent's Personality</h3>

<p>Open <code>~/.openclaw/workspace/SOUL.md</code> in any text editor. Replace the default content with who you want your agent to be. For example:</p>

<pre><code>You are a professional customer service assistant for a dental
practice. You are warm, clear, and patient. You answer questions
about scheduling, insurance, and services. You never speculate
about medical conditions. If a patient sounds distressed, you
offer to connect them with a human immediately.

You respond in short sentences. You avoid jargon. You confirm
every appointment time and date twice before booking.</code></pre>

<p>Save the file. The next conversation your agent has will use this personality.</p>

<h3>Step 5. Add Your First Channel</h3>

<p>Telegram is the fastest channel to set up because it only requires a bot token. Create a bot by messaging <code>@BotFather</code> on Telegram and following the prompts. Copy the token it gives you.</p>

<p>Open <code>~/.openclaw/openclaw.json</code> and add:</p>

<pre><code>{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "YOUR_TOKEN_HERE",
      "allowFrom": ["your_telegram_username"]
    }
  }
}</code></pre>

<p>The <code>allowFrom</code> list is your first line of defense. Only listed users can message your agent. Remove it later once you have pairing or broader access policies configured.</p>

<h3>Step 6. Restart and Message Your Agent</h3>

<pre><code>openclaw gateway restart</code></pre>

<p>Open Telegram. Find your bot. Say hello. You should get a reply within a couple of seconds, in the voice you defined in <code>SOUL.md</code>, coming from your own hardware, using your own API key.</p>

<p>That is a working AI gateway. From here you can add more channels, more tools, more skills, and more agents. The gateway is already doing the heavy lifting.</p>

<h3>Step 7. Open the Dashboard</h3>

<pre><code>openclaw dashboard</code></pre>

<p>This opens the Control UI at <code>http://127.0.0.1:18789/</code>. It is a browser dashboard for managing sessions, inspecting logs, configuring channels, and chatting with your agent directly. For most power users this becomes the main interface alongside the CLI.</p>

<h2>Common Questions About OpenClaw</h2>

<h3>Is OpenClaw really free?</h3>

<p>Yes. The code is MIT licensed. There is no subscription, no per-message fee, no paid tier. The only thing you pay for is the AI model you connect it to — and you bring your own API key. If you use a local model through Ollama, even that cost disappears.</p>

<h3>What does it run on?</h3>

<p>Any machine that can run Node.js. Many users run it on a Mac Mini, an old laptop, or a cheap virtual server. Memory footprint is modest. The gateway itself is lightweight; the heavy lifting is the model call, which happens on the provider's infrastructure or your local GPU.</p>

<h3>Is it secure?</h3>

<p>The gateway binds to loopback by default, meaning only your local machine can talk to it. For remote access, the recommended pattern is Tailscale or an SSH tunnel rather than public ingress. Every channel connection uses pairing — a challenge-signed device identity that must be explicitly approved on first connect. Non-local connections still require explicit approval. The full security model uses MITRE ATLAS terminology and is documented in the project's threat model.</p>

<h3>Can I run multiple agents on one gateway?</h3>

<p>Yes. Multi-agent routing is a first-class feature. Each agent gets its own workspace, its own sessions, its own skills, and its own routing bindings. You can point different channels at different agents, or split one channel by guild, role, or peer. One gateway can host a support agent, a sales agent, and a personal assistant at the same time without any cross-contamination.</p>

<h3>What about enterprise deployments?</h3>

<p>OpenClaw includes a delegate architecture for agents that act on behalf of organizational principals. It supports three capability tiers — read-only, send-on-behalf, and autonomous — each with hardening requirements including tool allow and deny lists, sandbox isolation, and audit trails. It integrates with Microsoft 365 and Google Workspace with minimum-privilege delegation scopes.</p>

<h3>How does it handle memory?</h3>

<p>Session transcripts live on your disk as JSONL. Daily memory summaries can be written to markdown files in the workspace. An optional active memory sub-agent surfaces relevant memories before each reply. Compaction automatically summarizes older turns when context fills up. Prompt cache pruning reduces token cost without losing context. All of this works out of the box.</p>

<h2>When OpenClaw Makes Sense, and When It Does Not</h2>

<p>Self-hosted AI is not the right choice for every situation. Here is the honest take.</p>

<p><strong>OpenClaw makes sense if:</strong></p>

<ul>
<li>You care about data sovereignty — regulated industries, sensitive intake forms, confidential business workflows</li>
<li>You want multi-channel AI without writing four separate bots</li>
<li>You have more than a handful of clients or teams and need isolation between them</li>
<li>You want predictable costs — pay for the model tokens you use, not per-seat licensing</li>
<li>You want to build skills and automation your agent runs repeatedly</li>
<li>You are comfortable editing a config file or running a CLI command</li>
</ul>

<p><strong>OpenClaw might be overkill if:</strong></p>

<ul>
<li>You only need a basic chatbot on a single channel and have never managed a server</li>
<li>You do not have any API keys and do not want to get any</li>
<li>You want a zero-setup, click-and-deploy experience with no configuration</li>
</ul>

<p>For that second group, there is an easier path.</p>

<h2>The Easier Path: Deploy OpenClaw Without Managing Infrastructure</h2>

<p>OpenClaw is powerful. It is also, for most agency owners and non-technical operators, more setup than they want to do for every client. Installing Node, editing config files, managing daemons, paying for a VPS, renewing TLS certificates — it adds up.</p>

<p>That is the problem <a href="https://kyra.conversionsystem.com">Kyra</a> solves. Kyra is a white-label platform built on OpenClaw technology. Agencies use it to deploy isolated AI workers for every one of their clients without writing code or managing infrastructure. Each client gets their own OpenClaw container with their own personality, knowledge base, and workspace — and the agency manages everything from a single dashboard.</p>

<p>You get the architecture of OpenClaw — isolation, multi-channel, memory, skills, tools — wrapped in an onboarding flow that takes minutes instead of hours, plus billing, CRM, and the industry-specific templates that turn a technology into a business.</p>

<p>The underlying technology is the same. The deployment experience is built for scale.</p>

<h2>Start Here</h2>

<p>If you are technical and curious, install OpenClaw. It is free, it is open source, and ten minutes of your time gets you an agent that runs on your hardware and speaks through every channel you use.</p>

<p>If you are an agency owner or business operator who wants the OpenClaw architecture without the infrastructure work, <a href="/solo">start with Kyra Solo</a>. It is free to try, no credit card required, and your first AI worker goes live in under two minutes.</p>

<p>Either way, the era of shared chatbot platforms is ending. The era of self-hosted, agent-native, multi-channel AI is beginning. The tools are open source, the architecture is proven, and the setup is fast. The only question is whether you want to run it yourself or let a platform run it for you.</p>

<p>Want to read more? See our guide on <a href="/blog/white-label-ai-platform-agencies">building a white-label AI business</a> or the <a href="/blog/ghl-ai-employee-complete-guide">GoHighLevel AI worker setup guide</a>.</p>
`,
  },
  {
    slug: 'white-label-ai-platform-agencies',
    title: 'White-Label AI Platform for Agencies: Build a $50K/mo AI Business in 2026',
    description: 'The complete playbook for building a white-label AI worker business using Kyra. Pricing strategy, client onboarding, positioning, and how to scale to $50K/month.',
    date: '2026-02-23',
    readMins: 9,
    category: 'Agency Growth',
    emoji: '💰',
    content: `
<p>In 2026, the most profitable agencies aren't selling websites, ads, or even GHL setups. They're selling <strong>AI workers</strong>. And the ones who figured this out first are building $50,000/month businesses on autopilot.</p>

<p>This guide is the complete playbook for building a white-label AI worker business using Kyra — the platform built specifically for agencies who want to resell AI without building anything from scratch.</p>

<h2>Why AI Workers Are the Perfect Agency Product</h2>

<p>Most agency revenue is project-based or tied to ad spend — both are unpredictable and client-churn-heavy. AI workers are different:</p>

<ul>
<li><strong>Monthly recurring revenue:</strong> The AI runs 24/7 whether or not you do anything</li>
<li><strong>Near-zero churn:</strong> Clients don't cancel an AI that's booking their appointments</li>
<li><strong>High gross margins:</strong> Your cost to provide the service is $5–15/client/month in API fees</li>
<li><strong>Scalable:</strong> Going from 5 to 50 clients doesn't require hiring more staff</li>
<li><strong>Defensible:</strong> The AI learns the client's business over time — switching costs increase</li>
</ul>

<h2>The White-Label Model</h2>

<p>With Kyra, you're the agency. Your clients never see "Kyra" — they see an AI worker named whatever you've configured (Alex, Maya, Jordan — your choice). The AI is trained on their specific business, speaks their tone, and represents their brand.</p>

<p>Your clients think you built this. You didn't have to — Kyra is the infrastructure, you're the relationship and the strategy.</p>

<h2>Pricing Strategy</h2>

<p>Positioning matters as much as price. Don't sell this as "AI" — sell it as an AI worker. Here's how to frame it:</p>

<blockquote>
<p>"We're adding a full-time AI worker to your business. It responds to every customer inquiry in under 60 seconds, 24/7. It books appointments, answers questions, updates your CRM, and escalates anything it can't handle. Most businesses see ROI in the first week."</p>
</blockquote>

<p>Suggested pricing by tier:</p>

<table>
<tr><th>Package</th><th>Price</th><th>Includes</th></tr>
<tr><td>AI Starter</td><td>$500/mo</td><td>1 channel (SMS), basic personality, standard templates</td></tr>
<tr><td>AI Pro</td><td>$1,000/mo</td><td>All 7 channels, custom personality, CRM automation, escalation alerts</td></tr>
<tr><td>AI Enterprise</td><td>$2,000/mo</td><td>Everything in Pro + weekly performance reports, monthly strategy calls, priority support</td></tr>
</table>

<p>Your cost to Kyra: $299/month for up to 10 clients (Pro plan). At $1,000/client on 10 clients = $10,000/month revenue, $9,701/month gross margin.</p>

<h2>Client Onboarding Playbook</h2>

<p>The onboarding flow is where most agencies fumble. Here's the process that works:</p>

<h3>Day 1: Kickoff Call (30 min)</h3>
<ul>
<li>Walk them through what the AI will do</li>
<li>Collect: business name, AI name, pricing, FAQs, common objections, booking link</li>
<li>Get their GHL Private Integration Token (show them exactly how to create it)</li>
</ul>

<h3>Day 2: Configuration + Live Test</h3>
<ul>
<li>Set up their AI in Kyra — takes ~15 minutes with the industry template</li>
<li>Test it yourself: send 10 different test SMS messages</li>
<li>Send a test to the client so they can see it live</li>
</ul>

<h3>Day 3: Go Live</h3>
<ul>
<li>Flip the switch — the AI starts responding to real customer messages</li>
<li>Monitor for the first 48 hours; expect a few edge cases to tune</li>
</ul>

<h3>Week 1: First Performance Report</h3>
<ul>
<li>Share the performance report at /report/[clientId] — conversations handled, response time, resolution rate</li>
<li>This is your proof of value — use it in retention conversations</li>
</ul>

<h2>Industries That Sell Best</h2>

<p>Not all industries are equal. Here's where you'll have the easiest sales:</p>

<ol>
<li><strong>Dental practices</strong> — High urgency, appointment-driven, staff overwhelmed, new patient value $3K+</li>
<li><strong>Real estate agents</strong> — Every missed lead is a $10K+ lost commission</li>
<li><strong>Auto dealerships</strong> — High-volume, high-value, 24/7 customer inquiries</li>
<li><strong>Med spas</strong> — High-ticket treatments ($500-5K), strong urgency, lots of questions</li>
<li><strong>Cannabis dispensaries</strong> — Always-on business with compliance needs</li>
</ol>

<h2>How to Scale to $50K/Month</h2>

<p>At $1,000/month average per client, you need 50 clients. Here's the path:</p>

<ul>
<li><strong>Month 1–2:</strong> Land 5 clients from your existing network. Get them results. Get testimonials.</li>
<li><strong>Month 3–4:</strong> Use testimonials + the pitch deck at /pitch to close 5 more. Start outreach to cold prospects using the email templates.</li>
<li><strong>Month 5–6:</strong> Referral machine — happy clients refer other businesses. Offer 1 free month per referral.</li>
<li><strong>Month 7–12:</strong> Systemize. Hire a junior VA for onboarding. You focus on sales. Target: 50 clients.</li>
</ul>

<p>The key leverage: every client you add at month 6 is still paying at month 18. The churn is nearly zero because the AI is delivering daily, measurable value.</p>

<h2>The Pitch That Closes</h2>

<p>Stop pitching AI. Pitch the outcome:</p>

<blockquote>
<p>"Your business is missing 40% of inquiries after 6pm. That's revenue walking to your competitor. We'll put an AI worker on your phone line tonight. By Thursday morning, it will have handled 20+ conversations you would have missed. You'll see the report."</p>
</blockquote>

<p>Then show them the live demo: <a href="/try/dental">kyra.conversionsystem.com/try/dental</a>. Let them text it. Let them see a real AI reply in 10 seconds. Close rate goes up 3×.</p>

<h2>Get Started</h2>

<p>Kyra is free to start — no credit card, no commitment. Add your first client, run the demo, see the AI live. If it doesn't work, you haven't spent a dollar.</p>

<p><a href="/signup/agency">Create your free agency account →</a></p>
`,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find(p => p.slug === slug);
}

export function generateStaticParams() {
  return POSTS.map(p => ({ slug: p.slug }));
}
