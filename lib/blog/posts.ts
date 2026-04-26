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
    slug: 'whatsapp-ai-agent-openclaw-setup-2026',
    title: 'WhatsApp AI Agent with OpenClaw: The 2026 Agency Setup Guide After Meta\'s Chatbot Crackdown',
    description: 'A WhatsApp AI agent built on OpenClaw is a self-hosted assistant that links to a WhatsApp number through the multi-device protocol. Here is how to set one up in 2026 with the new replyToMode, per-group system prompts, and a complete CLI walkthrough.',
    date: '2026-04-26',
    readMins: 12,
    category: 'AI Infrastructure',
    emoji: '💬',
    content: `
<p><em>Last updated: April 26, 2026</em></p>

<p>A <strong>WhatsApp AI agent built on OpenClaw</strong> is a self-hosted assistant that links to a WhatsApp number through the multi-device protocol and replies to inbound messages with a Claude-powered, tool-using AI worker. The setup uses the same QR code WhatsApp Web uses, so the agent acts as a linked companion device on the user's phone rather than a Meta Cloud API number. That distinction got loud in January 2026, when Meta banned open-ended AI chatbots from the official WhatsApp Business Cloud API and forced the entire ecosystem to rethink which path to take. OpenClaw's WhatsApp channel is the most popular workaround in the agency world right now, and the 2026.4.22 release made it considerably more useful for multi-tenant deployments.</p>

<div style="background:rgba(79,70,229,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px 0;"><strong>Key takeaways</strong></p>
  <ul style="margin:0;">
    <li>OpenClaw connects to WhatsApp through Baileys, the open-source implementation of the WhatsApp Web multi-device protocol. No Meta Cloud API account is needed for inbound conversational AI.</li>
    <li>Meta banned mainstream AI chatbots from the Cloud API on January 15, 2026. Multi-device companion devices are the practical path for 1:1 reply-driven agents.</li>
    <li>OpenClaw 2026.4.22 added a <code>replyToMode</code> option, per-group and per-direct system prompts, and a fix for duplicate messages on reconnect.</li>
    <li>A working setup is one channel block in <code>config.yml</code>, one QR scan, and a persistent volume mount for the Baileys session keys.</li>
    <li>Cloud API still wins for high-volume template broadcast (over 50K/day). Multi-device wins for conversational, reply-first AI workers.</li>
    <li>The <code>per-channel-peer</code> dmScope default keeps every WhatsApp peer in their own isolated context, which is what regulated industries actually need.</li>
  </ul>
</div>

<h2>What an OpenClaw WhatsApp AI agent actually does</h2>

<p>The job is narrow and it is concrete. A user sends a WhatsApp message to a phone number. The OpenClaw gateway, running on a VPS or a home server, receives that message through the Baileys WebSocket connection. The gateway resolves a session key, loads the right context for that conversation, hands the message to a Claude or Grok or local model, and writes the agent's reply back to WhatsApp. The user sees a normal chat thread, with read receipts and typing indicators that look like every other WhatsApp conversation.</p>

<p>The interesting part is what happens between the message arriving and the reply going out. The agent has access to the full OpenClaw tool surface: it can read a calendar, query a CRM, run a Stripe lookup, hit any MCP connector the gateway has wired up, and call into per-client skills. A dental front desk agent answers a "do you take Delta Dental" question by checking a Supabase row. A real estate agent answers "what's the price on 412 Maple" by hitting a custom MLS skill. The reply that comes back to WhatsApp is grounded in real data, not hallucinated.</p>

<p>This is the difference between a chatbot and a worker. The chatbot reads a message and produces a string. The worker reads a message, looks something up, takes an action, and then produces a string. WhatsApp is just the channel. The intelligence lives in the gateway.</p>

<h2>Why 2026 changed the WhatsApp AI landscape</h2>

<p>Three shifts hit the WhatsApp AI world inside a single quarter, and they pushed serious agencies toward the multi-device path.</p>

<p>The first was the AI chatbot ban. On January 15, 2026, Meta updated its WhatsApp Business Cloud API policy to require that automated bots have "clear, predictable results associated with business messaging." Open-ended AI chat is out. Support flows, booking flows, and order flows are in. If an agency built its product on top of the official Cloud API and routed every inbound message to Claude or GPT for a freeform reply, that product became a policy violation overnight.</p>

<p>The second was the pricing change. Meta moved to a per-template-message model on April 1, 2026, scrapping the old "free first 1,000 conversations per month" tier and pricing utility, authentication, and marketing templates separately by destination country. For an agency running an AI worker that holds dozens of multi-turn conversations per client per day, the per-message economics quickly stop working.</p>

<p>The third was the rollout of WhatsApp usernames, scheduled to begin in test countries in June 2026, with a new business-scoped user identifier (BSUID) replacing phone numbers in webhooks. That is a longer-arc change that complicates how Cloud API integrations resolve identity, while multi-device companion devices keep working unchanged because they ride on the existing WhatsApp Web protocol.</p>

<p>Add it up and the shape of the problem is clear. If your agency is running 1:1 conversational AI on WhatsApp in 2026, the multi-device protocol is the path with the fewest landmines. OpenClaw's WhatsApp channel was already built that way, which is why it became the default option for the kind of work agencies and GHL resellers were trying to do.</p>

<h2>Cloud API vs multi-device: which path is yours</h2>

<p>The honest answer is that they are different products with different jobs. Cloud API is a transactional broadcast pipe optimized for templates: shipping notifications, OTP codes, appointment reminders sent at scale. Multi-device is a conversational pipe optimized for replies inside an existing thread, the way a human would respond from their phone.</p>

<p>If your use case is "I need to send 250,000 marketing templates a month," Cloud API is correct, and you should accept the policy and pricing constraints. If your use case is "I need to be the AI front desk for fifteen dental practices, each with a phone that already has WhatsApp," multi-device is correct, and OpenClaw is the cleanest way to wire it up.</p>

<p>Most Kyra-style agencies live entirely in the second world, which is why this guide focuses there. For the broader picture of how the same gateway handles other channels, the <a href="/blog/openclaw-session-keys-explained-2026">session keys deep dive</a> walks through how Slack, Discord, and Telegram fit alongside WhatsApp in the same install.</p>

<h2>Step-by-step: connect OpenClaw to WhatsApp in fifteen minutes</h2>

<p>The walkthrough below assumes you already have OpenClaw 2026.4.22 or later installed and the gateway listening on its default port. If you do not, the <a href="/blog/what-is-openclaw-ai-gateway-explained">"What is OpenClaw" overview</a> and the <a href="https://docs.openclaw.ai/channels/whatsapp">official WhatsApp channel docs</a> cover the install side.</p>

<p><strong>1. Confirm the gateway is running and reachable.</strong></p>

<pre><code>openclaw gateway status
# expected: listening on :18789, 0 active sessions</code></pre>

<p><strong>2. Create the persistent volume for Baileys session keys.</strong> This is the most common reason new installs lose the QR scan and ask you to scan again. Baileys writes the multi-device handshake material into a folder, and that folder must survive container restarts.</p>

<pre><code>mkdir -p ~/.openclaw/whatsapp/auth
chmod 700 ~/.openclaw/whatsapp/auth</code></pre>

<p><strong>3. Add the WhatsApp channel block to your gateway config.</strong></p>

<pre><code>$EDITOR ~/.openclaw/config.yml</code></pre>

<pre><code>channels:
  - type: whatsapp
    sessionPath: ~/.openclaw/whatsapp/auth
    replyToMode: smart
    dmScope: per-channel-peer
    systemPrompt: |
      You are the front desk for Acme Dental.
      Answer scheduling questions and route insurance
      questions to a human if Delta Dental is mentioned.
    groups:
      enabled: true
      systemPromptOverrides:
        - groupId: "120363045xxx@g.us"
          prompt: |
            You are the staff coordinator for Acme Dental.
            Reply only when explicitly @mentioned.</code></pre>

<p><strong>4. Reload the gateway.</strong></p>

<pre><code>openclaw gateway reload</code></pre>

<p><strong>5. Trigger the QR scan and link the device.</strong></p>

<pre><code>openclaw whatsapp link --print-qr
# scan the QR with: WhatsApp > Settings > Linked Devices > Link a device</code></pre>

<p>The QR code appears in the terminal as ASCII art. On the phone, open WhatsApp, navigate to Settings, then Linked Devices, then "Link a device," and point the camera at the terminal. The link completes in a few seconds and the gateway prints a "session bound" line.</p>

<p><strong>6. Send a test message from a second WhatsApp account.</strong> Open WhatsApp on a different phone, send "hello" to the linked number, and watch the gateway log.</p>

<pre><code>openclaw logs --channel whatsapp --tail
# expected: session resolved wa:+15551234567
# expected: agent reply dispatched in 1.4s</code></pre>

<p><strong>7. Verify isolation with a second peer.</strong> Send a different message from a third phone number. The two conversations must produce two different session keys (one per peer) and the agent must not leak context between them.</p>

<pre><code>openclaw sessions list --channel whatsapp
# expected: two rows, one per peer phone number</code></pre>

<p>That is the full setup. Seven commands, one config block, one QR scan. Every additional WhatsApp number is one more channel block with a different <code>sessionPath</code>, which is how an agency runs fifteen client phones on a single gateway.</p>

<h2>What is new in OpenClaw 2026.4.22 for WhatsApp</h2>

<p>The April 22 release was a small one in line count and a large one in practical impact. Three changes are worth knowing.</p>

<p>The <strong>replyToMode option</strong> controls whether the agent quotes the original message when it replies. Three values: <code>off</code> never quotes, <code>always</code> always quotes, and <code>smart</code> quotes only in groups or when the reply is to a message that arrived more than 60 seconds earlier. <code>smart</code> is the right default for almost every deployment because it keeps DMs feeling like a normal one-on-one chat while still pinning replies in noisy group threads.</p>

<p>The <strong>per-group and per-direct system prompts</strong> let one WhatsApp connection serve multiple conversational personas. The agent can be a clinical front desk in the patient DM thread and a concise staff coordinator in the internal staff group, with two completely different system prompts loaded based on the session key. Before this release, you needed two separate WhatsApp connections to do that.</p>

<p>The <strong>duplicate message fix</strong> closed a long-standing reconnect bug. When the Baileys WebSocket dropped and reconnected, pending message queues were re-driven by both the old and new connection, occasionally producing duplicate replies. The 2026.4.22 release adds an in-memory "active delivery claim" that prevents two reconnects from racing the same queue entry. The visible fix is that the agent stops sending the same reply twice during flaky internet.</p>

<h2>Session keys and per-peer isolation on WhatsApp</h2>

<p>Every inbound WhatsApp message arrives at the gateway with a small metadata bundle: the linked-device account that received it, the peer phone number that sent it, and whether the message landed in a DM or a group. The session manager turns that bundle into a deterministic string. A typical WhatsApp DM produces a key like <code>wa:+15551234567</code>; a WhatsApp group produces something like <code>wa:120363045xxx@g.us</code>.</p>

<p>The default <code>dmScope</code> setting is <code>per-channel-peer</code>, which means each peer phone number gets its own session and its own conversational memory. A patient asking about an appointment last Tuesday gets the context from last Tuesday's chat, not the context from a different patient who happens to share the same dental practice. Group chats always get their own session regardless of dmScope, because every group is a first-class room with its own membership and its own privacy expectations.</p>

<p>This is not optional infrastructure. Regulated industries on WhatsApp (dental, legal, medical, financial) need the agent to never confuse one peer's data with another's, and the session key boundary is what enforces that at the routing layer before the model ever sees the prompt. The deeper mechanics are spelled out in the <a href="/blog/openclaw-session-keys-explained-2026">session keys explainer</a> if you want the full algorithm.</p>

<h2>Comparison: WhatsApp AI deployment patterns in 2026</h2>

<p>Four patterns dominate the 2026 landscape for putting an AI agent on a WhatsApp number. They are not interchangeable, and the right pick depends on whether you care more about volume, conversation quality, compliance, or operational simplicity.</p>

<table>
  <thead>
    <tr>
      <th>Pattern</th>
      <th>Connection</th>
      <th>Typical use case</th>
      <th>2026 reality</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>OpenClaw + Baileys</strong></td>
      <td>Multi-device companion (QR scan)</td>
      <td>Conversational AI worker, agency multi-tenant</td>
      <td>Default for replies; no per-message fees</td>
    </tr>
    <tr>
      <td><strong>Meta Cloud API + classic flow</strong></td>
      <td>Official Business API, template-driven</td>
      <td>Notifications, OTP, scheduled broadcasts</td>
      <td>Required for &gt;50K/day; AI-chat banned since Jan 15, 2026</td>
    </tr>
    <tr>
      <td><strong>Cloud API via BSP middleware</strong></td>
      <td>Twilio/MessageBird/360dialog wrappers</td>
      <td>Mid-volume mixed flows</td>
      <td>Same Meta policies; vendor markup added</td>
    </tr>
    <tr>
      <td><strong>WhatsApp MCP server</strong></td>
      <td>Local Baileys + MCP protocol</td>
      <td>Personal assistant for one operator</td>
      <td>Great for solo use, weak for multi-tenant ops</td>
    </tr>
  </tbody>
</table>

<p>The two paths agencies should evaluate first are OpenClaw + Baileys for inbound conversational work and Meta Cloud API for outbound transactional templates. Many production deployments end up running both side by side: OpenClaw answers replies, Cloud API ships the appointment reminder that started the thread. The two systems do not conflict because each handles a different message direction.</p>

<h2>When OpenClaw on WhatsApp is not for you</h2>

<p>The multi-device path is not the right answer for every shop, and pretending otherwise is how agencies blow up a client account.</p>

<p><strong>You need to send more than 50,000 outbound templates per day.</strong> Multi-device companion devices are rate-limited the same way a human user is. If your job is high-volume broadcast, you want Cloud API or a BSP, and you should accept the per-template pricing as the cost of the channel.</p>

<p><strong>Your client is contractually required to use the Meta Business Platform.</strong> Some healthcare networks, financial institutions, and regulated brands require an officially provisioned Cloud API number with a green checkmark. Multi-device companion devices do not appear in the Business Platform dashboard, and audits will fail.</p>

<p><strong>You need WhatsApp's official Flows or list-message templates.</strong> Some interactive UI primitives (carousels, native list pickers, structured forms) are exclusive to the Cloud API. Baileys can fake a lot of the experience with text and quick replies, but if your client demands the native flow widgets, the multi-device path will not deliver them.</p>

<p><strong>You are unwilling to keep the linking phone online.</strong> Multi-device sessions stay alive even with the linking phone off, but the phone must occasionally come online to refresh the link. If the linked phone is permanently unavailable (lost, stolen, formatted), the session breaks and the next inbound message fails until you scan a new QR. Cloud API has no such constraint.</p>

<p>Outside those four conditions, OpenClaw on WhatsApp is the path most agencies should default to in 2026.</p>

<h2>Frequently asked questions</h2>

<h3>Does OpenClaw need a verified Meta Business account?</h3>

<p>No. The OpenClaw WhatsApp channel uses the multi-device protocol via Baileys, which is the same protocol WhatsApp Web uses. You scan a QR code with the phone that owns the number and the gateway acts as a linked companion device. There is no Meta Business onboarding, no display name approval, and no template review process. If the phone has WhatsApp installed and can scan a QR code, the agent can connect.</p>

<h3>Will Meta ban my number for using a Baileys-based AI agent?</h3>

<p>Meta does not publish enforcement criteria for multi-device clients, and bans do happen for accounts that send spam or template-style broadcast through the personal protocol. Conservative usage (replying to inbound messages, normal conversational pace, no mass cold outreach) has a long track record of staying inside the lines. Use the channel for replies, not for cold blast campaigns, and keep the per-day outbound volume in human ranges.</p>

<h3>What happens if the Baileys session expires?</h3>

<p>The gateway logs an "auth state invalidated" line and pauses the channel. Run <code>openclaw whatsapp link --print-qr</code> again, scan with the same phone, and the channel resumes. Existing conversations keep their session keys, so the agent's memory survives the relink. The persistent volume mount on <code>sessionPath</code> is what makes this safe; without it, every restart is a relink.</p>

<h3>Can one OpenClaw gateway run multiple WhatsApp numbers?</h3>

<p>Yes. Add one channel block per number, each with its own <code>sessionPath</code> directory and its own systemPrompt. The session key includes the linked-device account identifier, so messages from different numbers route to different conversations and never overlap. This is the standard pattern for agencies hosting fifteen or twenty client numbers on a single gateway.</p>

<h3>How does this interact with Anthropic's Claude Code Channels?</h3>

<p>Anthropic's <a href="https://docs.anthropic.com/en/docs/claude-code/channels">Claude Code Channels</a> shipped in early 2026 with native Discord and Telegram support, but no first-party WhatsApp connector. The community is expected to build one through the open MCP standard, and OpenClaw already covers the WhatsApp side directly today. If your stack is Claude Code centric and you need WhatsApp now, OpenClaw is the bridge that exists.</p>

<h3>Does the agent see WhatsApp end-to-end encrypted messages in plaintext?</h3>

<p>Yes, by design. A linked companion device is an authorized endpoint inside WhatsApp's E2EE model, just like the user's phone or laptop. Messages are decrypted on the OpenClaw host and the model receives plaintext. This is what enables the agent to reply at all. It also means the host should be treated as sensitive infrastructure: full disk encryption, locked-down SSH, and no sharing the box with untrusted workloads.</p>

<h2>The smallest piece of infrastructure your agency probably underestimates</h2>

<p>WhatsApp is not exotic. It is the channel a billion small businesses already use, and the AI agent that lives inside it does not have to be exotic either. One config block, one QR scan, one persistent volume, and a Claude model on the back end is genuinely the whole thing. The work that used to take a Meta Business onboarding, a template approval queue, and a BSP contract now takes fifteen minutes. The 2026 changes to the official Cloud API made multi-device the right default for conversational AI, and OpenClaw 2026.4.22 made it cleaner to operate.</p>

<p>If you would rather skip the VPS and the QR refresh dance and just hand a working WhatsApp number to a client, <a href="/solo">Kyra</a> runs the OpenClaw gateway, the Baileys session storage, and the per-client isolation on a managed host with the same defaults this guide describes. Industry-specific starting templates are ready for <a href="/ai-for/dental">dental practices</a> and <a href="/ai-for/real-estate">real estate agencies</a>, and the underlying primitives are documented in the <a href="https://docs.openclaw.ai/channels/whatsapp">OpenClaw WhatsApp reference</a> and the <a href="https://github.com/openclaw/openclaw">OpenClaw repository on GitHub</a>. WhatsApp is where most of your clients' customers already are. Putting an AI worker there in 2026 is no longer the hard part of the project.</p>
`,
  },
  {
    slug: 'openclaw-session-keys-explained-2026',
    title: 'OpenClaw Session Keys Explained: How One Gateway Keeps 24 Channels Separate in 2026',
    description: 'An OpenClaw session key is the unique string that tells the gateway which conversation a message belongs to. Here is how session keys work, how dmScope isolates DMs across WhatsApp, Slack, Discord, and 20+ other channels, and how to configure them for a multi-client agency without leaking context between users.',
    date: '2026-04-20',
    readMins: 12,
    category: 'AI Infrastructure',
    emoji: '🔑',
    content: `
<p><em>Last updated: April 20, 2026</em></p>

<p>An <strong>OpenClaw session key</strong> is the unique identifier the gateway attaches to every incoming message so the AI agent knows which conversation it belongs to and which context to load. Each channel, each user, and each thread produces a different key. That one string is what lets a single OpenClaw gateway run a WhatsApp DM, a Slack thread, a Discord guild channel, and the browser WebChat widget side by side without any of them reading the others' memory. OpenClaw 2026.4.15 ships 24 supported channel integrations out of the box, and the session key is the quiet machinery that keeps every one of those conversations isolated from every other one.</p>

<div style="background:rgba(79,70,229,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px 0;"><strong>Key takeaways</strong></p>
  <ul style="margin:0;">
    <li>Session keys are generated automatically from channel, user, and thread metadata. You normally never type one by hand, but you can override the format for multi-tenant apps.</li>
    <li>The <code>session.dmScope</code> setting has three modes (<code>main</code>, <code>per-channel-peer</code>, <code>per-peer</code>) and each one trades continuity for isolation differently.</li>
    <li>Groups and threads always get their own session. That part is not configurable and it is the right default for group privacy.</li>
    <li>The OpenClaw gateway listens on port 18789 by default and resolves the session key before it ever dispatches a message to the agent runtime.</li>
    <li>A prefixed session key like <code>kyra-user-42</code> is how multi-tenant platforms separate thousands of clients without spinning up a container per user.</li>
    <li>Session keys solve the isolation problem at the context layer, not the infrastructure layer. One daemon, one agent pool, N clean conversations.</li>
  </ul>
</div>

<h2>What an OpenClaw session key actually is</h2>

<p>Every message that arrives at an OpenClaw gateway carries a small bundle of metadata: which channel adapter it came from (Slack, WhatsApp, Discord, Matrix, and so on), which account sent it, and whether it landed in a DM, a group, or a thread. The gateway runs that bundle through its session manager, which deterministically produces a string. That string is the session key.</p>

<p>The key does two jobs at once. First, it tells the agent runtime which conversation's memory, history, and working files to load before replying. Second, it tells the gateway where to route the reply once the agent is done thinking. A message with key <code>slack:T12345:C98765:U00001</code> loads and writes to a different context than a message with key <code>wa:+15551234567</code>, even if both messages come from the same human being on the same day.</p>

<p>This is the core primitive behind OpenClaw's "one gateway, many channels" promise. Without the session key, every incoming message would either collapse into a single global chat (disastrous for privacy) or require a separate daemon per channel (disastrous for cost and ops). The key is the cheap, composable middle path.</p>

<h2>Why one gateway needs many sessions</h2>

<p>A realistic deployment for a small agency looks like this. One OpenClaw gateway on a VPS. One Anthropic API key. Fifteen client businesses, each with their own Slack workspace, WhatsApp number, or web widget. Hundreds of end users across those businesses. Every one of those users expects the AI to remember their last conversation and nothing else.</p>

<p>If you tried to do that with fifteen separate daemons, your ops surface would triple: fifteen systemd units to patch, fifteen logs to tail, fifteen sets of secrets to rotate. If you tried to do it with one daemon and one global conversation, the first time User A's medical question leaked into User B's session you would lose every client at once.</p>

<p>Session keys let you stay in the middle. One daemon still runs. One agent pool still handles the load. But every message lives in its own keyed context, and the gateway enforces the boundary before the model ever sees the prompt. This is the same pattern Cowork, Claude Code's IDE extensions, and most production OpenClaw deployments use, and it is exactly how the broader <a href="/blog/what-is-openclaw-ai-gateway-explained">OpenClaw gateway architecture</a> was designed to scale.</p>

<h2>The anatomy of a session key</h2>

<p>Session keys are plain strings, so you can look at them in a log file and read them. The default format encodes the channel, the workspace or server, the channel or room, and the user, joined with colons. Real examples from a production gateway:</p>

<ul>
  <li><code>slack:T09ABC123:C04XYZ789:U07DEF456</code> — a DM inside a specific Slack workspace</li>
  <li><code>discord:guild_742:channel_9981:user_4412</code> — a DM-style channel in a Discord guild</li>
  <li><code>wa:+15551234567</code> — a WhatsApp DM, keyed by the peer's phone number</li>
  <li><code>telegram:chat_5839201</code> — a Telegram chat</li>
  <li><code>webchat:anon_9d2f1c</code> — an anonymous browser visitor on the WebChat widget</li>
  <li><code>matrix:!room_abc:server:@user:server</code> — a Matrix room with full federated identity</li>
</ul>

<p>You can also prefix your own namespace. This is how multi-tenant hosts structure keys. A self-serve platform might force every agent's session keys to begin with <code>tenant-42-</code>, giving you strings like <code>tenant-42-slack:T09ABC:C04XYZ:U07DEF</code>. The gateway treats the prefix as opaque, but it means one tenant's Slack DM and a different tenant's identical Slack DM never collide in the session store.</p>

<p>The specific format is documented in the <a href="https://docs.openclaw.ai/gateway/security">OpenClaw gateway security reference</a>. You can override it in <code>config.yml</code> under <code>session.keyFormat</code>, but the default is good enough for 95% of deployments and you should only change it if you know exactly why.</p>

<h2>dmScope: three ways to isolate direct messages</h2>

<p>Groups and threads are easy. Every group gets its own session key, every thread gets its own key, and nobody disagrees about whether that is correct. DMs are the interesting case. A user who chats with the same AI persona across Slack, WhatsApp, and WebChat might want those three surfaces to feel like one continuous conversation, or they might want them to feel like three airtight rooms. OpenClaw exposes this choice through the <code>session.dmScope</code> setting, which has exactly three valid values.</p>

<h3>dmScope: main (the default)</h3>

<p>In <code>main</code> mode every direct message the user sends, from any channel, resolves to the same shared session. The agent remembers everything they ever said in a DM regardless of which app delivered it. This is the warmest setting and the right one for a single-user personal assistant: the OpenClaw founder chatting with their own agent from Slack in the morning and WhatsApp in the evening does not want two separate memories.</p>

<h3>dmScope: per-channel-peer (the secure default)</h3>

<p>In <code>per-channel-peer</code> mode every unique combination of channel plus sender produces its own session. Slack DMs from user Alice get one session. WhatsApp DMs from the same Alice get a different one. Discord DMs get a third. This is the right default when you deploy for other people rather than yourself. An employee who messages the AI from work Slack and personal WhatsApp probably expects those to feel like two different contexts, and HR auditors definitely expect it.</p>

<h3>dmScope: per-peer</h3>

<p>In <code>per-peer</code> mode the channel is dropped from the key and only the peer identity matters. Alice's DMs collapse into one session across every channel of the same type, but different channel types still stay separate. This is the rarest setting and is usually only useful when the underlying identity system is strong enough to trust across surfaces, for example a Matrix-federated deployment where every user has one canonical MXID.</p>

<p>The practical rule: start with <code>per-channel-peer</code> for any multi-user deployment, switch to <code>main</code> for a personal bot, and only reach for <code>per-peer</code> when a specific compliance or UX requirement demands it.</p>

<h2>Groups, threads, and why they always get their own session</h2>

<p>The dmScope setting only governs direct messages. Group channels and threads are treated as first-class conversations in their own right, every time, without exception. A Slack channel <code>#general</code> gets one session key shared by every member. A Slack thread inside that channel gets a different session key shared by every participant in the thread. The same rule applies to Discord threads, Matrix spaces, Telegram group chats, and WhatsApp groups.</p>

<p>This design matters for two reasons. First, groups have social norms: a message posted to <code>#engineering</code> is readable by the whole team, so the agent can safely load prior <code>#engineering</code> context when replying. Second, threads are mini-rooms: they exist specifically because the participants want a scoped side conversation, and the agent should respect that scope. OpenClaw bakes that expectation into the session layer so the developer cannot accidentally violate it.</p>

<p>The upshot is that <code>dmScope</code> only needs to worry about direct messages because everything else already has the right behavior by default. If you need to see the full precedence order the gateway uses to derive a key, the <a href="https://docs.openclaw.ai/gateway/security">security reference</a> lays out the full resolution algorithm.</p>

<h2>Step-by-step: configure session keys for a multi-client agency</h2>

<p>Here is a minimal working setup that takes an OpenClaw gateway from vanilla install to multi-client isolation. It assumes you have already installed OpenClaw and bound it to its default port. The walkthrough targets OpenClaw 2026.4.15 or later.</p>

<p><strong>1. Confirm the gateway is running.</strong></p>

<pre><code>openclaw gateway status
# expected: listening on :18789, 0 active sessions</code></pre>

<p><strong>2. Open your gateway config.</strong></p>

<pre><code>$EDITOR ~/.openclaw/config.yml</code></pre>

<p><strong>3. Set the DM scope and enable tenant prefixing.</strong> This is the single most important block for multi-client deployments. Every session key will now carry the tenant prefix, and DMs will isolate per channel plus peer.</p>

<pre><code>session:
  dmScope: per-channel-peer
  keyFormat: "tenant-{tenant_id}-{channel}:{server_id}:{channel_id}:{user_id}"
  ttlDays: 30
  storage: sqlite
  storagePath: ~/.openclaw/sessions.db</code></pre>

<p><strong>4. Add two channel adapters for a first smoke test.</strong> Slack and WebChat are the fastest to wire up because neither requires a verified phone number.</p>

<pre><code>channels:
  - type: slack
    botToken: \${SLACK_BOT_TOKEN}
    signingSecret: \${SLACK_SIGNING_SECRET}
    tenant_id: "42"
  - type: webchat
    publicUrl: https://chat.example.com
    tenant_id: "42"</code></pre>

<p><strong>5. Reload the gateway without dropping active sessions.</strong></p>

<pre><code>openclaw gateway reload</code></pre>

<p><strong>6. Send one test message from each surface.</strong> Slack DM first, then a WebChat visit from an incognito browser. Then run the session listing command.</p>

<pre><code>openclaw sessions list --tenant 42
# expected: two rows, one slack session, one webchat session,
# both prefixed with tenant-42-</code></pre>

<p><strong>7. Verify isolation with a one-line check.</strong> Ask the agent in Slack what it remembers. Ask the same question in WebChat. The answers must differ. If they don't, your <code>dmScope</code> is wrong or your <code>keyFormat</code> is collapsing the two keys into one.</p>

<p>That is it. The config file and the seven commands above are a complete per-tenant session isolation setup. Every client you add later is one more entry in the <code>channels:</code> array with a different <code>tenant_id</code>, plus whatever per-client skills or memory you want to layer on top. For the broader walkthrough that includes <a href="/blog/mcp-connectors-openclaw-guide-2026">MCP connectors</a> and <a href="/blog/write-your-first-claude-skill-openclaw-2026">Claude Skills</a>, those two companion guides pick up where this one stops.</p>

<h2>Comparison: session isolation strategies across AI gateways</h2>

<p>Session isolation is not an OpenClaw-specific idea, but the shape of the implementation varies widely across the ecosystem. Here is how the four patterns most teams will encounter in 2026 actually differ.</p>

<table>
  <thead>
    <tr>
      <th>Strategy</th>
      <th>What gets isolated</th>
      <th>Typical implementation</th>
      <th>Cost per extra user</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Session key (OpenClaw)</strong></td>
      <td>Conversation context, memory, working files</td>
      <td>One daemon, keyed context store</td>
      <td>A few KB of session state</td>
    </tr>
    <tr>
      <td><strong>Container per tenant</strong></td>
      <td>Everything, including CPU and filesystem</td>
      <td>One container per client, orchestrator on top</td>
      <td>50–200 MB RAM minimum per user</td>
    </tr>
    <tr>
      <td><strong>Thread per request (classic chatbot)</strong></td>
      <td>Nothing beyond one turn</td>
      <td>Stateless API call, memory pushed to a DB</td>
      <td>Round-trips to external memory on every turn</td>
    </tr>
    <tr>
      <td><strong>Claude Managed Agents</strong></td>
      <td>Sandboxed execution, long-running sessions</td>
      <td>Anthropic-hosted infrastructure (public beta, April 2026)</td>
      <td>Per-session metered pricing</td>
    </tr>
  </tbody>
</table>

<p>Session keys give you conversation-level isolation at near-zero marginal cost, which is why they dominate multi-tenant self-hosted deployments. Containers give you infrastructure-level isolation, which matters when you run untrusted code and you are willing to pay the RAM bill. Anthropic's <a href="https://docs.anthropic.com/en/docs/claude-managed-agents">Claude Managed Agents</a>, launched in public beta on April 8, 2026, sit at the other end of the spectrum: you pay Anthropic to host the isolation boundary and stop worrying about it yourself. Most Kyra-style deployments pick the session key path because it keeps the stack thin.</p>

<h2>When session keys aren't the right answer for you</h2>

<p>Session keys solve context isolation. They do not solve everything, and there are three situations where reaching for a different primitive is the correct move.</p>

<p><strong>You run untrusted code on behalf of users.</strong> If your agent executes arbitrary Python or shell that a user can control, context isolation is necessary but not sufficient. You want a real sandbox boundary: a container, a firecracker VM, or Claude Managed Agents. Session keys stop a user from reading another user's conversation, but they do not stop one user's shell command from reading the daemon's filesystem.</p>

<p><strong>You have strict regulatory isolation requirements.</strong> Some HIPAA, GDPR, or FedRAMP deployments contractually require that two tenants' data never share a process, period. Session keys share a process by design. If your compliance officer is in the conversation, plan for a container-per-tenant or a dedicated gateway-per-tenant architecture from day one.</p>

<p><strong>You want a stateless protocol.</strong> The MCP working group is actively evolving the protocol toward stateless requests in 2026 for the same load-balancer and horizontal-scaling reasons that session state creates. If your deployment is behind a round-robin load balancer across many stateless server instances, OpenClaw's keyed session store assumes the load balancer is sticky (or assumes a shared session DB). Pick accordingly, and check the <a href="https://modelcontextprotocol.io/development/roadmap">MCP 2026 roadmap</a> if you are making long-range architecture bets.</p>

<p>For the other 80% of deployments (agencies with tens to low hundreds of clients, founders running a personal assistant across every app they use, GHL resellers adding an AI worker per client), session keys are boringly correct.</p>

<h2>Frequently asked questions</h2>

<h3>How does OpenClaw decide which agent handles a given session key?</h3>

<p>The gateway reads a <code>routing:</code> block in the config that maps channel patterns to agent names. A route like <code>slack:T09ABC*:* -> agent-acme</code> sends every Slack message from workspace T09ABC to the Acme agent, regardless of which user or channel triggered it. Session keys are derived first, then routing picks the agent, then the agent loads the session's context. All three steps happen before the model sees a single token.</p>

<h3>Can I share a session key across two users intentionally?</h3>

<p>Yes. Set <code>session.keyFormat</code> to a value that ignores the user portion, for example <code>"{channel}:{server_id}:{channel_id}"</code>. Every user in that channel will then write to the same context. This is useful for a shared workspace assistant where the team expects a continuous thread of memory. Use it on purpose, not by accident.</p>

<h3>What happens when a session key is rotated or expired?</h3>

<p>Sessions have a TTL (default 30 days). When the TTL lapses, the gateway archives the conversation and returns a cold context for the next message with that key. The user sees the AI "forget" the old conversation. To keep the memory forever, set <code>session.ttlDays</code> to <code>0</code> and budget for your session store to grow over time.</p>

<h3>Can I look up a session key from a user's name?</h3>

<p>Yes, through the admin API. <code>openclaw sessions find --channel slack --user U07DEF456</code> returns the full session key and metadata. This is how support teams pull up a user's conversation history when they file a ticket. Access is gated by the gateway's admin token, not by the agent, so users cannot read each other's sessions even if they have agent-level tool access.</p>

<h3>Does this work the same way in a Cowork deployment?</h3>

<p>Yes. Cowork adds a workspace layer on top of the gateway, but the session key primitive is the same. A Cowork workspace contributes one more segment to the key (the workspace ID), which is how a single physical gateway can host many Cowork tenants without any of them seeing each other's sessions.</p>

<h3>How do I debug a session that is routing to the wrong agent?</h3>

<p>Run the gateway with <code>OPENCLAW_LOG=debug</code> and watch the "session resolved" and "routing matched" log lines for the incoming message. Nine times out of ten the issue is a missing or wrong <code>tenant_id</code> on the channel, or a routing pattern that matches more aggressively than you expected. The third time it is an outdated cache, which <code>openclaw gateway reload</code> fixes.</p>

<h2>The small idea that makes multi-channel AI practical</h2>

<p>Session keys are a small idea and they do a surprising amount of work. They are why one OpenClaw daemon can run 15 clients without cross-talk. They are why a personal assistant can feel continuous across Slack and WhatsApp or crisply separated, depending on a single config line. They are why agencies can charge recurring fees for AI workers without standing up a container farm to host them. The format is five minutes of reading in the docs, and the implications show up in every architectural decision downstream.</p>

<p>If you want the OpenClaw gateway, the session key defaults, and the per-client isolation wired up for you rather than configured by hand, <a href="/solo">Kyra</a> runs the whole stack on your own domain with tenant prefixes and <code>per-channel-peer</code> isolation turned on from the first install. For industry-specific starting points there are ready-made worker templates for <a href="/ai-for/dental">dental practices</a> and <a href="/ai-for/real-estate">real estate agencies</a>, and for the architectural picture behind all of this, the <a href="https://github.com/openclaw/openclaw">OpenClaw repository on GitHub</a> and the <a href="https://docs.openclaw.ai/gateway/security">gateway security reference</a> are the two most useful places to keep bookmarked. Session keys are the kind of primitive you only notice when they fail, and when they are set up right you should never have to think about them again.</p>
`,
  },
  {
    slug: 'write-your-first-claude-skill-openclaw-2026',
    title: 'Write Your First Claude Skill for OpenClaw: A 2026 Step-by-Step Guide',
    description: 'Claude Skills became an open standard in December 2025 and now power 13,729 community skills in the OpenClaw registry. Here is the definition, the SKILL.md anatomy, a full walkthrough for writing and shipping your first skill, and the comparison to MCP and sub-agents.',
    date: '2026-04-19',
    readMins: 12,
    category: 'AI Infrastructure',
    emoji: '🛠️',
    content: `
<p><em>Last updated: April 19, 2026</em></p>

<p>A <strong>Claude Skill</strong> is a folder of markdown and optional scripts that teaches an AI agent one specific, repeatable workflow and loads itself into context only when the agent detects a matching request. Anthropic announced Skills on October 16, 2025, published the 32-page <em>Complete Guide to Building Skills for Claude</em> on January 29, 2026, and made Agent Skills an open standard on December 18, 2025. The same format now works across Claude Code, Claude Desktop, Cursor, and OpenClaw. By February 28, 2026 the public OpenClaw registry (ClawHub) was already carrying <strong>13,729 community-built skills</strong>, and the format had become the default way agent builders package reusable capability.</p>

<div style="background:rgba(79,70,229,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px 0;"><strong>Key takeaways</strong></p>
  <ul style="margin:0;">
    <li>A Skill is a directory with a <code>SKILL.md</code> file. The file has YAML frontmatter (name, description, optional allowed-tools) and markdown instructions below it.</li>
    <li>The <code>description</code> field decides whether the agent ever loads the skill. Write it as a clear "what it does + when to use it" sentence.</li>
    <li>Skills use progressive disclosure: only the frontmatter metadata sits in context until a matching request triggers a full load. Fifty skills cost roughly the same idle tokens as one.</li>
    <li>OpenClaw loads skills from three roots, in precedence order: bundled, local (<code>~/.openclaw/skills</code>), and per-workspace. Later roots override earlier ones by name.</li>
    <li>Agent Skills became an open standard in December 2025. A skill written for Claude Code drops into OpenClaw, Cursor, or any compatible runtime with no rewrite.</li>
    <li>Skills are the right answer for repeatable procedural knowledge. Tools, MCP servers, and sub-agents solve different problems and are explained below.</li>
  </ul>
</div>

<h2>What a Claude Skill actually is</h2>

<p>Before Skills, agent builders had three choices. You could stuff long instructions into the system prompt and pay the token cost on every turn. You could write a custom tool for each workflow and maintain the glue code forever. Or you could train a sub-agent per task and juggle routing logic by hand.</p>

<p>A Skill replaces all three for the case that covers most real work: <em>the agent already knows how to do the thing in principle, but it needs the house-specific recipe</em>. How does our agency format a client onboarding report? Which fields go into a GHL appointment webhook? What is the exact SQL migration pattern this codebase uses? Those answers are short, procedural, and worth reusing. That is a Skill.</p>

<p>The physical artifact is almost embarrassingly simple. A folder. Inside the folder, a file named <code>SKILL.md</code>. Optional subfolders named <code>scripts/</code>, <code>references/</code>, and <code>assets/</code> for bundled code, docs, and templates. That is the whole spec.</p>

<p>The agent indexes every skill's frontmatter at startup. When a user request matches the description, the agent pulls in the full markdown and any referenced files, runs the procedure, and unloads it again. Progressive disclosure keeps idle context cheap and the skill library big.</p>

<h2>Skills vs tools vs MCP servers vs sub-agents</h2>

<p>Agent builders new to the ecosystem routinely confuse these four primitives. They solve overlapping but distinct problems, and picking the wrong one creates architecture pain that is hard to undo later.</p>

<table>
  <thead>
    <tr>
      <th>Primitive</th>
      <th>What it encodes</th>
      <th>When to reach for it</th>
      <th>Cost model</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Skill</strong></td>
      <td>Procedural knowledge and templates</td>
      <td>A repeatable workflow your agent does often, with house-specific steps</td>
      <td>Metadata-only when idle, full markdown on trigger</td>
    </tr>
    <tr>
      <td><strong>Tool</strong></td>
      <td>A deterministic function the agent can call</td>
      <td>Reading a file, sending a message, running a shell command</td>
      <td>Schema in context always, invoked on demand</td>
    </tr>
    <tr>
      <td><strong>MCP server</strong></td>
      <td>A remote bundle of tools and resources from one data source</td>
      <td>Any external integration you want to share across agents</td>
      <td>Subprocess or HTTP service, schema injected into context</td>
    </tr>
    <tr>
      <td><strong>Sub-agent</strong></td>
      <td>A separate agent loop with its own context window</td>
      <td>Long research, parallel exploration, isolated failure domains</td>
      <td>A fresh full conversation per invocation</td>
    </tr>
  </tbody>
</table>

<p>The mental model that keeps teams unstuck: a Skill tells the agent <em>how</em> to do something. A Tool or MCP server lets the agent <em>do</em> something. A Sub-agent delegates the <em>whole job</em> to a new context. Most production OpenClaw workspaces end up using all four, but they start with Skills because Skills are cheap, versionable, and readable in plain markdown.</p>

<p>For a deeper look at the MCP half of that picture, see the companion post on <a href="/blog/mcp-connectors-openclaw-guide-2026">MCP connectors in OpenClaw</a>.</p>

<h2>The SKILL.md anatomy</h2>

<p>Every Skill file has two parts. YAML frontmatter on top, markdown body below. The frontmatter tells the agent when to load the skill. The body tells the agent what to do once loaded.</p>

<p>A minimal example for a fictitious "summarize-client-call" skill:</p>

<pre><code>---
name: summarize-client-call
description: Turns a raw call transcript into a structured client summary with action items. Use this whenever the user pastes a call transcript, attaches an audio transcript file, or asks to summarize a client conversation.
allowed-tools: [read_file, write_file]
---

# Summarize Client Call

## When to use
The user has a call transcript (text, VTT, or pasted dialogue) and wants a structured summary for their CRM.

## Steps
1. Read the transcript. Identify the client name, the agency owner's name, and the call date.
2. Extract the top three outcomes the client wanted from the call.
3. Extract every action item, with the owner and a due date if mentioned.
4. Write the result to \`./out/&lt;client&gt;-&lt;YYYY-MM-DD&gt;.md\` using the template in \`./references/template.md\`.

## Output contract
The summary file must contain five H2 sections: Attendees, Context, Outcomes, Action items, Next call.
</code></pre>

<p>Three details matter more than they look. First, <code>description</code> is the only string the agent sees before loading the skill, so it has to contain both what the skill does and the exact trigger phrases a user might say. Anthropic's own skill-creator plugin writes the description last for exactly this reason. Second, <code>allowed-tools</code> is a safety rail: even if the agent has twenty tools available, only the listed ones can fire while this skill is active. Third, the body uses short numbered steps, not prose. Agents follow checklists reliably. They rewrite prose.</p>

<h2>Step-by-step: write and install your first OpenClaw skill</h2>

<p>This walkthrough produces a working skill in about fifteen minutes on a fresh OpenClaw install. Any Linux, macOS, or WSL box with Node.js 22 or newer will do.</p>

<p><strong>1. Install OpenClaw and start the gateway</strong> if you have not already:</p>

<pre><code>npm install -g @openclaw/cli
openclaw init
openclaw gateway start</code></pre>

<p><strong>2. Create the skill directory</strong> inside your local skills root:</p>

<pre><code>mkdir -p ~/.openclaw/skills/summarize-client-call/references
cd ~/.openclaw/skills/summarize-client-call
touch SKILL.md references/template.md</code></pre>

<p><strong>3. Write the SKILL.md file.</strong> Paste the example from the anatomy section above, or use the scaffold the CLI ships with:</p>

<pre><code>openclaw skills new summarize-client-call \\
  --description "Turns a raw call transcript into a structured client summary." \\
  --allowed-tools read_file,write_file</code></pre>

<p>The CLI writes a templated <code>SKILL.md</code>, an empty <code>references/</code> directory, and an <code>assets/</code> folder for any images or sample files.</p>

<p><strong>4. Add a template to references.</strong> Drop a markdown file at <code>references/template.md</code> that holds the exact output shape you want. The agent will read it at runtime, so you avoid duplicating the template inside the main SKILL.md:</p>

<pre><code>## Attendees
- &lt;name&gt; (role)

## Context
One paragraph.

## Outcomes
1. ...
2. ...
3. ...

## Action items
| Owner | Action | Due |
| --- | --- | --- |
| ... | ... | ... |

## Next call
Date, channel, goal.
</code></pre>

<p><strong>5. Validate the skill locally:</strong></p>

<pre><code>openclaw skills validate summarize-client-call</code></pre>

<p>The validator checks frontmatter syntax, warns on missing <code>description</code> triggers, and runs a dry-load against the current gateway.</p>

<p><strong>6. Reload the daemon and list loaded skills:</strong></p>

<pre><code>openclaw gateway reload
openclaw skills list --agent my-first-agent</code></pre>

<p>You should see <code>summarize-client-call</code> in the output, tagged with its source path. The gateway only loads frontmatter at this point, so startup time is unaffected.</p>

<p><strong>7. Fire it.</strong> Send the agent a message that matches the trigger in the description:</p>

<pre><code>openclaw chat my-first-agent \\
  "Here's a call transcript from today with Acme Dental. Summarize it."</code></pre>

<p>The agent matches the description, loads the full <code>SKILL.md</code> plus the template, produces the summary, and writes it to <code>./out/acme-dental-2026-04-19.md</code>. If you watch the gateway logs you will see a single "skill:load" event and a "skill:unload" right after the response is returned.</p>

<p>That is the full loop: write markdown, validate, reload, call. No compile step, no deployment, no redeploys across clients. The same skill dropped into a teammate's workspace works identically because the contract is files on disk.</p>

<h2>Progressive disclosure and why the token math works</h2>

<p>Progressive disclosure is the reason skills scale. At agent startup, OpenClaw reads every <code>SKILL.md</code> and indexes only the YAML frontmatter. Typical frontmatter is under 200 tokens. Fifty skills cost around 10,000 idle tokens in context, which is tolerable on any modern model.</p>

<p>When the agent decides to invoke a skill, it pulls the full markdown, any files referenced from the body, and any scripts the body explicitly calls out. Once the turn ends, that material is dropped from the working context. The next unrelated turn starts clean.</p>

<p>This is the same pattern that makes big codebases tractable for agents: keep the index in memory, load the file only when the query matches. It is also why Anthropic's engineering team has said Skills pair cleanly with MCP rather than replacing it. MCP handles discovery and tool invocation for live systems; Skills handle the procedural knowledge the agent applies once a tool is available.</p>

<h2>How OpenClaw resolves bundled, local, and workspace skills</h2>

<p>OpenClaw loads skills from three roots. Understanding the precedence rules prevents a whole class of "why is my skill not firing" support tickets.</p>

<ol>
  <li><strong>Bundled skills</strong> ship inside the <code>@openclaw/cli</code> package. You can point the gateway at a pinned bundled directory using <code>OPENCLAW_BUNDLED_PLUGINS_DIR</code>. These are the defaults everyone gets on install.</li>
  <li><strong>Local skills</strong> live at <code>~/.openclaw/skills</code>. Anything here applies to every agent on the machine and overrides a bundled skill of the same name. Use this for your own reusable workflows.</li>
  <li><strong>Workspace skills</strong> live at <code>~/.openclaw/agents/&lt;agentId&gt;/skills</code>. Anything here applies only to that agent and overrides both bundled and local skills with the same name. Use this for client-specific or project-specific customizations.</li>
</ol>

<p>The agent logs the source path next to each loaded skill so you can tell at a glance which copy won. For white-label agencies running thirty clients on one gateway, the common pattern is: bundled for the baseline, local for the agency house style, workspace for per-client variants. The file layout itself enforces isolation.</p>

<p>To see how this slots into the larger gateway picture, read <a href="/blog/what-is-openclaw-ai-gateway-explained">what OpenClaw actually is</a>.</p>

<h2>Testing, versioning, and shipping a Skill</h2>

<p>Skills are plain files in a git repository. Treat them as code. A team shipping skills to clients usually ends up with a shape like this:</p>

<ul>
  <li>A <code>skills/</code> directory at the root of the agency repo, one subdirectory per skill.</li>
  <li>A <code>tests/</code> directory next to each skill holding sample inputs and expected outputs. The CLI can run these against a lightweight agent loop: <code>openclaw skills test summarize-client-call</code>.</li>
  <li>Pull requests that change a skill's behaviour bump the <code>version</code> field in frontmatter. The registry surfaces this version in the UI, so clients can see when a skill changes underneath them.</li>
  <li>A CI job that validates every skill on every commit. The validator is fast (under a second per skill) so it stays in the pre-commit hook too.</li>
</ul>

<p>For publishing, the open <a href="https://docs.openclaw.ai/tools/skills">OpenClaw skills documentation</a> describes packaging for ClawHub. For private teams, the simplest approach is to keep skills in a shared git repo and install them into <code>~/.openclaw/skills</code> via <code>openclaw skills add &lt;git-url&gt;</code>. The CLI handles the clone, checkout, and symlink steps so that updates are a single <code>git pull</code>.</p>

<h2>When a Skill is not the right tool</h2>

<p>Skills are great at one thing and bad at the opposite of that thing. They encode reusable procedural knowledge. They are the wrong answer when:</p>

<ul>
  <li><strong>The work is one-off.</strong> If you only need the agent to do it once, put the instructions in the chat. A Skill adds friction when it will never be reused.</li>
  <li><strong>The work is mostly a live system call.</strong> If the core of the job is "hit this API and summarize the response", write an MCP server or a tool. Skills should orchestrate tools, not replace them.</li>
  <li><strong>The work branches deeply based on state.</strong> If your procedure has more than two or three decision points that require loading different playbooks, promote each branch to its own skill and route between them with a top-level skill, or reach for a sub-agent.</li>
  <li><strong>The instructions are longer than the task.</strong> If a skill's SKILL.md is 3,000 words long and the output is a two-line confirmation, the skill is doing too much. Break it up or convert the instructions to a real tool.</li>
</ul>

<p>The honest test: if you would not write a Notion doc to describe the procedure, you probably should not write a skill either. Skills reward clarity, not volume.</p>

<h2>Frequently asked questions</h2>

<h3>Do Claude Skills work in OpenClaw without modification?</h3>

<p>Yes. Skills follow the Agent Skills open standard that Anthropic published in December 2025. The <code>SKILL.md</code> contract is identical across Claude Code, Claude Desktop, Cursor, and OpenClaw. A skill you wrote against Claude Code drops into <code>~/.openclaw/skills</code> and loads without changes. Skills that call <code>allowed-tools</code> only work if the host agent actually has those tools, but that is a runtime concern, not a format one.</p>

<h3>How many skills can one agent have before context costs blow up?</h3>

<p>In practice, several hundred. Frontmatter is usually 100 to 200 tokens per skill. Progressive disclosure means the full body never sits in context unless the skill fires. Anthropic's own skills repo at the time of writing ships dozens of skills and runs on every Claude plan. The practical ceiling is discoverability: past 30 or 40 skills, the agent starts to have a harder time picking the right one, so invest in tighter <code>description</code> fields rather than a bigger library.</p>

<h3>Is it safe to install community skills from ClawHub or agentskills.io?</h3>

<p>Treat them like npm packages. Read the SKILL.md before installing. Check what scripts the skill ships and what <code>allowed-tools</code> it requests. The gateway isolates tool execution inside per-agent workspaces, but a skill that runs a shell script still runs with your user's permissions on the host. For anything touching a client workspace, fork the skill into your own repo, audit it, and pin the commit.</p>

<h3>What is the difference between a Skill and a prompt template?</h3>

<p>A prompt template is a string you paste into a conversation. The agent has no awareness of it beyond that one turn. A Skill is a persistent artifact the agent decides to load based on request intent, can reference files from, and can scope tool access inside. Skills are to prompts what functions are to snippets.</p>

<h3>Can a Skill call another Skill?</h3>

<p>Indirectly. A skill's markdown can instruct the agent to invoke another skill by name, and the agent will match the second skill's description and load it for the next turn. There is no direct programmatic import. This is intentional: the agent stays in charge of which skills are active, which keeps context use predictable and matches how progressive disclosure is supposed to work.</p>

<h3>How do I debug a skill that is not firing?</h3>

<p>Three checks. First, run <code>openclaw skills list --agent &lt;id&gt; --verbose</code> and confirm the skill loaded at startup. Second, check that the user message contains at least one phrase from the <code>description</code> field. Third, rerun the turn with <code>OPENCLAW_LOG=debug</code> to see the skill-match decision trace. Most "not firing" issues trace back to a description that is too vague or too narrow.</p>

<h2>Ship the skill, then pick your next one</h2>

<p>Skills are the lowest-friction way to teach an agent a repeatable job that lives in your head today. Write the markdown, validate it, reload the gateway, call it once, correct the description if the match was weak. That loop takes an afternoon. The compounding effect is that a year of those afternoons produces a skill library that becomes your agency's actual operating system.</p>

<p>If you want the OpenClaw gateway, the bundled skill library, and the ClawHub integration wired up for you rather than built by hand, <a href="/solo">Kyra</a> deploys the whole stack on your own domain in about ten minutes. For industry-specific starter skills, see the <a href="/ai-for/dental">dental practice template</a>. For the broader integration picture, Anthropic's own <a href="https://code.claude.com/docs/en/skills">Claude Code skills documentation</a>, the open-source <a href="https://github.com/anthropics/skills">anthropics/skills repository</a>, and the <a href="https://docs.openclaw.ai/tools/skills">OpenClaw skills reference</a> are the three sources worth bookmarking first. Skills are a format, not a feature, and formats outlast the companies that invent them.</p>
`,
  },
  {
    slug: 'mcp-connectors-openclaw-guide-2026',
    title: 'MCP Connectors Explained: How OpenClaw Plugs 10,000+ Tools Into Any AI Agent (2026 Guide)',
    description: 'The Model Context Protocol hit 10,000 public servers and 97 million monthly SDK downloads by March 2026. Here is how MCP connectors actually work, how OpenClaw uses them as both client and server, and a full setup walkthrough.',
    date: '2026-04-17',
    readMins: 14,
    category: 'AI Infrastructure',
    emoji: '🔌',
    content: `
<p><em>Last updated: April 17, 2026</em></p>

<p>A <strong>Model Context Protocol (MCP) connector</strong> is a standardized bridge that lets any AI model read from, write to, and trigger actions on any external tool using a single common wire format. You write the connector once. Every MCP-aware agent can use it. That is why, by March 2026, Anthropic reported <strong>over 10,000 public MCP servers</strong> and <strong>97 million monthly SDK downloads</strong> across Python and TypeScript. MCP turned the mess of one-off API integrations into a lingua franca for agentic software, and OpenClaw plugs directly into the entire ecosystem on day one.</p>

<div style="background:rgba(79,70,229,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px 0;"><strong>Key takeaways</strong></p>
  <ul style="margin:0;">
    <li>MCP is an open protocol Anthropic released in November 2024 and donated to the Linux Foundation (via the Agentic AI Foundation) in December 2025.</li>
    <li>An MCP connector exposes tools, resources, and prompts from a data source to any MCP-aware agent over stdio or HTTP/SSE transport.</li>
    <li>OpenClaw is both an MCP client (it consumes MCP servers) and an MCP server (it exposes OpenClaw tools to outside clients like Claude Desktop).</li>
    <li>Setup is under 10 minutes: add the server to <code>mcp.json</code>, restart the daemon, list the new tools, and the agent can call them.</li>
    <li>Security boils down to allowlists, deny-lists, OAuth where supported, and running untrusted servers in sandboxed containers.</li>
    <li>By March 2026, every major AI provider shipped MCP support. Gartner projects 40% of enterprise apps will embed task-specific AI agents by end of 2026.</li>
  </ul>
</div>

<h2>What Model Context Protocol actually is</h2>

<p>Before MCP, every AI integration looked the same: someone wrote a custom adapter for their favorite tool, then rewrote it three more times for OpenAI, Anthropic, and whatever internal framework was fashionable that quarter. The adapter would break when the API changed, nobody shared code, and every agency running AI for clients maintained its own private stack of tape-and-glue integrations.</p>

<p>MCP replaced that pattern with a single specification. The protocol defines three primitives a server can expose: <strong>tools</strong> the model can call, <strong>resources</strong> the model can read, and <strong>prompts</strong> the model can receive as structured templates. A compliant client speaks this protocol once. Any compliant server plugs in without extra work. Agents, IDEs, assistants, and orchestration layers can all consume the same server.</p>

<p>The protocol itself is transport-agnostic. The two official transports are <code>stdio</code> (the client spawns the server as a subprocess and talks to it over standard input and output) and <code>Streamable HTTP</code> with optional SSE for streaming. Stdio is the default for local tools. HTTP is the default for anything remote or multi-tenant.</p>

<h2>Why MCP exploded in 2025 and 2026</h2>

<p>MCP shipped in November 2024 as a small Anthropic experiment. By April 2025 it was at 8 million cumulative SDK downloads. June 2025 hit 35 million monthly. March 2026 crossed 97 million monthly downloads and 10,000 active public servers. That is one of the fastest adoption curves any developer protocol has ever recorded.</p>

<p>Three forces drove the growth. First, every major AI vendor adopted MCP in the same 12-month window. Second, Anthropic donated the protocol to the Agentic AI Foundation in December 2025, a directed fund under the Linux Foundation co-founded with Block and OpenAI. That removed vendor-control fears and unlocked enterprise procurement. Third, the MCP spec kept shipping: new maintainers like Clare Liguori and Den Delimarsky joined in April 2026, and the 2026 roadmap prioritizes stateless transport, scalable session handling, and multi-server discovery via Server Cards.</p>

<p>The practical effect on agencies and builders: the integration work that used to be the hard part is now table stakes. Hundreds of SaaS vendors ship official MCP servers. Thousands more are community-maintained. Notion, Linear, GitHub, Stripe, Slack, Postgres, Google Drive, Figma, Salesforce, Zendesk, Intercom, Sentry, AWS, Cloudflare, every major CRM, and most databases have a public MCP server you can wire up in minutes.</p>

<h2>How OpenClaw uses MCP (client and server)</h2>

<p>OpenClaw is unusual in the ecosystem because it plays both roles. As an <strong>MCP client</strong>, an OpenClaw agent can consume any external MCP server — the same way Claude Desktop or Cursor does. You add the server to an <code>mcp.json</code> file, the gateway boots it, and the tools appear in the agent's tool list automatically. The agent decides when to call them.</p>

<p>As an <strong>MCP server</strong>, OpenClaw exposes its own internal tools to outside clients. There are two common patterns. First, a loopback bridge lets background Claude CLI runs reach the same tools the main OpenClaw agent has. Second, a remote bridge (the freema/openclaw-mcp project is one implementation) exposes routed channel conversations over MCP so that a Claude Desktop user can talk to a self-hosted OpenClaw assistant with OAuth2 authentication. See <a href="https://docs.openclaw.ai/cli/mcp">the OpenClaw MCP CLI docs</a> for the current reference.</p>

<p>Being both sides of the protocol matters because it lets a single OpenClaw gateway act as the integration layer for a whole agency. Thirty clients, each with their own session, all share the same pool of MCP connectors. You maintain one CRM connector, not thirty. For how this fits into the broader gateway design, read <a href="/blog/what-is-openclaw-ai-gateway-explained">what OpenClaw actually is</a>.</p>

<h2>Stdio vs HTTP/SSE: picking a transport</h2>

<p>Most teams get this wrong the first time. Stdio connectors spawn a subprocess on the same machine as the gateway and communicate over pipes. They are fast, private, and have no network surface. But they cannot be shared across gateways, they die when the gateway restarts, and they are awkward to scale horizontally. HTTP/SSE connectors run as independent services anywhere on the network. They can be load-balanced, authenticated with OAuth, and shared by every gateway in an estate. But they add latency and require actual ops work.</p>

<p>The rough rule:</p>

<ul>
  <li><strong>Use stdio</strong> for local-first tools: reading the filesystem, shelling out to a CLI, hitting a local Postgres, scraping a page, controlling a local Chrome instance.</li>
  <li><strong>Use HTTP/SSE</strong> for anything multi-tenant, anything with OAuth, anything that already runs as a service, and anything that needs to be reachable from more than one OpenClaw node.</li>
</ul>

<p>The MCP maintainer team is actively reshaping the HTTP transport in the 2026 roadmap to behave correctly behind load balancers and survive server restarts without losing session state. That work is tracked in the <a href="https://modelcontextprotocol.io/development/roadmap">official MCP roadmap</a>.</p>

<h2>Step-by-step: add your first MCP server to OpenClaw</h2>

<p>This walkthrough wires up a common example: a GitHub MCP server so the agent can open issues, review pull requests, and search code. It takes about eight minutes on a fresh OpenClaw install.</p>

<p><strong>1. Install OpenClaw if you have not already.</strong> Any Linux, macOS, or WSL box with Node.js 22 or newer works:</p>

<pre><code>npm install -g @openclaw/cli
openclaw init
openclaw gateway start</code></pre>

<p><strong>2. Open your agent workspace.</strong> Every agent has a workspace directory at <code>~/.openclaw/agents/&lt;agentId&gt;</code>. The MCP config lives there:</p>

<pre><code>cd ~/.openclaw/agents/my-first-agent
ls mcp.json 2&gt;/dev/null || echo '{ "servers": {} }' &gt; mcp.json</code></pre>

<p><strong>3. Add the server block.</strong> Edit <code>mcp.json</code> to register the GitHub server:</p>

<pre><code>{
  "servers": {
    "github": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}</code></pre>

<p><strong>4. Reload the agent.</strong> The gateway picks up new connectors on reload:</p>

<pre><code>openclaw agents reload my-first-agent
openclaw mcp list my-first-agent</code></pre>

<p>You should see the GitHub tools appear: <code>search_code</code>, <code>create_issue</code>, <code>list_pull_requests</code>, and a dozen more.</p>

<p><strong>5. Test in the agent.</strong> Send a message over any connected channel:</p>

<blockquote>"Find open issues in openclaw/openclaw labeled <code>good-first-issue</code> and summarize them."</blockquote>

<p>The agent will call <code>github.list_issues</code> with the label filter, read the results, and reply with a summary. That is a full MCP round trip on a live production connector.</p>

<p><strong>6. Lock down permissions.</strong> By default the agent can call any tool the MCP server exposes. For safety in client-facing deployments, add an allowlist in the agent's config:</p>

<pre><code>openclaw agents edit my-first-agent \\
  --allow "github.search_code,github.list_issues,github.list_pull_requests" \\
  --deny "github.delete_repository"</code></pre>

<p>Now the agent can read your repositories but cannot delete anything. The full permission model is documented in the <a href="https://docs.openclaw.ai">OpenClaw docs</a>, and if you want an end-to-end example using the same pattern for a law firm, see <a href="/ai-for/law-firm">our law firm AI worker template</a>.</p>

<h2>MCP connectors vs custom plugins vs raw API calls</h2>

<p>Agencies shipping AI to clients have three realistic ways to plug an agent into an external tool. Each has a place. Picking the wrong one wastes weeks.</p>

<table>
  <thead>
    <tr>
      <th>Dimension</th>
      <th>MCP connector</th>
      <th>Custom OpenClaw plugin</th>
      <th>Raw API call from agent</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Setup time</td>
      <td>Minutes (if server exists)</td>
      <td>Hours to days</td>
      <td>Hours (prompt-engineered)</td>
    </tr>
    <tr>
      <td>Reusable across agents</td>
      <td>Yes, any MCP client</td>
      <td>Yes, within OpenClaw</td>
      <td>No, per-prompt</td>
    </tr>
    <tr>
      <td>Works outside OpenClaw</td>
      <td>Yes (Claude Desktop, Cursor, Windsurf)</td>
      <td>No</td>
      <td>No</td>
    </tr>
    <tr>
      <td>Schema discovery</td>
      <td>Automatic</td>
      <td>Defined in plugin manifest</td>
      <td>Manual, in prompt</td>
    </tr>
    <tr>
      <td>Auth pattern</td>
      <td>OAuth / env / headers</td>
      <td>OpenClaw vault</td>
      <td>Whatever you inject</td>
    </tr>
    <tr>
      <td>When to use</td>
      <td>Standard SaaS tools</td>
      <td>Agency-specific business logic</td>
      <td>One-off prototypes</td>
    </tr>
  </tbody>
</table>

<p>The short answer most agencies land on: MCP connectors for anything vendors already ship (CRMs, databases, dev tools, file storage), custom plugins for the one or two pieces of logic that are actually your moat, and raw API calls only for quick prototypes. The longer you run an agency, the more of your stack ends up as stock MCP connectors — and that is the healthy outcome.</p>

<h2>The MCP connectors every agency should know</h2>

<p>Out of 10,000 public servers, a short list covers 80% of real agency work. These are the ones worth wiring up on day one:</p>

<ul>
  <li><strong>GitHub.</strong> Issues, pull requests, code search, file contents. The starter connector for every technical team.</li>
  <li><strong>Postgres / MySQL / SQLite.</strong> Read-only query access to your operational database. Pair with a strict allowlist.</li>
  <li><strong>Slack.</strong> Post messages, read channels, react to threads. Not a chatbot replacement — an action surface.</li>
  <li><strong>Stripe.</strong> Customer lookup, charge history, subscription status. Gold for billing support agents.</li>
  <li><strong>Notion or Linear.</strong> Plan work, file tickets, update docs. Most agencies pick one.</li>
  <li><strong>Google Drive or Dropbox.</strong> Read-only access to client docs for retrieval-augmented answering.</li>
  <li><strong>Browser (via Chrome MCP).</strong> Fills the long tail when no first-party server exists. OpenClaw v2026.3.23 shipped major reliability fixes to the browser attach path.</li>
  <li><strong>GHL / HubSpot / Salesforce.</strong> Contact records, deal pipelines, workflow triggers. Read our <a href="/blog/ghl-ai-employee-complete-guide">GHL AI worker guide</a> for the end-to-end pattern.</li>
</ul>

<p>Wiring all eight takes an afternoon. The same eight connectors, shared across every client agent on the same gateway, is the backbone of a production agency stack in 2026.</p>

<h2>Security: the part most people get wrong</h2>

<p>MCP gives an agent tools. Tools execute real actions. Treating that casually is how data leaks happen. Four rules cover most of the risk.</p>

<p><strong>1. Allowlist by default, not denylist.</strong> It is easier to add a tool an agent needs than to remove one it should not have. Start with zero tools allowed, add the specific tool names the use case requires.</p>

<p><strong>2. Never run untrusted servers in the main gateway process.</strong> A community MCP server is arbitrary code. If you do not know the author, run it in an isolated container with its own network, no filesystem access outside a scratch directory, and no access to gateway secrets.</p>

<p><strong>3. Use OAuth where the server supports it.</strong> Static tokens in <code>mcp.json</code> are fine for local dev, terrible for production. OAuth means the user authorizes exactly the scopes the agent needs, and tokens can be revoked without redeploying.</p>

<p><strong>4. Monitor every tool call.</strong> OpenClaw writes every MCP call to the agent's session JSONL. Forward those logs somewhere you will actually read them. The cheap version is a nightly cron that greps for high-risk tool names (anything with <code>delete</code>, <code>write</code>, or <code>transfer</code>) and emails the summary.</p>

<p>For regulated industries this is not optional. A dental practice running an AI receptionist over MCP connectors needs a documented permission posture before the HIPAA officer will sign off. Our guide on <a href="/blog/ai-for-dental-practices">AI for dental practices</a> covers that specific posture.</p>

<h2>When MCP is not the right choice</h2>

<p>MCP is not the answer to every integration question. Three cases where reaching for it is the wrong instinct.</p>

<p><strong>Real-time, sub-second control loops.</strong> MCP is request-response with some streaming. If you are building a trading system or a realtime game agent, the protocol overhead will dominate. Talk directly to the underlying API.</p>

<p><strong>High-volume background data movement.</strong> If the job is moving a million rows a night from Salesforce to Snowflake, write an ETL pipeline. Do not have an agent iterate through it.</p>

<p><strong>Logic that is genuinely yours.</strong> If the "tool" is 40 lines of your company's pricing logic, that belongs in a custom OpenClaw plugin or a small internal service. MCP adds no value for something only your agent will ever call.</p>

<p>A clean mental model: MCP is the right choice when the tool already exists or could reasonably exist as a general-purpose product. It is the wrong choice when the tool is really just a piece of your business logic wearing a protocol costume.</p>

<h2>Frequently asked questions</h2>

<h3>Is MCP production-ready in 2026?</h3>
<p>Yes, with care. The spec is stable, the major SDKs are reliable, and enterprise adoption is real. The sharp edges are still in the HTTP transport (stateful sessions behind load balancers) and server discovery, both of which are explicitly on the 2026 roadmap. Stdio-based local connectors have been production-ready since early 2025.</p>

<h3>Do I need OpenClaw to use MCP?</h3>
<p>No. MCP is an open protocol. Claude Desktop, Cursor, Windsurf, and dozens of other clients consume MCP servers. OpenClaw is specifically useful when you want one gateway serving many clients and channels, rather than a single developer using a single IDE.</p>

<h3>Can one MCP server be used by many agents at once?</h3>
<p>Yes. That is the point. A single GitHub or Postgres MCP server on your network can be a tool source for every agent on every gateway in your estate. Stdio servers are per-process; HTTP servers are shared.</p>

<h3>How does MCP handle authentication?</h3>
<p>Three patterns. Static tokens in environment variables (simplest, least secure). Header-based auth on HTTP transport (good for service-to-service). OAuth 2.1 with the DPoP extension being proposed in 2026 (best for user-authorized access). Pick based on who the agent is acting on behalf of.</p>

<h3>What happens if an MCP server goes down?</h3>
<p>The tool disappears from the agent's available tool list until the server returns. A well-written agent handles the missing tool gracefully — it falls back to asking the user or using a different path. A poorly written prompt pretends the tool is still there and hallucinates the result. Test the degraded-mode path before shipping.</p>

<h3>Does MCP work with non-Anthropic models?</h3>
<p>Yes. The protocol is model-agnostic. OpenAI, Google, Mistral, and open-weights models via tool-calling all consume MCP servers through the same OpenClaw client layer. The "Model" in "Model Context Protocol" refers to any language model, not Anthropic specifically.</p>

<h2>The bottom line</h2>

<p>Two years ago the hard part of agentic software was the integration work. Every agency had its own sprawling collection of API adapters, and every client engagement started with another adapter rewrite. In 2026 that problem is mostly solved. MCP turned integration into a shared commons. OpenClaw turned it into something an agency can operate at scale: one gateway, one pool of connectors, every client isolated, every tool reusable.</p>

<p>If you want to run this stack yourself, the <a href="https://github.com/openclaw/openclaw">openclaw/openclaw repo</a> is the right starting point, and the official <a href="https://modelcontextprotocol.io/development/roadmap">MCP roadmap</a> is worth subscribing to. If you want the same architecture without the ops work, <strong>Kyra</strong> runs a hosted OpenClaw gateway with a curated MCP connector library, session isolation per client, and permission presets that match real agency workflows. Our <a href="/solo">solo plan</a> is free during beta so you can wire up your first three MCP connectors without a credit card. Our team has deployed this pattern across agencies ranging from two-person shops to 50-client white-label operators, and the playbook works the same in both places.</p>
`,
  },
  {
    slug: 'openclaw-agent-vs-chatbot-capabilities',
    title: '6 Things an OpenClaw AI Agent Can Do That a Chatbot Can\'t (2026 Guide)',
    description: 'OpenClaw agents browse the live web, run code, read files, remember past conversations, fire webhooks, and spawn sub-agents. Here\'s what each capability does, how it works, and how to set it up in under 15 minutes.',
    date: '2026-04-17',
    readMins: 13,
    category: 'AI Infrastructure',
    emoji: '🛠️',
    content: `
<p><em>Last updated: April 17, 2026</em></p>

<p>An <strong>OpenClaw AI agent</strong> is an open-source, self-hosted AI worker that can do six things a typical chatbot cannot: browse the live web, read and write files, execute real code, search memory from past conversations, fire emails and webhooks, and delegate complex work to sub-agents. These capabilities ship out of the box — no plugins, no custom code, no orchestration layer. This guide explains each one, shows a real example of what it enables, and walks through the setup in under fifteen minutes.</p>

<div style="background:rgba(79,70,229,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px 0;"><strong>Key takeaways</strong></p>
  <ul style="margin:0;">
    <li>A chatbot responds to text. An AI agent has six tool categories that let it actually do the work.</li>
    <li>OpenClaw ships with 60+ built-in tools covering web, files, code, memory, actions, and multi-agent coordination.</li>
    <li>The community ClawHub registry adds thousands of additional skills contributed by agencies running this in production.</li>
    <li>Setup takes under 15 minutes on any machine that runs Node.js 22 or later.</li>
    <li>The architecture is MIT-licensed, self-hosted, and works with Claude, GPT, Gemini, and 50+ other models.</li>
  </ul>
</div>

<h2>Why "chatbot" and "AI agent" are different things</h2>

<p>Most software called "AI" in 2026 is still a text interface in front of a language model. You type a question, the model replies, the interaction ends. The model does not open a browser, does not touch your files, does not run any code, and does not remember you the next time you come back. It is a chatbot.</p>

<p>An AI agent is the same language model connected to tools. Those tools let the model take actions in the real world: read a webpage, write a file, execute a query, send an email, call another agent. Without tools, a language model is a very articulate pattern-matcher. With tools, it is a worker.</p>

<p>OpenClaw is an open-source framework that gives any language model the full toolkit. It runs as a single daemon on your hardware, connects to messaging channels like WhatsApp, Slack, and Discord, and routes user messages to the agent along with access to all its tools. For the full architecture, see our guide on <a href="/blog/what-is-openclaw-ai-gateway-explained">what OpenClaw actually is</a>.</p>

<p>The six capability categories below are what that toolkit enables. Every one is built in. You do not install anything to get them.</p>

<h2>1. Browse the web and pull live data</h2>

<p>The first thing a real AI agent does that a chatbot cannot: look at the live internet. Language models are frozen at their training cutoff. OpenClaw agents have a built-in browser tool powered by Chromium plus a web-search tool that integrates with more than ten search providers — Google, Bing, Brave, Kagi, SerpAPI, and others. The agent can open a page, read its content, fill out a form, click a button, or extract structured data.</p>

<p><strong>Real examples:</strong></p>
<ul>
  <li>Pull today's competitor pricing from three different websites, compare, and report the deltas every morning at 6am.</li>
  <li>Verify a stat before citing it in a reply. If the claim is wrong, the agent says so.</li>
  <li>Read a news article the user just linked, summarize the relevant points, and pull out action items.</li>
  <li>Check if a lead's business is still operating before the sales team calls.</li>
  <li>Scrape a product page and extract specs, warranty info, and shipping details.</li>
</ul>

<p>The key difference from a generic "search plugin": the agent chooses when to search, what to search, and how to interpret the result. It does not blindly forward your query to Google. It reasons about whether live data is needed, fetches it, and integrates it into the answer.</p>

<h2>2. Read, write, edit, and analyze files</h2>

<p>An OpenClaw agent has four file tools — <code>read</code>, <code>write</code>, <code>edit</code>, and <code>apply_patch</code> — that operate on files inside a workspace directory on your machine. The workspace is the agent's <code>cwd</code>: a folder you control, where your files live, and where the agent's outputs land.</p>

<p><strong>Real examples:</strong></p>
<ul>
  <li>Summarize a 40-page PDF contract and flag clauses that need legal review.</li>
  <li>Clean up a messy CSV export — drop duplicates, fix encoding, normalize column names — and save a clean version.</li>
  <li>Rewrite a long proposal document in a different tone, saving as a new version without touching the original.</li>
  <li>Compare two versions of a document and list the diffs.</li>
  <li>Analyze a folder of raw data files and generate a weekly report.</li>
</ul>

<p>Critically, your files stay on your disk. OpenClaw is self-hosted: nothing is uploaded to a cloud service for processing. The agent reads from local paths and writes to local paths. That matters for regulated businesses — dental, legal, medical, financial — where shipping patient or client data to a third-party SaaS violates compliance requirements.</p>

<h2>3. Run code and return real results</h2>

<p>This is the capability that separates a chatbot from an analyst. OpenClaw agents have two execution tools: one for shell commands, one for sandboxed Python. When the agent needs to compute something, it does not guess. It writes code, runs it, and returns the actual output.</p>

<p><strong>Real examples:</strong></p>
<ul>
  <li>Run a Python script against a CSV and return summary stats — mean, median, percentiles — with actual numbers.</li>
  <li>Execute a SQL query against your database and report the result.</li>
  <li>Call your API endpoint and tell you what response it received, including the status code and headers.</li>
  <li>Transform a spreadsheet with pandas and write the cleaned output to disk.</li>
  <li>Test a regex against your sample inputs to confirm it catches what you want.</li>
</ul>

<p>The difference this makes is qualitative, not quantitative. When a chatbot says "your conversion rate is approximately 3.2%", that number was generated by pattern-matching — it may or may not be correct. When an agent says it, the number came from running the calculation. The agent can show you the code it ran, the data it read, and the output it got.</p>

<p>For sensitive commands, the execution tool respects a permissions system. You can restrict the agent to a specific set of commands, a specific working directory, or require explicit approval for anything destructive. The <a href="https://docs.openclaw.ai">OpenClaw documentation</a> covers tool allow and deny lists in detail.</p>

<h2>4. Search memory from past conversations</h2>

<p>The single biggest reason chatbots feel broken is that they forget you the second the conversation ends. OpenClaw agents do not. Every conversation is stored as a session file in JSONL format at <code>~/.openclaw/agents/&lt;agentId&gt;/sessions/&lt;sessionId&gt;.jsonl</code>. The agent has two memory tools — <code>memory_search</code> and <code>memory_get</code> — that search across all past sessions.</p>

<p><strong>Real example conversation:</strong></p>

<blockquote>
<p><strong>Customer (one week later):</strong> Hey, I'm back.</p>
<p><strong>Agent:</strong> Welcome back, Sarah. Last time you were weighing the 3-bedroom versus the 2-bedroom with the garage. Did you decide?</p>
</blockquote>

<p>That is not a scripted flow. The agent searched its memory for prior sessions with this user, found the relevant thread, extracted the open decision, and brought it up. Session management, memory search, and recall all work out of the box.</p>

<p>There is also an optional <strong>active memory</strong> sub-agent that runs before every reply, searches memory for anything relevant, and surfaces it so the main agent can reference it naturally. Six prompt modes are available — balanced, strict, recall-heavy, precision-heavy, contextual, preference-only — so you can tune how aggressively memory gets injected.</p>

<p>Older turns in very long sessions are automatically compacted into summary entries (the built-in <strong>compaction</strong> system), which keeps the token bill down without losing continuity. <a href="/blog/what-is-openclaw-ai-gateway-explained">The architecture guide</a> goes deeper into this.</p>

<h2>5. Send emails, book calendar slots, and trigger webhooks</h2>

<p>Where most chatbots stop, an agent finishes the job. After a conversation ends, an OpenClaw agent can fire any number of post-conversation actions: email a summary, book a calendar slot, drop a message in another channel, fire a webhook into Zapier or n8n, update a CRM, schedule a follow-up via the built-in <code>cron</code> tool.</p>

<p><strong>Real workflow:</strong></p>
<ol>
  <li>A patient texts a dental practice at 9pm asking about insurance and availability.</li>
  <li>The agent answers the insurance question (by searching the uploaded coverage document), offers three appointment times based on Google Calendar availability, and confirms the booking.</li>
  <li>After the conversation ends, the agent emails the office manager a summary, creates the appointment on the shared calendar, tags the patient in the CRM as "new-booking," and schedules a reminder for the next morning.</li>
</ol>

<p>None of that requires an external automation tool. It is all built into the OpenClaw messaging, webhook, and cron systems. For the full automation stack, see the <a href="https://docs.openclaw.ai">docs on hooks, cron, and tasks</a>. For how this workflow plays out in a real dental practice deployment, see our <a href="/blog/ai-for-dental-practices">dental AI guide</a>.</p>

<h2>6. Call sub-agents to split complex tasks</h2>

<p>One agent can only hold so much context at once. When a task has multiple parallel parts, OpenClaw lets the main agent spawn specialist sub-agents, each with its own context window, tool allowlist, and workspace. The main agent orchestrates. The sub-agents focus.</p>

<p><strong>Real workflow:</strong></p>

<p>A patient asks a dental practice AI: "Does my insurance cover a cleaning this week, and can anyone do an emergency filling today?"</p>

<p>Instead of juggling three lookups in one context, the main agent delegates:</p>

<ul>
  <li><strong>Sub-agent 1:</strong> Look up insurance coverage across the practice's 12 supported providers.</li>
  <li><strong>Sub-agent 2:</strong> Check today's calendar for any emergency slot.</li>
  <li><strong>Sub-agent 3:</strong> Pull the current pricing for cleanings and fillings, including any active promotions.</li>
</ul>

<p>All three run in parallel. They report back. The main agent composes a single clean reply with all three answers. This pattern scales: an agency that handles support, sales, and ops from one inbox can use sub-agent routing to give each lane its own specialist brain without running three separate chatbots.</p>

<p>Each sub-agent has isolated context (no cross-contamination), its own tool permissions (the support sub-agent does not have access to the billing API), and its own session (audit trails stay clean).</p>

<h2>The 6 capabilities side-by-side</h2>

<table>
  <thead>
    <tr>
      <th>Capability</th>
      <th>Tools Used</th>
      <th>What It Enables</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Browse the web</td>
      <td><code>browser</code>, <code>web_search</code></td>
      <td>Live data, competitor checks, stat verification</td>
    </tr>
    <tr>
      <td>Read/write/edit files</td>
      <td><code>read</code>, <code>write</code>, <code>edit</code>, <code>apply_patch</code></td>
      <td>Document work on your own disk, self-hosted</td>
    </tr>
    <tr>
      <td>Run code</td>
      <td><code>exec</code>, <code>code_execution</code></td>
      <td>Real computation, SQL, API calls, data transforms</td>
    </tr>
    <tr>
      <td>Search memory</td>
      <td><code>memory_search</code>, <code>memory_get</code></td>
      <td>Returning-customer recognition, persistent context</td>
    </tr>
    <tr>
      <td>Actions &amp; webhooks</td>
      <td><code>message</code>, <code>cron</code>, webhook tools</td>
      <td>Email, calendar, CRM updates, scheduled follow-ups</td>
    </tr>
    <tr>
      <td>Sub-agents</td>
      <td><code>sessions_spawn</code>, <code>subagents</code></td>
      <td>Parallelized specialist workflows</td>
    </tr>
  </tbody>
</table>

<h2>How to set up an OpenClaw agent with all 6 capabilities in 15 minutes</h2>

<p>The full six-capability toolkit is available the moment the gateway starts. There is no "install tool pack" step. Here is the minimum-viable setup.</p>

<h3>Step 1. Install OpenClaw</h3>

<pre><code>npm install -g openclaw@latest</code></pre>

<p>Requires Node.js 22.14 or later. The recommended version is Node 24.</p>

<h3>Step 2. Run the onboarding wizard</h3>

<pre><code>openclaw onboard --install-daemon</code></pre>

<p>This prompts for a model provider API key (Anthropic, OpenAI, Google, OpenRouter, Ollama, and fifty-plus others supported), creates your workspace at <code>~/.openclaw/workspace</code>, and installs the daemon as a system service (launchd on macOS, systemd on Linux, Scheduled Task on Windows).</p>

<h3>Step 3. Verify the built-in tools</h3>

<pre><code>openclaw cli tools list</code></pre>

<p>You should see 60+ tools listed. All six capability categories are represented: browser, file I/O, exec, memory, messaging, sub-agent spawning, plus tools for media generation, cron, and more.</p>

<h3>Step 4. Open the dashboard and test</h3>

<pre><code>openclaw dashboard</code></pre>

<p>This launches the Control UI at <code>http://127.0.0.1:18789</code>. Send the agent a test message that exercises a tool — "What's the current weather in San Francisco?" forces a web search. "Run ls ~/Documents" forces a shell exec (with appropriate permissions). You will see the tool invocations in the agent's reasoning trace.</p>

<h3>Step 5. Connect a messaging channel</h3>

<p>Telegram is the fastest channel to configure: create a bot with <code>@BotFather</code>, paste the token into <code>~/.openclaw/openclaw.json</code> under <code>channels.telegram.botToken</code>, add your username to <code>channels.telegram.allowFrom</code>, and restart the gateway. The agent will start replying to your messages from your phone within seconds.</p>

<h2>Frequently asked questions</h2>

<h3>Do I need to know how to code to use this?</h3>

<p>No. The built-in tools work through natural-language instructions. You tell the agent what you want ("pull the competitor prices this morning") and it picks the right tools to accomplish it. You only need to edit config files — no programming.</p>

<h3>What does this cost to run?</h3>

<p>OpenClaw itself is free (MIT licensed, open source). The only cost is the model API token usage for your chosen provider. A busy agent running on Claude Sonnet typically costs $5–$30 per month in API fees at moderate conversation volume. If you use a local model via Ollama, that cost is zero.</p>

<h3>Is this secure for regulated industries?</h3>

<p>The gateway binds to loopback (<code>127.0.0.1</code>) by default, meaning only your local machine can talk to it. For remote access, the recommended pattern is Tailscale or an SSH tunnel, not public internet ingress. Files stay on your disk. Sessions stay on your disk. The full security model uses MITRE ATLAS terminology and is documented in the project's threat model.</p>

<h3>Can I run multiple agents with different tool permissions?</h3>

<p>Yes. OpenClaw supports multi-agent deployment on one gateway. Each agent has its own workspace, its own tool allow/deny lists, its own sessions, and its own routing bindings. A customer support agent can have browser and memory access but no shell exec. A personal productivity agent can have full access. They run on the same gateway without cross-contamination.</p>

<h3>How does this compare to building on the OpenAI Assistants API or similar?</h3>

<p>OpenAI's Assistants API gives you a hosted agent runtime tied to OpenAI's models and infrastructure. OpenClaw gives you a self-hosted agent runtime with model-agnostic design — you can swap between Claude, GPT, Gemini, local models, and others with a config change. You control where the data lives, what tools are available, and how the agent is deployed.</p>

<h3>What about the skills ecosystem?</h3>

<p>The six capabilities above are built-in tools. On top of those, OpenClaw supports <strong>Skills</strong> — markdown instruction files that teach the agent repeatable workflows. The community ClawHub registry hosts thousands of published skills covering ads management, CRM automation, research workflows, and more. Skills load per-workspace, per-user, or globally, and you can write your own by dropping a markdown file in the skills folder.</p>

<h2>When OpenClaw is probably overkill for you</h2>

<p>Not every use case needs a self-hosted agent. OpenClaw is the wrong choice if:</p>

<ul>
  <li>You just need a FAQ chatbot on one page of your website. A lighter tool will do.</li>
  <li>You have no model API key and no interest in getting one.</li>
  <li>You are not comfortable editing a config file or running a command-line install.</li>
  <li>You need zero-setup, click-and-deploy with no configuration at all.</li>
</ul>

<p>For that last group, a managed platform that wraps OpenClaw makes more sense than running it directly. That is the space <a href="https://kyra.conversionsystem.com">Kyra</a> occupies: agencies use it to deploy isolated OpenClaw containers for each of their clients without touching infrastructure. Each client gets their own agent, their own workspace, their own memory — and the agency manages everything from one dashboard. The architecture is identical; the operational overhead is zero.</p>

<h2>The bigger point</h2>

<p>The gap between "AI chatbot" and "AI worker" is exactly this toolkit. A chatbot responds. An agent executes. The difference is not the model. It is what the model can reach.</p>

<p>OpenClaw ships the toolkit free and open source. You get six capability categories, sixty-plus tools, and a community registry of thousands of additional skills — all in fifteen minutes of setup.</p>

<p>Most businesses are still running chatbots. The ones that switched to agents are closing tickets, booking appointments, qualifying leads, and running reports while their teams sleep. The technology gap is real. The setup gap is small.</p>

<p>Want the full breakdown of what OpenClaw is before you install it? Start with our guide on <a href="/blog/what-is-openclaw-ai-gateway-explained">what OpenClaw actually is</a>. Ready to deploy it for clients without the DevOps burden? <a href="/solo">Start with Kyra Solo</a> — free, no credit card, first agent live in under two minutes.</p>

<p>External references: <a href="https://github.com/openclaw/openclaw">OpenClaw on GitHub (MIT licensed)</a> · <a href="https://docs.openclaw.ai">Official OpenClaw documentation</a> · <a href="https://modelcontextprotocol.io">Model Context Protocol (MCP) specification</a> · <a href="https://docs.anthropic.com">Anthropic Claude documentation</a>.</p>
`,
  },
  {
    slug: 'ghl-ai-employee-agency',
    title: 'How to Add an AI Worker to Every GHL Client (2026 Agency Guide)',
    description: 'A practical guide for GoHighLevel agencies on deploying AI workers to client sub-accounts. Covers what an AI worker is, how it connects to GHL, pricing frameworks, and the 5-step setup.',
    date: '2026-02-22',
    readMins: 10,
    category: 'Agency Growth',
    emoji: '🚀',
    content: `
<p><em>Last updated: April 17, 2026</em></p>

<p>An <strong>AI worker for GHL</strong> is an autonomous AI agent that connects to a GoHighLevel sub-account via a Private Integration Token and handles inbound conversations across SMS, WhatsApp, Instagram, Facebook, Live Chat, email, and Google My Business — 24/7, in under 60 seconds per reply, without staff involvement. This guide explains what an AI worker actually does, how it plugs into GHL, how agencies typically structure the offering, and how to go live on your first client in under 15 minutes.</p>

<div style="background:rgba(79,70,229,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px 0;"><strong>Key takeaways</strong></p>
  <ul style="margin:0;">
    <li>An AI worker is a full agent (not a chatbot) that reads conversations, executes tool calls, updates the CRM, and books appointments.</li>
    <li>It connects to any GHL sub-account via a Private Integration Token — no marketplace, no OAuth app, no waiting.</li>
    <li>Typical agency retainer pricing: $500 to $2,000/month per client depending on vertical and volume.</li>
    <li>Setup takes under 15 minutes per client once your agency is configured.</li>
    <li>All seven GHL conversation channels are covered: SMS, WhatsApp, Instagram, Facebook Messenger, Live Chat, email, Google My Business.</li>
  </ul>
</div>

<p>Most GHL agencies have the same problem. You charge a setup fee, maybe a retainer, and then the relationship goes quiet. The client stops replying. Revenue stagnates.</p>

<p>Adding an AI worker to every client solves two problems at once: it gives your client measurable, ongoing value (so they stop churning), and it creates a new recurring revenue line for your agency that scales without hiring.</p>

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

<p>You already have the infrastructure. GHL gives you the CRM, the pipelines, the phone numbers, and the messaging channels. An AI worker plugs directly into your existing GHL setup using a Private Integration Token — no OAuth approval, no marketplace hurdles.</p>

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

<p>At 10 clients charging $800/month each: $8,000/month in recurring revenue. At 20 clients: $16,000/month. The pro plan handles 10 clients at $299/month — your gross margin is 96% before API costs.</p>

<h2>The Competitive Moat</h2>

<p>Once your client's AI worker is live and working, they won't want to turn it off. The AI builds up conversation history, learns the business's tone, and becomes genuinely useful over time. Churn on a working AI worker is near zero.</p>

<p>Every booking it makes, every lead it handles, every CRM update it logs — that's value your client can see. It's not abstract "automation." It's results they can count.</p>

<h2>Why AI workers dramatically reduce agency client churn</h2>

<p>The average agency loses 30 to 50 percent of its client base annually. Clients churn when they stop seeing measurable results — which happens with ads when ROAS drops, with SEO when rankings plateau, and with website work when the project ends.</p>

<p>AI workers behave differently. Three structural factors keep churn near zero once the AI is live:</p>

<ul>
  <li><strong>Daily visible value.</strong> The AI runs every day. Clients see conversation logs, response times, and booked appointments without waiting 90 days for a ranking report or an ad performance review.</li>
  <li><strong>Compounding institutional knowledge.</strong> The AI learns the business's vocabulary, pricing, objections, and typical conversation flows over months. Switching to a new system means retraining from scratch — a switching cost that compounds every month the AI runs.</li>
  <li><strong>CRM dependency.</strong> Once the AI is writing contact notes, updating pipeline stages, and tagging leads by conversation content, the client's GHL data depends on the AI staying active. Turning it off breaks the CRM automation they have built their operations around.</li>
</ul>

<p>Compare that to an ad campaign or a monthly SEO report. An AI worker that books three appointments a week is not abstract value. It is a line item the client can point to on a Monday morning. That is why agencies running AI workers consistently see 12-month retention rates well above 80 percent — versus 30 to 50 percent on most other service lines.</p>

<p>For the broader business model behind this service line, see our <a href="/blog/agency-recurring-revenue-ai">agency recurring revenue guide</a>.</p>

<h2>How AI workers compare to GHL workflow automations</h2>

<p>GHL's native workflow automations are a powerful tool, but they're a different kind of tool. Here's how to think about them:</p>

<table>
  <thead>
    <tr>
      <th>Capability</th>
      <th>GHL Workflow Automation</th>
      <th>AI Worker</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Reply to a generic inquiry</td>
      <td>Matches keywords, sends templated reply</td>
      <td>Reads context, writes an original reply</td>
    </tr>
    <tr>
      <td>Handle off-script questions</td>
      <td>Falls back to default or staff</td>
      <td>Composes a contextual answer</td>
    </tr>
    <tr>
      <td>Book an appointment</td>
      <td>Via calendar-link trigger</td>
      <td>Checks availability, offers times, confirms</td>
    </tr>
    <tr>
      <td>Update pipeline stage</td>
      <td>Rule-based on trigger events</td>
      <td>Decides based on conversation content</td>
    </tr>
    <tr>
      <td>Escalate to a human</td>
      <td>Only if explicitly configured</td>
      <td>Detects frustration or complexity automatically</td>
    </tr>
  </tbody>
</table>

<p>They work together. Workflows handle deterministic paths (opt-outs, appointment reminders, drip sequences). AI workers handle the open-ended conversations workflows can't model.</p>

<h2>Frequently asked questions</h2>

<h3>Do I need my client to be on a specific GHL plan?</h3>

<p>Any GHL sub-account that supports Private Integration Tokens works. That's the standard SaaS and Pro plans at the time of writing. Check the official <a href="https://help.gohighlevel.com">GoHighLevel documentation</a> for current plan features if you need to confirm.</p>

<h3>How long does it take to onboard a new client?</h3>

<p>Under 15 minutes per client once your agency account is set up. The steps: create the client in your dashboard, pick an industry template, paste the GHL Private Integration Token, customize the personality file, and go live. The AI starts responding to new inbound messages within 60 seconds of activation.</p>

<h3>What happens if the AI doesn't know an answer?</h3>

<p>The agent is configured to escalate rather than hallucinate. If a customer asks something outside the knowledge base, the AI either asks a clarifying question or tags the conversation for human follow-up. Escalation rules are configurable per client — some agencies set hard rules (medical questions, legal questions, refund requests) that always route to a human.</p>

<h3>Which GHL channels does this cover?</h3>

<p>All seven conversation channels GHL supports: SMS, WhatsApp, Instagram DM, Facebook Messenger, Live Chat, email, and Google My Business. The AI sees everything in the unified GHL conversations inbox and responds through whichever channel the customer used.</p>

<h3>Can I white-label this for my agency?</h3>

<p>Yes. The client never sees the underlying platform. The AI has whatever name you configure (Alex, Maya, Jordan). The dashboard is your branded portal. The conversations appear to come from the client's business. See our <a href="/blog/white-label-ai-platform-agencies">white-label deployment guide</a> for the full setup.</p>

<h3>What if my client wants to take it over themselves someday?</h3>

<p>That's a business decision you control. The AI workers live in your agency account. You can transfer ownership of a client container, migrate it out, or keep it locked to your agency as part of the retainer. Most agencies keep it locked — that's the moat.</p>

<h2>When an AI worker isn't right for a client</h2>

<p>Not every GHL client is a fit. Skip the offer if:</p>

<ul>
  <li>They receive fewer than 5 inbound messages per week. The math doesn't work for them.</li>
  <li>Their business is highly regulated in ways that require every reply to be human-reviewed before sending.</li>
  <li>They have an in-house team that handles inbound within minutes and is at excess capacity.</li>
  <li>They operate in a language the AI doesn't handle well. (Most major languages work; niche regional languages may not.)</li>
</ul>

<p>For every other client, the math works.</p>

<p>Ready to add your first AI worker? <a href="/try/dental">Try a live demo</a> or <a href="/signup/agency">start your free agency account</a>. For the underlying technology, see our guide on <a href="/blog/what-is-openclaw-ai-gateway-explained">what OpenClaw is</a>.</p>

<p>External references: <a href="https://help.gohighlevel.com">GoHighLevel help center</a> · <a href="https://github.com/openclaw/openclaw">OpenClaw on GitHub (the agent runtime powering AI workers)</a> · <a href="https://docs.anthropic.com">Anthropic Claude documentation</a>.</p>
`,
  },
  {
    slug: 'ai-for-dental-practices',
    title: 'AI for Dental Practices: The 2026 Guide to 24/7 Patient Response',
    description: 'How AI workers handle after-hours patient inquiries for dental practices. Covers what the AI does, HIPAA-compliant boundaries, GoHighLevel integration, booking flows, and what to expect in the first 30 days.',
    date: '2026-02-22',
    readMins: 11,
    category: 'Industry Guide',
    emoji: '🦷',
    content: `
<p><em>Last updated: April 17, 2026</em></p>

<p><strong>An AI worker for a dental practice</strong> is an autonomous AI agent that responds to inbound patient texts, calls, and chats in under 60 seconds — day or night — to answer common questions, verify insurance, book appointments, and route urgent situations to the on-call staff. This guide explains exactly what a dental AI handles, what it cannot and should not handle, how it integrates with GoHighLevel, and what practices typically see in the first 30 days.</p>

<div style="background:rgba(79,70,229,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px 0;"><strong>Key takeaways</strong></p>
  <ul style="margin:0;">
    <li>Dental practices lose an estimated 30 to 40 percent of new patient inquiries to after-hours unavailability. An AI worker captures most of those.</li>
    <li>Deployment is roughly 15 minutes when using an industry template for dental.</li>
    <li>The AI handles scheduling, FAQs, and insurance inquiries. It does not access or store medical records.</li>
    <li>Integration with GoHighLevel is native: SMS, WhatsApp, email, and chat all flow through one inbox.</li>
    <li>Typical first-month outcomes: 3 to 8 new patient bookings recovered from after-hours inquiries, 100 percent response rate on new-patient texts.</li>
  </ul>
</div>

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

<h2>What the dental AI does NOT do</h2>

<p>Being clear about boundaries builds trust with practices that are rightly cautious. The AI worker does not:</p>

<ul>
  <li>Access the practice management system or patient medical records</li>
  <li>Offer clinical advice ("Is this toothache an emergency?" gets an escalation, not an opinion)</li>
  <li>Prescribe medications or interpret symptoms</li>
  <li>Handle billing disputes or insurance appeals</li>
  <li>Replace the emergency triage that a human dental team performs</li>
</ul>

<p>Everything on that list stays with staff or the on-call dentist. The AI covers the scheduling and intake layer that eats hours of front-desk time every week.</p>

<h2>A typical 2026 dental deployment</h2>

<p>Here is what a deployment looks like for a mid-size practice (two dentists, ~400 active patients):</p>

<table>
  <thead>
    <tr>
      <th>Item</th>
      <th>Detail</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Channels active</td>
      <td>SMS + website chat + Google Business Profile messaging</td>
    </tr>
    <tr>
      <td>Response SLA</td>
      <td>Under 60 seconds, 24/7</td>
    </tr>
    <tr>
      <td>Setup time</td>
      <td>15 minutes using the dental industry template</td>
    </tr>
    <tr>
      <td>Escalation triggers</td>
      <td>Emergency keywords, frustrated tone, insurance-appeal requests</td>
    </tr>
    <tr>
      <td>CRM used</td>
      <td>GoHighLevel (via Private Integration Token)</td>
    </tr>
    <tr>
      <td>Monthly conversations handled</td>
      <td>150 to 400 depending on advertising volume</td>
    </tr>
  </tbody>
</table>

<h2>What to look for in a dental AI worker</h2>

<p>Not all AI workers handle dental workflows equally. Before committing to a deployment, evaluate any option against these five criteria:</p>

<ul>
  <li><strong>Native CRM integration — not a Zapier wrapper.</strong> An AI worker that routes through a third-party automation layer introduces additional latency, failure points, and per-task costs. Direct API access to GoHighLevel is the standard for serious deployments. Check whether the integration is native or intermediated.</li>
  <li><strong>Configurable escalation rules.</strong> Dental practices deal with pain, anxiety, and occasionally urgent clinical situations. The AI should hand off to staff the moment it detects emergency keywords ("tooth knocked out," "severe pain," "can't stop bleeding"), frustrated tone, or clinical questions. Hardcoded escalation lists are a red flag — you want rules you can tune per practice.</li>
  <li><strong>Per-practice data isolation.</strong> Patient inquiry data should live in an isolated container for that practice, not mixed with thousands of other businesses on shared infrastructure. For HIPAA-adjacent workflows, isolation is a minimum baseline, not a premium feature.</li>
  <li><strong>Personality customization at the field level.</strong> A pediatric practice needs different tone, vocabulary, and response patterns than an oral surgery group. Look for systems that let you configure tone, forbidden topics, booking logic, and escalation triggers independently per client — not just a single global setting.</li>
  <li><strong>Full audit trails.</strong> Every AI reply should be logged with a timestamp, the message received, the action taken, and any CRM updates made. Dental practices are not required to archive patient texts the way medical records are archived, but a complete audit trail protects the practice if a patient dispute arises over what was communicated.</li>
</ul>

<p>A properly configured dental AI worker passes all five. A generic chatbot repurposed for dental typically fails on escalation rules and data isolation first — both of which matter most in regulated environments. The OpenClaw-based architecture described in our <a href="/blog/what-is-openclaw-ai-gateway-explained">gateway guide</a> addresses each of these points by design.</p>

<h2>Frequently asked questions</h2>

<h3>Is this HIPAA compliant?</h3>

<p>The AI worker itself does not access or store protected health information (PHI). It handles the same kinds of interactions a front-desk receptionist handles via text: scheduling, directions, insurance plan inquiries, pricing. However, HIPAA compliance is a property of the whole workflow, not the AI in isolation. Practices should review the AI's operating scope with their compliance officer and ensure their consent forms cover SMS communication. The U.S. Department of Health and Human Services maintains guidance at <a href="https://www.hhs.gov/hipaa/index.html">hhs.gov/hipaa</a>.</p>

<h3>Will patients know they're talking to an AI?</h3>

<p>That's a choice each practice makes. Many practices disclose it explicitly in the first message ("Hi, I'm Alex, the practice's virtual assistant. I can help with scheduling, insurance, and directions."). Transparency tends to build more trust than trying to hide it, and it sets clean expectations about what the assistant can handle.</p>

<h3>What happens if the AI can't answer something?</h3>

<p>It escalates. The conversation gets tagged in GHL for staff to follow up, and urgent keywords trigger an immediate notification to a designated team member's phone or Slack. The AI never pretends to know a medical answer it doesn't have.</p>

<h3>How much does this cost the practice?</h3>

<p>If you are an agency deploying this for dental clients, typical retainers are $500 to $1,000 per month. The practice compares that to the cost of one lost patient (often $2,000 to $5,000 in lifetime value) and the math is immediate. If you are a practice shopping directly, most agencies will quote a 60-day pilot.</p>

<h3>Can it integrate with dental-specific practice management software?</h3>

<p>Native integrations with Dentrix, Eaglesoft, Open Dental, and similar are limited today. Most practices route the AI through GoHighLevel for conversation handling, then have staff transfer booked appointments into the practice management system manually. This is a multi-minute task per booking, not hours, and it stays inside HIPAA-compliant workflows.</p>

<h3>Does it work for specialist practices (orthodontics, endodontics, oral surgery)?</h3>

<p>Yes, with personality and knowledge-base customization. The standard dental template is tuned for general practice. Specialist templates are available for orthodontics (braces and Invisalign intake), endodontics (root canal inquiries), and oral surgery (extraction scheduling). Customization happens in the agent's personality file.</p>

<h2>When a dental AI worker isn't the right fit</h2>

<p>A practice should skip the AI worker if:</p>

<ul>
  <li>The practice has a full-time receptionist with excess capacity and no missed calls or after-hours voicemails.</li>
  <li>Patient volume is under 5 new inquiries per week total.</li>
  <li>State regulations require every patient communication to be reviewed by a licensed clinician before sending (rare but exists).</li>
  <li>The practice doesn't want to use SMS for patient communication at all.</li>
</ul>

<p>Most general-practice dental offices fit the target profile cleanly.</p>

<p>Ready to see it in action? <a href="/try/dental">Try the live dental AI demo</a> — type anything a patient would say. For the broader agency-deployment story, see our <a href="/blog/ghl-ai-employee-agency">GHL AI worker agency guide</a> or our primer on <a href="/blog/openclaw-agent-vs-chatbot-capabilities">what an AI agent can actually do</a>.</p>

<p>External references: <a href="https://www.hhs.gov/hipaa/index.html">HIPAA guidance from HHS</a> · <a href="https://help.gohighlevel.com">GoHighLevel documentation</a> · <a href="https://docs.openclaw.ai">OpenClaw documentation</a>.</p>
`,
  },
  {
    slug: 'agency-recurring-revenue-ai',
    title: 'How Agencies Use AI Workers to Build Recurring Revenue (2026 Playbook)',
    description: 'A 90-day playbook for digital agencies adding AI workers as a recurring service line. Covers pricing frameworks, client onboarding, industry fit, and the practical steps from first client to a stable 10-client book.',
    date: '2026-02-22',
    readMins: 12,
    category: 'Agency Growth',
    emoji: '💰',
    content: `
<p><em>Last updated: April 17, 2026</em></p>

<p><strong>An AI worker retainer</strong> is a recurring monthly service line agencies add on top of existing client work, where the agency deploys and manages an autonomous AI agent that handles inbound messages, books appointments, and updates the CRM for each client — typically priced between $500 and $2,000 per month per client. This playbook walks through how to structure the offering, how to land your first three clients, and how to scale the book without hiring.</p>

<div style="background:rgba(79,70,229,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px 0;"><strong>Key takeaways</strong></p>
  <ul style="margin:0;">
    <li>AI workers break the linear-revenue trap most agencies hit — marginal cost of adding a 15th worker is near zero.</li>
    <li>Pricing runs $500 to $2,000 per client per month. Typical gross margin after platform and API costs is 85 to 95 percent.</li>
    <li>The 90-day playbook: 14 days foundation, 16 days first paid client, 60 days to three paying clients and a repeatable process.</li>
    <li>Best starter verticals: dental, real estate, auto dealerships, med spas, cannabis dispensaries. High lead value, high missed-call rates, steady volume.</li>
    <li>Retention is the moat. Churn on a working AI worker is near zero because the agent compounds value month over month.</li>
  </ul>
</div>

<p>Most digital marketing agencies have a ceiling problem. You can only take on so many clients. Every new client means more work, more management, more headaches. Revenue grows linearly. Costs grow almost as fast.</p>

<p>AI workers break this model. Here's why: the marginal cost of adding a 15th AI worker is almost zero. You configure a personality, connect GHL, and the AI does the rest. The infrastructure scales automatically. You don't hire more staff. You don't increase overhead.</p>

<p>That's the opportunity.</p>

<h2>The Math</h2>

<p>Let's run the numbers on a basic agency AI operation:</p>

<ul>
  <li><strong>Platform cost:</strong> $299/month (pro plan, up to 10 AI workers)</li>
  <li><strong>API cost:</strong> ~$1–3/client/month at moderate conversation volume</li>
  <li><strong>Your price to clients:</strong> $800–$1,500/month per AI worker</li>
  <li><strong>10 clients at $1,000/month:</strong> $10,000 MRR</li>
  <li><strong>Your costs:</strong> ~$290/month (platform + API)</li>
  <li><strong>Gross margin:</strong> ~97%</li>
</ul>

<p>At 10 clients you're at $10,000/month with essentially no marginal cost increase.</p>

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
  <li>Get them live on your platform, connect their GHL, customize their personality</li>
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

<h2>How to build a sustainable referral system</h2>

<p>The 90-day playbook above gets you to three to five paying clients. Scaling beyond that typically comes from referrals, not cold outreach.</p>

<p>A simple referral program that works: offer existing clients one free month for every client they introduce who signs a contract. The economics work because your marginal cost of adding a client is near zero — giving away an $800 month costs you roughly $15 in platform and API fees, not $800.</p>

<p>Three practical steps:</p>

<ol>
  <li><strong>Ask at the 60-day mark.</strong> Once a client has seen two months of performance reports, their skepticism is gone. That is the right moment to ask: "Do you know anyone else who would want this?"</li>
  <li><strong>Give them the demo link, not the pitch.</strong> Most business owners know other business owners. A dental client knows other dental professionals. Sending them a demo link lets the AI sell itself. You get a warm introduction; the AI does the convincing.</li>
  <li><strong>Keep the referral program simple.</strong> One rule: introduce a client who signs, get one free month. No tiers, no points, no complexity. Simple referral programs generate more referrals than tiered ones because the math is obvious to the referring client.</li>
</ol>

<p>By month six, a referral system running alongside direct outreach should account for 30 to 50 percent of new client acquisitions. That is when the business starts compounding on its own momentum.</p>

<h2>A real-world economic comparison</h2>

<p>Here's how the unit economics actually look across a typical 10-client book compared to traditional agency services:</p>

<table>
  <thead>
    <tr>
      <th>Service line</th>
      <th>Typical monthly price per client</th>
      <th>Gross margin</th>
      <th>Typical 12-month retention</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Facebook ads management</td>
      <td>$800 to $3,000</td>
      <td>30 to 50 percent</td>
      <td>4 to 8 months</td>
    </tr>
    <tr>
      <td>Website build + maintenance</td>
      <td>$200 to $800</td>
      <td>40 to 60 percent</td>
      <td>Variable (often one-time)</td>
    </tr>
    <tr>
      <td>SEO retainer</td>
      <td>$1,000 to $5,000</td>
      <td>30 to 60 percent</td>
      <td>6 to 12 months</td>
    </tr>
    <tr>
      <td>AI worker retainer</td>
      <td>$500 to $2,000</td>
      <td>85 to 95 percent</td>
      <td>12+ months (near-zero churn)</td>
    </tr>
  </tbody>
</table>

<p>The AI worker retainer is the first new agency service line in a decade with margin and retention characteristics this strong. That's why agencies that move early establish a defensible position.</p>

<h2>Frequently asked questions</h2>

<h3>Do I need technical skills to deploy AI workers?</h3>

<p>No. The platform handles the infrastructure. You configure personality via a markdown file, connect the client's existing CRM with a token, and pick an industry template. If you can manage a GoHighLevel sub-account, you can deploy an AI worker.</p>

<h3>What if a client already has a chatbot on their site?</h3>

<p>Most site chatbots are keyword-based scripts. An AI worker replaces them entirely. The client removes the old chatbot script from their website and installs the AI worker embed code. The new AI has a conversation with visitors instead of a scripted Q-and-A.</p>

<h3>How do I price this for my first few clients?</h3>

<p>Start at the low end of the range. First three clients at $500 per month to build case studies, then raise to $800 to $1,500 for new clients once you have results to show. Do not underprice long-term; the margin supports it and the value is real.</p>

<h3>How do I sell this to a client who's skeptical of AI?</h3>

<p>Show, don't tell. Every agency account includes industry-specific demo pages (<a href="/try/dental">dental</a>, <a href="/try/realestate">real estate</a>, <a href="/try/auto">auto</a>, and others). Send the prospect the link, tell them to text anything a customer would text. Most skepticism disappears after a 3-minute live conversation with the AI.</p>

<h3>What are the operational costs I should plan for?</h3>

<p>Platform subscription (typically $99 to $499 per month depending on client count), plus AI model API costs (roughly $1 to $5 per client per month at moderate conversation volume). Both scale cleanly with client count. No per-message or per-conversation fees beyond the model API cost.</p>

<h3>Can I offer this alongside my current services, or does it replace them?</h3>

<p>Alongside. AI worker retainers sit on top of existing services (ads, SEO, GHL management). They often make the other services stickier because the client is getting measurable, ongoing value from the agency relationship.</p>

<h2>When this business model isn't right for you</h2>

<p>The AI worker retainer is a strong recurring-revenue play, but it's not universal. Skip this service line if:</p>

<ul>
  <li>Your current clients are not in high-inbound-volume verticals (pure B2B consulting, for example, often doesn't fit).</li>
  <li>You have no interest in learning a new dashboard or maintaining a new service line.</li>
  <li>Your existing agency margin is already so high that adding this is noise.</li>
  <li>Your client base won't or can't pay monthly recurring fees.</li>
</ul>

<p>For agencies serving local service businesses, e-commerce, real estate, or any high-volume consumer-facing vertical, this works.</p>

<p>Ready to start? <a href="/signup/agency">Create your free agency account</a> — no credit card required. For the deeper technical story on how AI workers differ from chatbots, read our <a href="/blog/openclaw-agent-vs-chatbot-capabilities">6 capabilities guide</a> or our <a href="/blog/ghl-ai-employee-complete-guide">GHL AI worker complete guide</a>.</p>

<p>External references: <a href="https://help.gohighlevel.com">GoHighLevel documentation</a> · <a href="https://docs.openclaw.ai">OpenClaw documentation</a> · <a href="https://github.com/openclaw/openclaw">OpenClaw on GitHub</a>.</p>
`,
  },
  {
    slug: 'ghl-ai-employee-complete-guide',
    title: 'GoHighLevel AI Worker: The Complete Guide for GHL Agencies (2026)',
    description: 'Everything GHL agencies need to know about deploying an AI worker to every sub-account. Covers Private Integration Tokens, channel coverage, pricing models, proactive outreach, and CRM automation.',
    date: '2026-02-23',
    readMins: 13,
    category: 'GHL Integration',
    emoji: '⚡',
    content: `
<p><em>Last updated: April 17, 2026</em></p>

<p><strong>A GoHighLevel AI worker</strong> is an autonomous AI agent connected to a GHL sub-account via a Private Integration Token that reads inbound conversations across all seven GHL channels (SMS, WhatsApp, Instagram, Facebook Messenger, Live Chat, email, and Google My Business), replies within 60 seconds, books appointments, updates CRM tags and pipeline stages, and escalates urgent or complex situations to the agency team. This guide walks through exactly how it works, how to deploy one in 10 minutes, and how agencies typically price it.</p>

<div style="background:rgba(79,70,229,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px 0;"><strong>Key takeaways</strong></p>
  <ul style="margin:0;">
    <li>Connection uses GHL Private Integration Tokens — no marketplace listing, no OAuth app, no review process required.</li>
    <li>All seven GHL conversation channels are covered from a single unified inbox.</li>
    <li>Typical retainer pricing: $500 (restaurant, basic) to $2,000 (real estate, premium) per month per client.</li>
    <li>Proactive outreach is the highest-leverage feature: the AI contacts new leads within ~60 seconds of creation.</li>
    <li>Every conversation auto-updates GHL tags, pipeline stages, and contact notes — no manual CRM maintenance.</li>
  </ul>
</div>

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

<h2>Troubleshooting the first 48 hours</h2>

<p>Most first-deployment issues fall into one of four buckets. Here's how to triage them:</p>

<table>
  <thead>
    <tr>
      <th>Symptom</th>
      <th>Likely cause</th>
      <th>Fix</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>AI isn't replying to test messages</td>
      <td>Wrong or expired Private Integration Token</td>
      <td>Regenerate the token in GHL Settings → Integrations</td>
    </tr>
    <tr>
      <td>AI replies but tone is off</td>
      <td>Personality file too generic</td>
      <td>Tighten the SOUL.md-equivalent personality brief</td>
    </tr>
    <tr>
      <td>AI books appointments wrong</td>
      <td>Calendar not connected or time zone mismatch</td>
      <td>Confirm GHL calendar sync and agent's configured time zone</td>
    </tr>
    <tr>
      <td>AI gives wrong pricing</td>
      <td>Knowledge base out of date</td>
      <td>Update the uploaded pricing document; rebuild embeddings</td>
    </tr>
  </tbody>
</table>

<h2>Frequently asked questions</h2>

<h3>What's the difference between a Private Integration Token and a GHL marketplace app?</h3>

<p>A marketplace app requires OAuth approval, a listing, and a review process from GHL. A Private Integration Token is a single credential generated inside the sub-account that grants API access. For agency use cases where you're already inside your client's sub-account, Private Integration Tokens are dramatically faster to deploy (2 minutes per client) and require no app approval.</p>

<h3>Will the AI worker step on my existing GHL workflows?</h3>

<p>No. The AI only responds to inbound conversation messages. Your outbound workflows (appointment reminders, review requests, nurture sequences) continue running untouched. They run in parallel.</p>

<h3>Can multiple AI workers share one GHL account?</h3>

<p>Each GHL sub-account maps to exactly one AI worker. If you manage 10 sub-accounts, you deploy 10 AI workers — one per sub-account. Each has its own personality, knowledge base, and escalation rules.</p>

<h3>Does the AI handle payments or sensitive data?</h3>

<p>The AI does not process payments directly. For payment collection, the AI hands off to a GHL payment link or Stripe Checkout URL. The AI never sees or stores credit card data. For other sensitive data (SSN, medical records), the agent is configured to refuse and escalate.</p>

<h3>How does billing work between me (the agency) and the platform?</h3>

<p>Agencies pay a single platform subscription (flat monthly, tiered by client count) plus model API costs. Clients pay the agency directly for the AI worker service. The platform has no billing relationship with end clients — that's entirely your agency relationship.</p>

<h3>What's the realistic upper limit of this service line?</h3>

<p>We know agencies running 30+ clients on a single ops person managing the AI side. Beyond that, hiring a junior specialist to monitor alerts and tune personalities makes sense. The work scales sub-linearly with client count, which is what makes the margin work.</p>

<h2>When a GHL AI worker isn't the right fit</h2>

<ul>
  <li>Client is on a GHL plan that doesn't support Private Integration Tokens.</li>
  <li>Client receives fewer than ~20 inbound messages per month. Not enough volume for the ROI to land.</li>
  <li>Client's regulatory environment requires every outbound communication be human-signed.</li>
  <li>Client's conversations are predominantly voice calls. Voice AI is a different product category (see our voice-AI coverage once available).</li>
</ul>

<p>Everything else is in scope.</p>

<p>Ready to add AI workers to your GHL agency? <a href="/signup/agency">Create your free account</a> and have your first AI live in 10 minutes. For the broader playbook on positioning AI workers as a service line, read <a href="/blog/agency-recurring-revenue-ai">how agencies use AI workers for recurring revenue</a>. For the underlying technology, see our guide on <a href="/blog/openclaw-agent-vs-chatbot-capabilities">the 6 capabilities a real AI agent has</a>.</p>

<p>External references: <a href="https://help.gohighlevel.com">GoHighLevel documentation</a> · <a href="https://github.com/openclaw/openclaw">OpenClaw on GitHub</a> · <a href="https://docs.anthropic.com">Anthropic Claude documentation</a>.</p>
`,
  },
  {
    slug: 'what-is-openclaw-ai-gateway-explained',
    title: 'What Is OpenClaw? The Open-Source AI Gateway That Connects Every Messaging App to Your AI Agent',
    description: 'OpenClaw is the self-hosted AI gateway most people still haven\'t heard of. One daemon connects WhatsApp, Telegram, Slack, Discord, Signal, iMessage and 18 more channels to a single AI agent. Here\'s what it does, how it works, and how to set it up in 10 minutes.',
    date: '2026-04-16',
    readMins: 13,
    category: 'AI Infrastructure',
    emoji: '🦞',
    content: `
<p><em>Last updated: April 17, 2026</em></p>

<div style="background:rgba(79,70,229,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px 0;"><strong>Key takeaways</strong></p>
  <ul style="margin:0;">
    <li>OpenClaw is an open-source, MIT-licensed AI gateway that runs as a single daemon on your hardware.</li>
    <li>It connects 24+ messaging channels (WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Teams, Matrix, and more) to a single AI agent.</li>
    <li>Supports 50+ model providers including Claude, GPT, Gemini, Ollama, and OpenRouter.</li>
    <li>Setup takes under 10 minutes on any machine with Node.js 22 or later.</li>
    <li>Your data stays on your hardware. No vendor lock-in.</li>
  </ul>
</div>

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

<h2>OpenClaw vs. alternative AI deployment paths</h2>

<table>
  <thead>
    <tr>
      <th>Approach</th>
      <th>Data location</th>
      <th>Channel coverage</th>
      <th>Per-seat pricing</th>
      <th>Lock-in risk</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>ChatGPT / Claude web app</td>
      <td>Vendor cloud</td>
      <td>Web only</td>
      <td>Yes</td>
      <td>High</td>
    </tr>
    <tr>
      <td>OpenAI Assistants API</td>
      <td>Vendor cloud</td>
      <td>Custom integration per channel</td>
      <td>Usage + model cost</td>
      <td>High (API tied to one vendor)</td>
    </tr>
    <tr>
      <td>Shared SaaS chatbot</td>
      <td>Vendor cloud, shared infra</td>
      <td>Channel dependent</td>
      <td>Yes</td>
      <td>Medium</td>
    </tr>
    <tr>
      <td>OpenClaw (self-hosted)</td>
      <td>Your hardware</td>
      <td>24+ built-in channels</td>
      <td>None</td>
      <td>None (MIT licensed)</td>
    </tr>
  </tbody>
</table>

<p>OpenClaw is powerful. It is also, for most agency owners and non-technical operators, more setup than they want to do for every client. Installing Node, editing config files, managing daemons, paying for a VPS, renewing TLS certificates — it adds up. For agencies who want the OpenClaw architecture without the infrastructure work, managed platforms exist that wrap this runtime in a complete service layer — per-client isolation, ready-to-configure industry templates, integrated billing, and an onboarding flow measured in minutes rather than hours. The underlying technology is identical to self-hosted OpenClaw.</p>

<h2>Start Here</h2>

<p>If you are technical and curious, install OpenClaw. It is free, it is open source, and ten minutes of your time gets you an agent that runs on your hardware and speaks through every channel you use.</p>

<p>If you are an agency owner or business operator who wants the OpenClaw architecture without the infrastructure work, <a href="/solo">start with Kyra Solo</a>. It is free to try, no credit card required, and your first AI worker goes live in under two minutes.</p>

<p>Either way, the era of shared chatbot platforms is ending. The era of self-hosted, agent-native, multi-channel AI is beginning. The tools are open source, the architecture is proven, and the setup is fast. The only question is whether you want to run it yourself or let a platform run it for you.</p>

<p>Want to read more? See our guide on <a href="/blog/white-label-ai-platform-agencies">building a white-label AI business</a> or the <a href="/blog/ghl-ai-employee-complete-guide">GoHighLevel AI worker setup guide</a>, or our breakdown of <a href="/blog/openclaw-agent-vs-chatbot-capabilities">the 6 capabilities an AI agent has that a chatbot doesn't</a>.</p>

<p>External references: <a href="https://github.com/openclaw/openclaw">OpenClaw on GitHub (MIT licensed)</a> · <a href="https://docs.openclaw.ai">Official OpenClaw documentation</a> · <a href="https://modelcontextprotocol.io">Model Context Protocol (MCP) specification</a> · <a href="https://docs.anthropic.com">Anthropic Claude documentation</a>.</p>
`,
  },
  {
    slug: 'white-label-ai-platform-agencies',
    title: 'White-Label AI Platform for Agencies: The 2026 Deployment Guide',
    description: 'A practical guide to deploying white-label AI workers for agency clients. Covers the economics of the service line, onboarding flow, pricing tiers, industry fit, and how to scale from 5 to 50 clients.',
    date: '2026-02-23',
    readMins: 14,
    category: 'Agency Growth',
    emoji: '💰',
    content: `
<p><em>Last updated: April 17, 2026</em></p>

<p><strong>A white-label AI platform for agencies</strong> is a managed deployment layer on top of an open-source agent runtime (like OpenClaw) that lets agencies deploy isolated AI workers for each of their clients — under the agency's brand, with per-client data isolation — without building infrastructure. This guide covers when the white-label model works, how to structure pricing, and the 6-month path from first client to a stable 50-client book.</p>

<div style="background:rgba(79,70,229,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;margin:24px 0;">
  <p style="margin:0 0 8px 0;"><strong>Key takeaways</strong></p>
  <ul style="margin:0;">
    <li>Agencies sell the AI worker under their own brand. Clients never see the underlying platform.</li>
    <li>Each client gets an isolated AI container — separate personality, knowledge base, memory, and data.</li>
    <li>Typical margin: 85 to 95 percent after platform and API costs. Retention is near-zero churn once the AI is delivering.</li>
    <li>First-client onboarding takes 30 to 60 minutes. Subsequent clients: under 15 minutes per deployment.</li>
    <li>Strongest verticals: dental, real estate, auto, med spas, cannabis, high-volume local service.</li>
  </ul>
</div>

<p>In 2026, the most profitable agencies aren't selling websites, ads, or even GHL setups. They're selling <strong>AI workers</strong>. And the ones who figured this out first are building significant recurring revenue on autopilot — because the AI worker retainer has economics no other agency service line can match.</p>

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

<h2>How white-label AI compares to other agency service lines</h2>

<table>
  <thead>
    <tr>
      <th>Service line</th>
      <th>Onboarding time per client</th>
      <th>Monthly ops time per client</th>
      <th>Typical margin</th>
      <th>Churn profile</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Website build</td>
      <td>20 to 60 hours</td>
      <td>1 to 3 hours</td>
      <td>40 to 60%</td>
      <td>Often one-time</td>
    </tr>
    <tr>
      <td>Facebook ads</td>
      <td>6 to 10 hours</td>
      <td>4 to 10 hours</td>
      <td>30 to 50%</td>
      <td>4 to 8 months typical</td>
    </tr>
    <tr>
      <td>SEO retainer</td>
      <td>8 to 20 hours</td>
      <td>6 to 15 hours</td>
      <td>30 to 60%</td>
      <td>6 to 12 months</td>
    </tr>
    <tr>
      <td>White-label AI worker</td>
      <td>15 to 30 minutes</td>
      <td>10 to 30 minutes</td>
      <td>85 to 95%</td>
      <td>Near-zero once live</td>
    </tr>
  </tbody>
</table>

<p>The combination — low onboarding, low ops, high margin, near-zero churn — is unusual. It's why the agencies investing in this category now are building defensible positions before the space gets crowded.</p>

<h2>Data isolation is the feature sophisticated clients ask about</h2>

<p>For regulated clients (dental, legal, medical, financial), "your data won't be mixed with anyone else's" is not a nice-to-have. It's the table-stakes question on every vendor evaluation call.</p>

<p>The white-label deployment model addresses this directly: each client gets an isolated container with their own storage, their own AI personality, their own knowledge base, and their own memory. Nothing from Client A ever touches Client B. If regulated clients are part of your book, this is the line that sells the service.</p>

<h2>Frequently asked questions</h2>

<h3>What does "white-label" actually include?</h3>

<p>Clients see your agency's brand on the dashboard (if exposed), on the AI worker's name and voice, and on any public-facing surfaces (widgets, embed codes). They never see the underlying platform brand. If a client discovers the underlying technology, it's because you chose to disclose it.</p>

<h3>Do I need my own infrastructure?</h3>

<p>No. The platform handles hosting, scaling, updates, and failover. Your work is configuration and client management. If you want maximum control (regulated client, custom hosting requirement), you can optionally self-host the agent runtime on your own servers — but that's a later-stage choice, not a requirement to start.</p>

<h3>How do I position this in a sales conversation?</h3>

<p>Lead with the outcome, not the technology. "Your business is missing 30 to 40 percent of inquiries after 6pm. We'll put an AI worker on your phone line tonight. By Thursday morning, it will have handled 20-plus conversations you would have missed. You'll see the report." Then show the live demo. Close rate goes up 3x compared to pitching "AI" abstractly.</p>

<h3>What happens when the AI gets something wrong?</h3>

<p>Three layers of safety: explicit escalation rules (urgent keywords, frustrated tone), soft fallbacks ("I'm not sure, let me connect you with a team member"), and full audit trails. Every conversation is logged. If something goes wrong, you review the transcript, tighten the personality file, and ship the fix in under 10 minutes.</p>

<h3>Can I run this for clients who aren't on GoHighLevel?</h3>

<p>Yes. GHL is the most common integration path, but the underlying runtime supports direct SMS, email, Slack, Discord, Matrix, Microsoft Teams, iMessage, and WhatsApp via their respective APIs. For clients on platforms like HubSpot, Pipedrive, or custom CRMs, webhook integrations cover most workflows.</p>

<h3>How do I price this for my agency's size?</h3>

<p>If you're new: start at $500 per client per month. Use the first three clients to build case studies. If you're established: price based on client value. A dental practice where one lost patient is $2,000 easily supports $1,500 per month. Enterprise med spas and real estate teams can support $2,000-plus. Never underprice on retention economics this strong.</p>

<h2>When white-label AI isn't the right model for you</h2>

<ul>
  <li>You have no existing client base and aren't set up to acquire new ones.</li>
  <li>You want zero ongoing management — even 10 minutes per client per month is too much.</li>
  <li>You're not comfortable troubleshooting AI personality issues when they come up (usually easy, but it's a skill).</li>
  <li>You plan to market the AI worker as your own proprietary technology (possible, but the marketing story is different from "we deploy AI").</li>
</ul>

<p>For every other agency, the economics make this the single most interesting service line to add in 2026.</p>

<p><a href="/signup/agency">Create your free agency account →</a></p>

<p>Related reading: <a href="/blog/openclaw-agent-vs-chatbot-capabilities">The 6 capabilities an AI agent has that a chatbot doesn't</a> · <a href="/blog/ghl-ai-employee-complete-guide">The GHL AI worker complete guide</a> · <a href="/blog/what-is-openclaw-ai-gateway-explained">What OpenClaw is</a>.</p>

<p>External references: <a href="https://github.com/openclaw/openclaw">OpenClaw on GitHub</a> · <a href="https://docs.openclaw.ai">OpenClaw documentation</a> · <a href="https://docs.anthropic.com">Anthropic Claude documentation</a> · <a href="https://modelcontextprotocol.io">Model Context Protocol specification</a>.</p>
`,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find(p => p.slug === slug);
}

export function generateStaticParams() {
  return POSTS.map(p => ({ slug: p.slug }));
}
