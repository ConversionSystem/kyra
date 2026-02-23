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
    title: 'How to Add an AI Employee to Every GHL Client (and Charge $1,000/mo for It)',
    description: 'GHL agencies are sitting on a goldmine. Here\'s how to turn your existing client base into a recurring AI revenue stream — without building anything from scratch.',
    date: '2026-02-22',
    readMins: 6,
    category: 'Agency Growth',
    emoji: '🚀',
    content: `
<p>Most GHL agencies have the same problem: you charge a setup fee, maybe a retainer, and then the relationship goes quiet. The client stops replying. Revenue stagnates.</p>

<p>There's a simple fix. And it's worth $1,000–$2,000/month per client.</p>

<h2>What is an AI Employee?</h2>

<p>An AI employee is an autonomous AI agent that:</p>
<ul>
  <li>Responds to every inbound SMS in under 60 seconds — 24/7</li>
  <li>Books appointments by checking availability and confirming times</li>
  <li>Updates GHL CRM with tags and notes after every conversation</li>
  <li>Detects frustrated customers and escalates to your human team instantly</li>
  <li>Handles opt-outs, business hours, and multi-channel messages automatically</li>
</ul>

<p>It's not a chatbot. It's not a canned response bot. It's a real AI that understands context, remembers conversation history, and operates like a trained employee — except it never sleeps, never takes a vacation, and never calls in sick.</p>

<h2>Why GHL Agencies Are Perfectly Positioned</h2>

<p>You already have the infrastructure. GHL gives you the CRM, the pipelines, the phone numbers, and the messaging channels. An AI employee like Kyra plugs directly into your existing GHL setup using a Private Integration Token — no OAuth approval, no marketplace hurdles.</p>

<p>The moment your client adds their GHL token, the AI starts monitoring their conversations and responding automatically. Setup takes about 10 minutes. The AI goes live immediately.</p>

<h2>The Pricing Model That Works</h2>

<p>Most agencies bill their AI employees as a retainer:</p>

<ul>
  <li><strong>Local service businesses</strong> (dental, HVAC, fitness): $500–$1,000/month</li>
  <li><strong>High-ticket service businesses</strong> (real estate, law, med spa): $1,000–$3,000/month</li>
  <li><strong>Volume businesses</strong> (cannabis, auto, restaurant): $500–$2,000/month</li>
</ul>

<p>The pitch is simple: "Your AI employee responds to every lead in 60 seconds, books appointments, and updates your CRM — while you sleep. If it books one extra appointment per week, it's paid for itself."</p>

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

<p>Once you have your first AI employee live and your client sees results, scaling is straightforward. Every new client follows the same 5-step process. The AI personalities are different, the channels might vary, but the infrastructure is the same.</p>

<p>At 10 clients charging $800/month each: $8,000/month in recurring revenue. At 20 clients: $16,000/month. Kyra Pro handles 15 clients at $249/month — your gross margin is 97% before API costs.</p>

<h2>The Competitive Moat</h2>

<p>Once your client's AI employee is live and working, they won't want to turn it off. The AI builds up conversation history, learns the business's tone, and becomes genuinely useful over time. Churn on a working AI employee is near zero.</p>

<p>Every booking it makes, every lead it handles, every CRM update it logs — that's value your client can see. It's not abstract "automation." It's results they can count.</p>

<p>Ready to add your first AI employee? <a href="/try/dental">Try a live demo</a> or <a href="/signup/agency">start your free account</a>.</p>
`,
  },
  {
    slug: 'ai-for-dental-practices',
    title: 'AI for Dental Practices: How It Works, What It Does, and What to Expect',
    description: 'Dental practices lose thousands in missed appointments and unanswered after-hours inquiries every month. AI employees change that — here\'s exactly how.',
    date: '2026-02-22',
    readMins: 5,
    category: 'Industry Guide',
    emoji: '🦷',
    content: `
<p>Dental practices have a lead problem that most dentists don't realize: their phones go unanswered.</p>

<p>A patient texts at 7pm asking about a cleaning. The office is closed. By morning, they've booked with another practice. That's $150 lost on a cleaning — potentially $2,000+ if they become a regular patient.</p>

<p>An AI employee fixes this problem permanently.</p>

<h2>What the Dental AI Employee Does</h2>

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

<p>Here's an actual conversation a dental AI employee handles:</p>

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

<p>If your practice uses GoHighLevel (or you're a marketing agency that manages their GHL account), the AI employee integrates directly. It:</p>

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
    title: 'How Agencies Add $10,000/Month in Recurring Revenue with AI Employees',
    description: 'The math is simple: 10 clients × $1,000/month = $10K MRR at ~97% gross margin. Here\'s the exact playbook to get there in 90 days.',
    date: '2026-02-22',
    readMins: 7,
    category: 'Agency Growth',
    emoji: '💰',
    content: `
<p>Most digital marketing agencies have a ceiling problem. You can only take on so many clients. Every new client means more work, more management, more headaches. Revenue grows linearly. Costs grow almost as fast.</p>

<p>AI employees break this model. Here's why: the marginal cost of adding a 15th AI employee is almost zero. You configure a personality, connect GHL, and the AI does the rest. The infrastructure scales automatically. You don't hire more staff. You don't increase overhead.</p>

<p>That's the opportunity.</p>

<h2>The Math</h2>

<p>Let's run the numbers on a basic agency AI operation:</p>

<ul>
  <li><strong>Platform cost:</strong> $249/month (Kyra Pro, up to 15 AI employees)</li>
  <li><strong>API cost:</strong> ~$1–3/client/month at moderate conversation volume</li>
  <li><strong>Your price to clients:</strong> $800–$1,500/month per AI employee</li>
  <li><strong>10 clients at $1,000/month:</strong> $10,000 MRR</li>
  <li><strong>Your costs:</strong> ~$290/month (platform + API)</li>
  <li><strong>Gross margin:</strong> ~97%</li>
</ul>

<p>At 15 clients — Kyra Pro capacity — you're at $15,000/month with essentially no marginal cost increase.</p>

<h2>The 90-Day Playbook</h2>

<h3>Days 1–14: Foundation</h3>

<ol>
  <li>Sign up for Kyra at kyra.conversionsystem.com</li>
  <li>Set up a demo AI employee in your own agency's name (dental or real estate work great)</li>
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

<p>Here's the best part: AI employee churn is nearly zero. Once it's live and working, clients don't want to turn it off. The AI builds up institutional knowledge — it knows the business's tone, the common questions, the pipeline stages. Replacing it means starting over.</p>

<p>Compare this to typical agency services where clients churn after 3–6 months. An AI employee that books appointments and handles leads creates ongoing, measurable value that compounds over time.</p>

<p>Ready to start? <a href="/signup/agency">Create your free agency account</a> — no credit card required.</p>
`,
  },
  {
    slug: 'ghl-ai-employee-complete-guide',
    title: 'GoHighLevel AI Employee: The Complete Guide for GHL Agencies (2026)',
    description: 'Everything GHL agencies need to know about adding a real AI employee to every sub-account — not automations, not a chatbot. A real AI that talks, thinks, and books appointments.',
    date: '2026-02-23',
    readMins: 8,
    category: 'GHL Integration',
    emoji: '⚡',
    content: `
<p>If you're running a GoHighLevel agency, you've already heard the buzzword: "AI." GHL has started integrating AI features, and every agency is trying to figure out what to do with them. But most GHL agencies are doing AI wrong — and leaving serious money on the table.</p>

<p>This guide explains how to add a <strong>real AI employee</strong> to every GHL sub-account — not a workflow automation, not a keyword chatbot, but a conversational AI that responds to every inbound SMS within 60 seconds, 24/7.</p>

<h2>The Difference Between GHL Automations and a Real AI Employee</h2>

<p>GHL automations are powerful. You can trigger SMS sequences, send follow-ups, move contacts through pipelines — all automatically. But automations are <em>scripts</em>. They match conditions and fire responses. They can't handle:</p>

<ul>
<li>Questions they weren't explicitly programmed for</li>
<li>Natural conversation flow that goes off-script</li>
<li>Emotional or frustrated customers who need nuance</li>
<li>Open-ended questions like "what do you recommend?"</li>
</ul>

<p>A real AI employee — like Kyra — uses a large language model to <em>understand</em> what the customer is asking, then compose a contextually appropriate response. It reads the CRM, knows the contact's history, and replies like a trained team member would.</p>

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

<h2>Setting Up a GHL AI Employee in 10 Minutes</h2>

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

<p>Most GHL agencies are charging $500–$2,000/month per AI employee. The pricing depends on your client's industry and volume:</p>

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

<p>Ready to add AI employees to your GHL agency? <a href="/signup/agency">Create your free account</a> and have your first AI live in 10 minutes.</p>
`,
  },
  {
    slug: 'white-label-ai-platform-agencies',
    title: 'White-Label AI Platform for Agencies: Build a $50K/mo AI Business in 2026',
    description: 'The complete playbook for building a white-label AI employee business using Kyra. Pricing strategy, client onboarding, positioning, and how to scale to $50K/month.',
    date: '2026-02-23',
    readMins: 9,
    category: 'Agency Growth',
    emoji: '💰',
    content: `
<p>In 2026, the most profitable agencies aren't selling websites, ads, or even GHL setups. They're selling <strong>AI employees</strong>. And the ones who figured this out first are building $50,000/month businesses on autopilot.</p>

<p>This guide is the complete playbook for building a white-label AI employee business using Kyra — the platform built specifically for agencies who want to resell AI without building anything from scratch.</p>

<h2>Why AI Employees Are the Perfect Agency Product</h2>

<p>Most agency revenue is project-based or tied to ad spend — both are unpredictable and client-churn-heavy. AI employees are different:</p>

<ul>
<li><strong>Monthly recurring revenue:</strong> The AI runs 24/7 whether or not you do anything</li>
<li><strong>Near-zero churn:</strong> Clients don't cancel an AI that's booking their appointments</li>
<li><strong>High gross margins:</strong> Your cost to provide the service is $5–15/client/month in API fees</li>
<li><strong>Scalable:</strong> Going from 5 to 50 clients doesn't require hiring more staff</li>
<li><strong>Defensible:</strong> The AI learns the client's business over time — switching costs increase</li>
</ul>

<h2>The White-Label Model</h2>

<p>With Kyra, you're the agency. Your clients never see "Kyra" — they see an AI employee named whatever you've configured (Alex, Maya, Jordan — your choice). The AI is trained on their specific business, speaks their tone, and represents their brand.</p>

<p>Your clients think you built this. You didn't have to — Kyra is the infrastructure, you're the relationship and the strategy.</p>

<h2>Pricing Strategy</h2>

<p>Positioning matters as much as price. Don't sell this as "AI" — sell it as an AI employee. Here's how to frame it:</p>

<blockquote>
<p>"We're adding a full-time AI employee to your business. It responds to every customer inquiry in under 60 seconds, 24/7. It books appointments, answers questions, updates your CRM, and escalates anything it can't handle. Most businesses see ROI in the first week."</p>
</blockquote>

<p>Suggested pricing by tier:</p>

<table>
<tr><th>Package</th><th>Price</th><th>Includes</th></tr>
<tr><td>AI Starter</td><td>$500/mo</td><td>1 channel (SMS), basic personality, standard templates</td></tr>
<tr><td>AI Pro</td><td>$1,000/mo</td><td>All 7 channels, custom personality, CRM automation, escalation alerts</td></tr>
<tr><td>AI Enterprise</td><td>$2,000/mo</td><td>Everything in Pro + weekly performance reports, monthly strategy calls, priority support</td></tr>
</table>

<p>Your cost to Kyra: $249/month for up to 15 clients (Pro plan). At $1,000/client on 15 clients = $15,000/month revenue, $14,753/month gross margin.</p>

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
<p>"Your business is missing 40% of inquiries after 6pm. That's revenue walking to your competitor. We'll put an AI employee on your phone line tonight. By Thursday morning, it will have handled 20+ conversations you would have missed. You'll see the report."</p>
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
