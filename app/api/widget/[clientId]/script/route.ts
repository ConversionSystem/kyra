// ============================================================================
// GET /api/widget/[clientId]/script
//
// Returns the self-contained JavaScript widget snippet for a client.
// Clients embed this on their website:
//   <script src="https://kyra.conversionsystem.com/api/widget/CLIENT_ID/script" defer></script>
//
// The script creates a floating chat bubble. Clicking it opens a chat panel.
// Sessions persist in localStorage. All messages routed through /api/widget/chat.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function getIndustryQuickReplies(industry: string, cfg: Record<string, unknown>): string[] {
  const lower = (industry || '').toLowerCase();
  const hasBooking = !!(cfg.calendar_url || cfg.booking_url);
  const bookBtn = hasBooking ? '📅 Book Now' : '📞 Contact Us';

  // Cannabis / Dispensary — Terpli-style effect buttons
  if (lower.includes('cannabis') || lower.includes('dispensary')) {
    // 2026-05-12: trimmed from 5 → 3 default chips. With the Trending strip
    // also rendering in the welcome state, 5 vertical chips + 3 product
    // cards consumed the entire 580px panel before any conversation could
    // happen. Three covers the highest-intent buckets; users who want
    // pain-relief or creativity-focused products can still type or use
    // the trending strip below.
    return ['😌 Products for relaxation', '😴 Products for sleep', '⚡ Energizing products'];
  }
  // Dental
  if (lower.includes('dental') || lower.includes('dentist')) {
    return ['🦷 Services', '🏥 Insurance', bookBtn, '🕐 Hours'];
  }
  // HVAC / Plumbing / Electrical / Home Services
  if (lower.includes('hvac') || lower.includes('plumbing') || lower.includes('electrical') || lower.includes('roofing') || lower.includes('cleaning')) {
    return ['🔧 Need a Repair', '💰 Free Estimate', '🚨 Emergency', '📍 Service Areas'];
  }
  // Legal
  if (lower.includes('legal') || lower.includes('law') || lower.includes('attorney')) {
    return ['⚖️ Practice Areas', '🆓 Free Consult', bookBtn, '💰 Fees'];
  }
  // Real Estate
  if (lower.includes('real estate') || lower.includes('realty')) {
    return ['🏠 Buy a Home', '💵 Sell My Home', '📍 Areas', bookBtn];
  }
  // Medical / Med Spa / Healthcare
  if (lower.includes('medical') || lower.includes('med spa') || lower.includes('medspa') || lower.includes('health')) {
    return ['💊 Treatments', bookBtn, '🕐 Hours', '🏥 Insurance'];
  }
  // Restaurant / Food
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('cafe') || lower.includes('bakery')) {
    return ['🍽️ Menu', '🕐 Hours', '📅 Reservations', '📍 Location'];
  }
  // Fitness / Gym
  if (lower.includes('gym') || lower.includes('fitness') || lower.includes('martial')) {
    return ['🏋️ Classes', '💰 Membership', '🆓 Free Trial', '🕐 Hours'];
  }
  // Salon / Spa / Beauty
  if (lower.includes('salon') || lower.includes('spa') || lower.includes('beauty') || lower.includes('hair')) {
    return ['💇 Services', bookBtn, '💰 Prices', '📍 Location'];
  }
  // Automotive
  if (lower.includes('auto') || lower.includes('car') || lower.includes('mechanic') || lower.includes('body shop')) {
    return ['🔧 Services', '💰 Get a Quote', '🚗 Drop-off', '🕐 Hours'];
  }
  // Pet / Vet
  if (lower.includes('pet') || lower.includes('vet') || lower.includes('animal') || lower.includes('grooming')) {
    return ['🐾 Services', bookBtn, '🆘 Emergency', '🕐 Hours'];
  }
  // Education / Tutoring
  if (lower.includes('school') || lower.includes('tutor') || lower.includes('education') || lower.includes('training')) {
    return ['📚 Programs', '💰 Pricing', '🆓 Free Session', bookBtn];
  }
  // Consulting / Professional Services
  if (lower.includes('consulting') || lower.includes('accounting') || lower.includes('financial') || lower.includes('insurance')) {
    return ['💼 Services', bookBtn, '📊 Experience', '💰 Fees'];
  }
  // IT / Tech
  if (lower.includes('it') || lower.includes('tech') || lower.includes('computer') || lower.includes('software')) {
    return ['💻 Services', '🆘 Tech Support', bookBtn, '💰 Rates'];
  }
  // Generic default
  return ['💼 Services', '🕐 Hours', bookBtn, '📍 Location'];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  if (!clientId) {
    return new NextResponse('// Missing clientId', { status: 400, headers: { 'Content-Type': 'application/javascript' } });
  }

  const supabase = getSupabase();

  // Fetch widget config from client (including agency_id for branding).
  // updated_at participates in the ETag — saves bust the browser/CDN cache
  // on the very next request, no 5-minute lag like the prior implementation.
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, status, container_config, gateway_status, agency_id, industry, updated_at')
    .eq('id', clientId)
    .single();

  // Build a short ETag from clientId + updated_at — changes on any save and
  // is cheap to compute. Browsers/CDNs that respect ETag will revalidate
  // (sending If-None-Match) and get 304 when nothing changed; the moment
  // the dashboard saves, updated_at advances, the ETag changes, and the
  // next request gets a fresh full script.
  const updatedAtRaw = (client as { updated_at?: string } | null)?.updated_at ?? '0';
  const etag = `"w-${clientId.slice(0, 8)}-${Buffer.from(updatedAtRaw).toString('base64url').slice(0, 16)}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        // 2026-05-13: hardened cache directive. Customer report: "saves
        // still don't propagate instantly." Root cause: `public, max-age=0,
        // must-revalidate` lets browsers cache the script and soft-reload
        // (F5/Cmd-R) often bypasses revalidation on <script> tags — only
        // hard refresh forced a fresh fetch. Switched to no-store +
        // no-cache (no caching, no revalidation needed) so every page load
        // gets the fresh script. Trades a ~62KB refetch per page load for
        // guaranteed instant config propagation.
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Vary: '*',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Allow the widget to load even for inactive/missing clients
  // Chat will return a graceful fallback message in that case
  // This ensures the widget always renders on client sites

  // Fetch agency branding settings + plan
  let agencySettings: Record<string, unknown> = {};
  let agencyPlan = 'free';
  if (client?.agency_id) {
    const { data: agency } = await supabase
      .from('agencies')
      .select('id, name, settings, plan')
      .eq('id', client.agency_id)
      .single();
    agencySettings = (agency?.settings as Record<string, unknown>) ?? {};
    agencyPlan = (agency?.plan as string) || 'free';
  }

  const agencyPrimaryColor = (agencySettings.primary_color as string) || null;
  const agencyAccentColor = (agencySettings.accent_color as string) || null;
  const agencyCompanyName = (agencySettings.company_name as string) || null;

  const cfg = client ? ((client.container_config as Record<string, unknown>) ?? {}) : {};
  // Priority: container_config override → agency primary_color → agency accent_color → default
  const widgetColor = (cfg.widget_color as string) || agencyPrimaryColor || agencyAccentColor || '#6366f1';
  const widgetTitle = (cfg.widget_title as string) || (agencyCompanyName ? `Chat with ${agencyCompanyName}` : (client ? `Chat with ${client.name}` : 'Chat with us'));
  // Greeting source priority (revised 2026-05-04):
  //   1. container_config.widget_greeting — what the dashboard's
  //                                         Channels → Chat Widget → Appearance
  //                                         "Opening Greeting" field saves.
  //                                         Channel-specific. Right answer.
  //   2. hardcoded default                — friendly fallback if the customer
  //                                         hasn't set anything yet.
  //
  // We deliberately do NOT fall through to `cfg.greeting` (the unified
  // Identity tab "Greeting Message" field). That field is for VOICE/PHONE —
  // it's surfaced to the Retell phone agent's begin_message and to OpenClaw's
  // SOUL.md. PR #449 wired it into the widget too as a "ghost UI" fix, but
  // that produced the opposite bug: customers who set a phone greeting like
  // "Thank you for calling Purple Lotus..." saw it surface in the chat widget
  // ("Thank you for calling" reads completely wrong on a chat surface).
  //
  // The two greetings are SUPPOSED to be independent — chat ≠ voice. The
  // dashboard already has both fields wired to separate inputs. The widget
  // just needs to read the one that belongs to it.
  const widgetGreeting =
    (cfg.widget_greeting as string) ||
    `Hi! 👋 How can I help you today?`;
  // Free and Lite plans: badge always on regardless of config
  const planForcedBadge = ['free', 'starter'].includes(agencyPlan);
  const widgetPoweredBy = planForcedBadge ? true : (cfg.widget_powered_by !== false);
  const widgetPosition = (cfg.widget_position as string) || 'bottom-right';
  const widgetAvatarEmoji = (cfg.widget_avatar as string) || '🤖';
  const apiBase = (process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com').replace(/\/$/, '');

  // The entire widget as a self-contained IIFE.
  // Top-of-file version stamp helps customers verify they're seeing the
  // freshest script — open dev tools, "View Source" on the script URL,
  // first line shows save timestamp. Should match agency_clients.updated_at.
  const versionStamp = `/* kyra-widget client=${clientId.slice(0, 8)} version=${updatedAtRaw} */\n`;
  const script = versionStamp + `
(function() {
  'use strict';

  var CLIENT_ID = ${JSON.stringify(clientId)};
  var API_BASE = ${JSON.stringify(apiBase)};
  var TITLE = ${JSON.stringify(widgetTitle)};
  var COLOR = ${JSON.stringify(widgetColor)};
  var GREETING = ${JSON.stringify(widgetGreeting)};
  var POWERED_BY = ${JSON.stringify(widgetPoweredBy)};
  var POSITION = ${JSON.stringify(widgetPosition)};
  var AVATAR = ${JSON.stringify(widgetAvatarEmoji)};
  // Brand customization: logo URL (overrides emoji), font family, secondary
  // accent color. Logo is rendered as an <img> tag when set; falls back to
  // emoji when empty. Font is a Google Font name or "system" for the
  // default stack. Secondary color is used for accent surfaces (hover
  // highlights, chip tints); falls back to a translucent variant of the
  // primary brand color when blank.
  var LOGO_URL = ${JSON.stringify((cfg.widget_logo_url as string | undefined) || '')};
  var FONT_FAMILY = ${JSON.stringify((cfg.widget_font_family as string | undefined) || 'system')};
  var SECONDARY_COLOR = ${JSON.stringify((cfg.widget_secondary_color as string | undefined) || '')};
  var QUICK_REPLIES = ${JSON.stringify((cfg.widget_quick_replies as string[]) || getIndustryQuickReplies((cfg.industry as string) || (client?.industry as string) || '', cfg))};
  var STORE_ID = ${JSON.stringify((cfg.jane_default_store_id as string) || '')};
  var JANE_STORES = ${JSON.stringify((cfg.jane_stores as Array<{ id: string; name: string; address?: string }>) || [])};
  var STORAGE_KEY = 'kyra_session_' + CLIENT_ID;
  // Agent-takeover poll loop state. Cursor lives in localStorage so reloads
  // and page nav don't re-render the same agent reply twice. The 6s poll
  // interval is the floor that keeps the experience feeling live without
  // burning the 30/min rate limit at /api/widget/.../poll.
  var POLL_CURSOR_KEY = 'kyra_agent_cursor_' + CLIENT_ID;
  var AGENT_POLL_INTERVAL_MS = 6000;
  var agentPollTimer = null;
  var agentJoinedAnnounced = false;
  // Defense-in-depth dedupe. Even with the cursor working, a network
  // hiccup or a clock skew between client + server could in theory cause
  // the same agent message id to come back twice. Tracking rendered ids
  // means at worst the visitor sees one bubble per message id, period.
  var renderedAgentIds = {};
  // Age gate (cannabis compliance) — strictly OPT-IN per client.
  // Most dispensary websites already have a site-wide 21+ gate, so doubling
  // up inside the widget is redundant and adds an extra click for every
  // returning visitor. Operators who want the widget to also enforce a
  // gate (e.g. because they embed on a site without one) can flip
  // container_config.widget_age_gate to true. Default off.
  var INDUSTRY = ${JSON.stringify((cfg.industry as string) || (client?.industry as string) || '')};
  var AGE_GATE_ENABLED = ${JSON.stringify(cfg.widget_age_gate === true)};
  var AGE_GATE_KEY = 'kyra_age_verified_' + CLIENT_ID;
  // Trending / best-sellers proactive surface — fires on widget open once
  // welcome + quick-replies are rendered. Disabled per-client via
  // widget_trending_enabled=false. Default on; gracefully no-ops when the
  // client doesn't have Jane Algolia configured.
  var TRENDING_ENABLED = ${JSON.stringify(cfg.widget_trending_enabled !== false)};
  // Disclaimer fine-print shown beneath the textarea. Default copy is
  // cannabis-specific (the most common use case); other industries are
  // expected to override via container_config.widget_disclaimer.
  // Set to empty string to hide the disclaimer entirely.
  var WIDGET_DISCLAIMER = ${JSON.stringify(
    typeof cfg.widget_disclaimer === 'string'
      ? cfg.widget_disclaimer
      : 'AI-generated recommendations. Always consult a budtender for personalized advice.'
  )};
  // Behavior toggles (previously saved in container_config but unread —
  // wiring fixed 2026-05-12). Each defaults to "on" so existing tenants
  // keep prior behavior; operators can turn off per-client in Settings.
  var PROACTIVE_DELAY_MS = ${JSON.stringify(Math.max(0, Number(cfg.widget_proactive_delay ?? 8)) * 1000)};
  var SOUND_ENABLED = ${JSON.stringify(cfg.widget_sound !== false)};

  // Don't init twice
  // Single-mount guard. Two layers:
  //   1. window.__kyraWidget — protects against the script tag being injected
  //      and executed twice from the same page (typical case: customer pasted
  //      the embed snippet once in their HTML and once via GTM/Tag Manager).
  //   2. Existing FAB DOM check — if the button is already in the DOM (from
  //      a prior successful mount that left orphaned state, e.g. the global
  //      got cleared by some navigation framework), don't double-render.
  // Customer 2026-05-04 reported "two widget instances on the page" — most
  // likely two embed snippets in their site, but the DOM check makes the
  // guard bulletproof against weirder pathological cases too.
  if (window.__kyraWidget) return;
  if (document.getElementById('kyra-widget-btn')) return;
  window.__kyraWidget = true;

  // ── Google Font loader (only when explicitly configured) ───────────────────
  // Per-client font family. "system" → use the OS default stack (no extra
  // HTTP request). Anything else triggers a Google Fonts <link> injection.
  // We intentionally only support a small allowlist of Google Fonts to keep
  // the surface tight and the perf impact bounded.
  var FONT_GOOGLE_NAMES = { 'Inter':1, 'Roboto':1, 'Open Sans':1, 'Poppins':1, 'Nunito':1, 'Lato':1 };
  var WIDGET_FONT_STACK = 'system-ui,-apple-system,"SF Pro Text","Segoe UI",sans-serif';
  if (FONT_FAMILY && FONT_GOOGLE_NAMES[FONT_FAMILY]) {
    try {
      var fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(FONT_FAMILY).replace(/%20/g, '+') + ':wght@400;500;600;700;800&display=swap';
      document.head.appendChild(fontLink);
      WIDGET_FONT_STACK = '"' + FONT_FAMILY + '",' + WIDGET_FONT_STACK;
    } catch(e) {}
  }
  // Accent color — used for chip tints, hover surfaces, support-link
  // backgrounds. Falls back to a translucent version of the brand color
  // when not explicitly set (preserves prior visual behavior).
  var ACCENT = SECONDARY_COLOR || COLOR;

  // ── Styles ──────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    // Global font override — applies to every kyra-* widget element via
    // descendant selectors. Existing rules with hardcoded font-family stacks
    // get overridden by these because they're more specific (have a kyra-*
    // ancestor), but we also re-declare on the most prominent surfaces so
    // older overrides don't win when CSS specificity ties.
    '#kyra-widget-panel, #kyra-widget-panel *, #kyra-widget-btn, #kyra-proactive { font-family:' + WIDGET_FONT_STACK + '; }',
    '*, *::before, *::after { box-sizing:border-box; }',
    /* FAB Button — premium with glow */
    // FAB sized down 64→56 (operator feedback 2026-05-15: previous size
    // felt too big against modern chat widgets like Voodoo/Intercom).
    '#kyra-widget-btn { position:fixed; bottom:28px; ' + (POSITION === 'bottom-left' ? 'left:28px;' : 'right:28px;') + ' width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg, ' + COLOR + ', ' + COLOR + 'dd); border:none; cursor:pointer; box-shadow:0 6px 20px ' + COLOR + '55, 0 2px 6px rgba(0,0,0,0.15); z-index:99999; display:flex; align-items:center; justify-content:center; transition:transform 0.2s ease, box-shadow 0.2s ease; }',
    '#kyra-widget-btn:hover { transform:scale(1.06); box-shadow:0 8px 28px ' + COLOR + '66, 0 4px 10px rgba(0,0,0,0.2); }',
    '#kyra-widget-btn svg { width:24px; height:24px; fill:white; transition:transform 0.3s ease; }',
    /* Badge */
    '#kyra-widget-badge { position:absolute; top:-4px; right:-4px; min-width:20px; height:20px; background:#ef4444; border-radius:10px; display:none; align-items:center; justify-content:center; font-size:11px; color:#fff; font-weight:700; font-family:system-ui,-apple-system,sans-serif; padding:0 5px; border:2px solid #fff; }',
    /* Backdrop */
    '#kyra-widget-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.35); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); z-index:99997; }',
    /* Panel — modern glass morphism */
    // Panel sizing — calibrated against the Voodoo/Intercom reference
    // (operator feedback 2026-05-15: prior 800px cap was TOO TALL on
    // desktop). Three goals:
    //   1. Spacious enough to comfortably read a multi-message thread
    //   2. NEVER reach the top half of the viewport on a laptop
    //   3. Leave visible page chrome above on mobile so the visitor
    //      knows they're still on the same site
    // Values that hit all three:
    //   Width  : clamp(360px, 28vw, 400px)  — narrower, feels chat-like
    //   Height : clamp(560px, 75vh, 680px)  — 680px cap, was 800
    //   max-height calc(100vh - 120px)      — 20px more bottom buffer
    '#kyra-widget-panel { position:fixed; bottom:96px; ' + (POSITION === 'bottom-left' ? 'left:28px; transform-origin:bottom left;' : 'right:28px; transform-origin:bottom right;') + ' width:clamp(360px, 28vw, 400px); max-width:calc(100vw - 32px); height:clamp(560px, 75vh, 680px); max-height:calc(100vh - 120px); background:#fff; color:#111; border-radius:24px; box-shadow:0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.04); z-index:99998; display:flex; flex-direction:column; overflow:hidden; transition:opacity 0.25s ease, transform 0.25s ease; }',
    '#kyra-widget-panel.hidden { opacity:0; transform:translateY(16px) scale(0.96); pointer-events:none; }',
    /* Header — gradient with blur */
    '#kyra-widget-header { background:linear-gradient(135deg, ' + COLOR + ', ' + COLOR + 'cc); padding:18px 20px; display:flex; align-items:center; gap:14px; }',
    '#kyra-widget-header .avatar { width:44px; height:44px; border-radius:50%; background:rgba(255,255,255,0.2); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; border:2px solid rgba(255,255,255,0.25); }',
    '#kyra-widget-header .info { flex:1; min-width:0; }',
    '#kyra-widget-header .title { color:#fff; font-weight:800; font-size:16px; font-family:system-ui,-apple-system,"SF Pro Display",sans-serif; letter-spacing:-0.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
    '#kyra-widget-header .subtitle { color:rgba(255,255,255,0.8); font-size:12.5px; font-family:system-ui,-apple-system,sans-serif; display:flex; align-items:center; gap:5px; margin-top:2px; }',
    /* 2026-05-13: #kyra-now-serving CSS removed along with the badge it
       styled. Store context still detected silently server-side. */
    '#kyra-widget-header .online-dot { width:8px; height:8px; border-radius:50%; background:#4ade80; flex-shrink:0; animation:kyra-pulse 2s infinite; }',
    '@keyframes kyra-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.4)} 50%{box-shadow:0 0 0 6px rgba(74,222,128,0)} }',
    '#kyra-widget-header .close-btn { background:rgba(255,255,255,0.12); border:none; cursor:pointer; color:#fff; font-size:18px; line-height:1; padding:6px; border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background 0.15s; }',
    '#kyra-widget-header .close-btn:hover { background:rgba(255,255,255,0.22); }',
    /* Messages */
    // overscroll-behavior:contain stops scroll-chaining: when the visitor
    // hits the top or bottom of the conversation on mobile, the host page
    // doesn't pull-to-refresh or scroll behind the sheet. -webkit-overflow-
    // scrolling:touch keeps iOS momentum scrolling smooth. overscroll-
    // behavior-y:contain is the y-axis-specific form some older Androids
    // honor when the generic property is ignored.
    '#kyra-widget-messages { flex:1; overflow-y:auto; padding:20px 16px; display:flex; flex-direction:column; gap:10px; background:linear-gradient(180deg, #f7f8fa 0%, #f0f1f5 100%); -webkit-overflow-scrolling:touch; overscroll-behavior:contain; overscroll-behavior-y:contain; }',
    '.kyra-msg { display:flex; align-items:flex-end; gap:8px; max-width:85%; animation:kyra-msg-in 0.25s ease; }',
    '.kyra-msg.user { margin-left:auto; flex-direction:row-reverse; }',
    '@keyframes kyra-msg-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }',
    '.kyra-msg-bubble { padding:12px 16px; border-radius:20px; font-size:14.5px; line-height:1.6; font-family:system-ui,-apple-system,"SF Pro Text",sans-serif; word-wrap:break-word; word-break:break-word; }',
    '.kyra-msg.bot .kyra-msg-bubble { background:#fff; color:#1a1a1a; border-bottom-left-radius:6px; box-shadow:0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03); }',
    '.kyra-product-link { color:' + COLOR + '; text-decoration:none; font-weight:600; display:inline-block; margin-top:6px; padding:8px 16px; background:' + COLOR + '10; border-radius:12px; border:1px solid ' + COLOR + '25; transition:all 0.15s; font-size:13px; }',
    '.kyra-product-link:hover { background:' + COLOR + '20; transform:translateY(-1px); box-shadow:0 2px 6px ' + COLOR + '22; }',
    '.kyra-msg.bot .kyra-msg-bubble a:not(.kyra-product-link) { color:' + COLOR + '; text-decoration:underline; }',
    '.kyra-msg.user .kyra-msg-bubble { background:linear-gradient(135deg, ' + COLOR + ', ' + COLOR + 'dd); color:#fff; border-bottom-right-radius:6px; box-shadow:0 2px 8px ' + COLOR + '33; }',
    '.kyra-msg.user .kyra-msg-bubble a { color:#fff; text-decoration:underline; }',
    /* Agent / human-takeover bubbles. Distinct teal accent + small "Agent"
       label above the bubble so visitors immediately know the reply is
       from a person, not the AI. */
    '.kyra-msg.agent .kyra-msg-avatar { background:linear-gradient(135deg, #0d9488, #14b8a6); color:#fff; }',
    '.kyra-msg.agent .kyra-msg-bubble { background:#fff; color:#0f172a; border:1.5px solid #99f6e4; border-bottom-left-radius:6px; box-shadow:0 1px 4px rgba(13,148,136,0.12); position:relative; margin-top:14px; }',
    '.kyra-msg.agent .kyra-msg-bubble:before { content:attr(data-agent-name); position:absolute; top:-16px; left:2px; font-size:11px; font-weight:600; color:#0d9488; letter-spacing:0.02em; }',
    /* "Team member just joined" inline system notice */
    '.kyra-agent-joined { align-self:center; max-width:80%; margin:6px auto; padding:6px 14px; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:14px; color:#065f46; font-size:12px; font-weight:600; font-family:system-ui,-apple-system,sans-serif; text-align:center; }',
    '.kyra-msg-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, ' + COLOR + ', ' + COLOR + 'aa); display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.1); }',
    /* Typing dots — smoother */
    '.kyra-typing { display:flex; align-items:center; gap:5px; padding:12px 16px; }',
    '.kyra-typing span { width:8px; height:8px; border-radius:50%; background:#b0b5c0; animation:kyra-bounce 1.4s ease-in-out infinite; }',
    '.kyra-typing span:nth-child(2) { animation-delay:0.15s; }',
    '.kyra-typing span:nth-child(3) { animation-delay:0.3s; }',
    '@keyframes kyra-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-8px)} }',
    /* Input — pill style */
    // Input area wraps the textarea + send button on the top row and the
    // disclaimer fine-print below — two-row flex so the disclaimer stays
    // anchored to the bottom of the panel and never overlaps the bubble.
    '#kyra-widget-input-area { padding:14px 16px 10px; background:#fff; border-top:1px solid #eef0f4; display:flex; flex-direction:column; gap:6px; padding-bottom:max(10px, env(safe-area-inset-bottom)); }',
    '#kyra-widget-input-row { display:flex; gap:10px; align-items:flex-end; }',
    // Taller textarea so the message field doesn't feel cramped on first
    // type. min-height 56px ≈ 2 visible lines + breathing room. Still
    // grows up to max-height:120px before scrolling.
    '#kyra-widget-input { flex:1; border:1.5px solid #e8eaf0; border-radius:20px; padding:14px 18px; font-size:15px; font-family:system-ui,-apple-system,sans-serif; resize:none; outline:none; min-height:56px; max-height:120px; line-height:1.4; color:#1a1a1a; background:#f7f8fa; -webkit-appearance:none; transition:border-color 0.2s, box-shadow 0.2s, background 0.2s; }',
    // Disclaimer — small, centered, low-contrast. Hardcoded copy for
    // cannabis dispensaries; non-cannabis tenants get it overridden via
    // container_config.widget_disclaimer (handled below via WIDGET_DISCLAIMER).
    '#kyra-widget-disclaimer { font-size:10.5px; line-height:1.35; color:#9ca3af; text-align:center; padding:0 6px; font-family:system-ui,-apple-system,sans-serif; }',
    '#kyra-widget-input:focus { border-color:' + COLOR + '; box-shadow:0 0 0 3px ' + COLOR + '18; background:#fff; }',
    '#kyra-widget-input::placeholder { color:#a0a5b0; }',
    '#kyra-widget-send { width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, ' + COLOR + ', ' + COLOR + 'cc); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.2s ease; box-shadow:0 2px 8px ' + COLOR + '33; }',
    '#kyra-widget-send:hover { transform:scale(1.06); box-shadow:0 4px 12px ' + COLOR + '44; }',
    '#kyra-widget-send:disabled { opacity:0.4; cursor:not-allowed; transform:none; box-shadow:none; }',
    '#kyra-widget-send svg { width:18px; height:18px; fill:white; }',
    /* Powered by */
    '#kyra-widget-powered { text-align:center; padding:8px 12px; background:linear-gradient(180deg, #faf9ff, #f5f3ff); border-top:1px solid #eeeaff; }',
    '#kyra-widget-powered a { font-size:11px; color:#8b7ec8; text-decoration:none; font-weight:500; transition:color 0.2s; }',
    '#kyra-widget-powered a:hover { color:#6366f1; }',
    /* Quick replies — pill buttons */
    '.kyra-quick-replies { display:flex; flex-wrap:wrap; gap:7px; padding:6px 16px 10px; }',
    '.kyra-quick-btn { background:#fff; color:#374151; border:1.5px solid #e5e7eb; border-radius:24px; padding:8px 16px; font-size:13px; font-weight:500; font-family:system-ui,-apple-system,sans-serif; cursor:pointer; transition:all 0.2s ease; white-space:nowrap; box-shadow:0 1px 3px rgba(0,0,0,0.04); }',
    '.kyra-quick-btn:hover { background:' + COLOR + '; color:#fff; border-color:' + COLOR + '; box-shadow:0 2px 8px ' + COLOR + '33; transform:translateY(-1px); }',
    /* CTA chips (URL-bearing). Brand-color text + thicker border in resting
       state, FILLED brand-color background + white text on hover. The 2026-05-13
       bug: inline style.color = COLOR was winning over .kyra-quick-btn:hover,
       leaving text invisible (brand-on-brand). Dedicated class fixes it. */
    '.kyra-quick-btn-cta { color:' + COLOR + '; border-color:' + COLOR + '60; font-weight:700; }',
    '.kyra-quick-btn-cta:hover { color:#fff !important; background:' + COLOR + '; border-color:' + COLOR + '; }',
    /* Product cards — structured grid rendering of live inventory.
       Cards container fades in when added to the DOM (after the streamed
       text bubble finishes) so the visual order reads naturally. */
    '.kyra-cards { display:flex; flex-direction:column; gap:10px; padding:8px 16px 8px; animation:kyra-fade-in 0.35s ease; }',
    '.kyra-card { display:flex; gap:12px; background:#fff; border:1px solid #eef0f4; border-radius:16px; padding:12px; box-shadow:0 1px 3px rgba(0,0,0,0.04); transition:transform 0.15s, box-shadow 0.15s; font-family:system-ui,-apple-system,"SF Pro Text",sans-serif; position:relative; }',
    '.kyra-card:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,0.08); border-color:' + COLOR + '40; }',
    /* Out-of-stock overlay — Jane Menu API V1 freshness check (Phase 1b) */
    '.kyra-card.out-of-stock { opacity:0.55; }',
    '.kyra-card.out-of-stock:hover { transform:none; box-shadow:0 1px 3px rgba(0,0,0,0.04); border-color:#eef0f4; }',
    '.kyra-card.out-of-stock::after { content:"OUT OF STOCK"; position:absolute; top:14px; right:14px; background:rgba(220,38,38,0.95); color:#fff; padding:3px 9px; font-size:10px; font-weight:800; letter-spacing:0.06em; border-radius:6px; pointer-events:none; box-shadow:0 1px 3px rgba(0,0,0,0.2); }',
    '.kyra-card-img { width:72px; height:72px; border-radius:12px; object-fit:cover; background:linear-gradient(135deg, #f3f4f6, #e5e7eb); flex-shrink:0; }',
    '.kyra-card-img.placeholder { display:flex; align-items:center; justify-content:center; font-size:28px; color:' + COLOR + '99; }',
    '.kyra-card-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }',
    '.kyra-card-name { font-weight:700; font-size:14px; color:#111827; line-height:1.3; }',
    '.kyra-card-brand { font-size:12px; color:#6b7280; font-weight:500; }',
    // Reviews + ratings — Jane already exposes aggregate_rating and review_count
    // on every menu product; surfacing them is a textbook conversion lever
    // (10-20% lift in typical e-commerce A/B tests). Star is unicode so no
    // image asset; amber color matches industry convention (Amazon, Yelp, etc.).
    '.kyra-card-rating { display:inline-flex; align-items:center; gap:3px; font-size:11px; color:#6b7280; font-weight:500; margin-top:1px; }',
    '.kyra-card-rating .star { color:#f59e0b; font-size:12px; line-height:1; }',
    '.kyra-card-rating .score { color:#1f2937; font-weight:700; }',
    '.kyra-card-meta { display:flex; flex-wrap:wrap; gap:6px; margin-top:2px; }',
    '.kyra-card-chip { font-size:11px; font-weight:600; padding:2px 8px; border-radius:10px; background:' + COLOR + '14; color:' + COLOR + '; letter-spacing:0.01em; }',
    // Strain-type chip colors are INTENTIONALLY semantic, not branded: cannabis UX
    // convention is indica=green, sativa=amber, hybrid=indigo, CBD=blue across every
    // major dispensary platform (Weedmaps, Leafly, Jane). Overriding with tenant COLOR
    // would break recognition for consumers. The default kyra-card-chip fallback
    // (previous line) uses COLOR for non-strain chips (THC, CBD %, weight).
    '.kyra-card-chip.strain-indica { background:#dcfce7; color:#166534; }',
    '.kyra-card-chip.strain-sativa { background:#fef3c7; color:#92400e; }',
    '.kyra-card-chip.strain-hybrid { background:#e0e7ff; color:#3730a3; }',
    '.kyra-card-chip.strain-cbd { background:#dbeafe; color:#1e40af; }',
    '.kyra-card-actions { display:flex; gap:6px; margin-top:auto; align-items:center; }',
    '.kyra-card-price { font-weight:700; font-size:14px; color:#111827; margin-right:auto; }',
    '.kyra-card-cta { display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:600; color:#fff; background:linear-gradient(135deg, ' + COLOR + ', ' + COLOR + 'cc); padding:6px 12px; border-radius:10px; text-decoration:none; transition:all 0.15s; white-space:nowrap; box-shadow:0 1px 3px ' + COLOR + '33; }',
    '.kyra-card-cta:hover { transform:translateY(-1px); box-shadow:0 2px 6px ' + COLOR + '44; }',
    '.kyra-card-cta.secondary { background:#fff; color:' + COLOR + '; border:1.5px solid ' + COLOR + '40; box-shadow:none; }',
    '.kyra-card-cta.secondary:hover { background:' + COLOR + '10; }',
    '.kyra-browse-more { text-align:center; margin:4px 16px 8px; padding:10px 16px; border-radius:14px; background:linear-gradient(135deg, ' + COLOR + '12, ' + COLOR + '20); color:' + COLOR + '; font-weight:600; font-size:13px; text-decoration:none; display:block; border:1px dashed ' + COLOR + '40; transition:all 0.15s; }',
    '.kyra-browse-more:hover { background:' + COLOR + '; color:#fff; border-style:solid; border-color:' + COLOR + '; }',
    '.kyra-fallback-note { font-size:12px; color:#78350f; background:#fef3c7; border-left:3px solid #f59e0b; padding:8px 12px; border-radius:8px; margin:4px 16px; font-family:system-ui,-apple-system,sans-serif; }',
    /* Support-link pill chips — rendered when the user asks about ordering, delivery, hours, etc */
    '.kyra-support-links { display:flex; flex-wrap:wrap; gap:7px; padding:4px 16px 10px; }',
    '.kyra-support-link { display:inline-flex; align-items:center; gap:5px; font-size:12.5px; font-weight:600; color:' + COLOR + '; background:' + COLOR + '10; border:1.5px solid ' + COLOR + '30; padding:7px 14px; border-radius:20px; text-decoration:none; transition:all 0.15s; font-family:system-ui,-apple-system,sans-serif; }',
    '.kyra-support-link:hover { background:' + COLOR + '; color:#fff; border-color:' + COLOR + '; transform:translateY(-1px); box-shadow:0 2px 6px ' + COLOR + '33; }',
    '.kyra-support-link:before { content:"\u2192"; font-weight:700; font-size:13px; opacity:0.7; }',
    /* Proactive bubble */
    '#kyra-proactive { position:fixed; bottom:96px; ' + (POSITION === 'bottom-left' ? 'left:28px;' : 'right:28px;') + ' background:#fff; padding:14px 18px; border-radius:20px 20px 6px 20px; box-shadow:0 8px 30px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04); font-size:14px; color:#1a1a1a; font-family:system-ui,-apple-system,sans-serif; max-width:300px; z-index:99996; cursor:pointer; animation:kyra-fade-in 0.35s ease; line-height:1.5; }',
    '#kyra-proactive .close { position:absolute; top:6px; right:10px; cursor:pointer; color:#b0b5c0; font-size:14px; transition:color 0.15s; }',
    '#kyra-proactive .close:hover { color:#6b7280; }',
    '@keyframes kyra-fade-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }',
    /* Age gate — cannabis compliance modal, shown over the chat panel on first
       open until the visitor confirms they're 21+. Independent overlay so it
       blocks all chat interaction until verified. */
    '#kyra-age-gate { position:absolute; inset:0; background:rgba(255,255,255,0.97); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:10; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 24px; text-align:center; border-radius:24px; }',
    '#kyra-age-gate .icon { font-size:42px; margin-bottom:12px; }',
    '#kyra-age-gate h3 { font-family:system-ui,-apple-system,sans-serif; font-weight:800; font-size:20px; color:#111827; margin:0 0 8px; }',
    '#kyra-age-gate p { font-family:system-ui,-apple-system,sans-serif; font-size:14px; color:#4b5563; line-height:1.5; margin:0 0 24px; max-width:280px; }',
    '#kyra-age-gate .buttons { display:flex; gap:10px; width:100%; max-width:280px; }',
    '#kyra-age-gate button { flex:1; padding:12px 16px; border-radius:12px; font-size:14px; font-weight:700; font-family:system-ui,-apple-system,sans-serif; cursor:pointer; transition:transform 0.15s, box-shadow 0.15s; border:none; }',
    '#kyra-age-gate .yes { background:linear-gradient(135deg, ' + COLOR + ', ' + COLOR + 'dd); color:#fff; box-shadow:0 2px 8px ' + COLOR + '33; }',
    '#kyra-age-gate .yes:hover { transform:translateY(-1px); box-shadow:0 4px 12px ' + COLOR + '44; }',
    '#kyra-age-gate .no { background:#f3f4f6; color:#374151; }',
    '#kyra-age-gate .no:hover { background:#e5e7eb; }',
    '#kyra-age-gate .disclaimer { margin-top:18px; font-size:11px; color:#9ca3af; max-width:260px; line-height:1.4; }',
    /* Trending / Best-sellers — proactive discovery surface shown on widget
       open. Rendered as a HORIZONTAL scrollable strip of compact mini-cards
       instead of full-width product rows. This was a 2026-05-12 UX redesign:
       the original 3 vertical cards (~360px) plus the greeting + 5 quick
       replies blew past the 580px panel height. The strip variant takes ~140px
       total, swipeable for the second+ card, and matches the trending/popular
       pattern customers know from Amazon / Instacart / Doordash. */
    '.kyra-trending-header { display:flex; align-items:center; gap:6px; padding:10px 16px 4px; font-size:12px; font-weight:700; color:#111827; font-family:system-ui,-apple-system,sans-serif; letter-spacing:0.01em; }',
    '.kyra-trending-header .pulse { width:7px; height:7px; border-radius:50%; background:#ef4444; animation:kyra-pulse 2s infinite; flex-shrink:0; }',
    /* 2026-05-12 v2: hard-cap the strip at 150px tall so even a 580px panel
       (greeting + 3 chips + header + strip + input area) never overflows.
       Cards are now image-forward 132px wide × ~130px tall, image 70px,
       single-line name, inline price + rating. Whole card is the click. */
    '.kyra-trending-strip { display:flex; gap:8px; padding:2px 16px 10px; overflow-x:auto; overflow-y:hidden; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; scrollbar-width:none; max-height:148px; }',
    '.kyra-trending-strip::-webkit-scrollbar { display:none; }',
    '.kyra-trending-card { flex:0 0 132px; scroll-snap-align:start; background:#fff; border:1px solid #eef0f4; border-radius:12px; padding:7px; box-shadow:0 1px 3px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:4px; text-decoration:none; color:inherit; transition:transform 0.15s, box-shadow 0.15s, border-color 0.15s; }',
    '.kyra-trending-card:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,0.08); border-color:' + COLOR + '40; }',
    '.kyra-trending-card .img { width:100%; height:70px; border-radius:8px; object-fit:cover; background:linear-gradient(135deg, #f3f4f6, #e5e7eb); display:block; }',
    '.kyra-trending-card .img.placeholder { display:flex; align-items:center; justify-content:center; font-size:24px; color:' + COLOR + '99; }',
    '.kyra-trending-card .name { font-weight:700; font-size:11.5px; color:#111827; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
    '.kyra-trending-card .meta { display:flex; align-items:center; justify-content:space-between; gap:6px; font-size:10.5px; }',
    '.kyra-trending-card .rating { display:inline-flex; align-items:center; gap:2px; color:#6b7280; font-weight:500; }',
    '.kyra-trending-card .rating .star { color:#f59e0b; font-size:11px; line-height:1; }',
    '.kyra-trending-card .rating .score { color:#1f2937; font-weight:700; }',
    '.kyra-trending-card .price { font-weight:700; font-size:12px; color:#111827; }',
    // ── Mobile full-screen sheet (≤600px) ───────────────────────────────────
    // Operator feedback 2026-05-20: prior 0.85 × visualViewport math left a
    // 15% gray strip above the panel and collapsed the chat area to ~150px
    // when the iOS keyboard opened. Industry standard (Voodoo, Intercom,
    // Drift, ManyChat) on mobile is a full-screen sheet — panel covers the
    // visible viewport edge-to-edge.
    //
    // CSS owns the FIRST PAINT (before applyMobileLayout JS runs). The JS
    // afterward refines for visualViewport accuracy on keyboard open/close,
    // but these defaults guarantee no flash of "small panel" even if JS
    // execution is delayed (slow third-party host page, blocking script).
    //
    // 100dvh is the modern dynamic viewport unit — auto-resizes when the
    // mobile browser chrome shows/hides AND when the keyboard opens.
    // Fallback chain: 100dvh → 100vh (older Safari/Chrome). The two height
    // declarations rely on the cascade: if 100dvh is unsupported, the
    // parser drops it and 100vh wins. Order matters here.
    //
    // !important is required because the desktop rule above uses
    // clamp(...) values that would otherwise win specificity.
    '@media (max-width: 600px) {',
    '  #kyra-widget-panel {',
    '    position: fixed !important;',
    '    left: 0 !important; right: 0 !important;',
    '    bottom: 0 !important; top: 0 !important;',
    '    width: 100% !important; max-width: 100% !important;',
    '    height: 100vh !important;',
    '    height: 100dvh !important;',
    '    max-height: 100dvh !important;',
    '    border-radius: 16px 16px 0 0 !important;',
    '  }',
    // Tuck the header padding under the iOS notch / status bar on iPhone X+
    // devices. env(safe-area-inset-top) resolves to ~47px on Pro models, 0
    // on older devices and Android.
    '  #kyra-widget-header { padding-top: max(18px, env(safe-area-inset-top)) !important; }',
    // When the panel is full-screen, hiding the FAB at all times on mobile
    // (open or closed) is fine because the close X in the header handles
    // dismissal. The JS layout function still sets btn.style.display
    // explicitly for the closed state, so this rule only matters during
    // the brief pre-JS first paint.
    '  #kyra-widget-btn.kyra-fab-hidden { display: none !important; }',
    '}',
  ].join('');
  document.head.appendChild(style);

  // ── State ───────────────────────────────────────────────────────────────────
  // sessionId is generated client-side on first script load so EVERY event
  // (including the very first panel_open) is attributable to a session.
  // Without this, first-visit telemetry rows had session_id=NULL and the
  // funnel under-counted "Widget opened" relative to later stages.
  // The server still echoes its own sessionId on the first chat response;
  // we adopt the server's value only if we don't already have one stored.
  var sessionId = null;
  try { sessionId = localStorage.getItem(STORAGE_KEY); } catch(e) {}
  if (!sessionId) {
    try {
      if (window.crypto && window.crypto.randomUUID) {
        sessionId = 'w_' + window.crypto.randomUUID();
      } else {
        sessionId = 'w_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      }
      localStorage.setItem(STORAGE_KEY, sessionId);
    } catch(e) { /* private mode → sessionId stays null, telemetry still flows */ }
  }
  var isOpen = false;
  var isLoading = false;
  var greeted = false;
  var unreadCount = 0;
  var history = []; // [{role:'user'|'assistant', content:string}] — last 10 turns

  // ── Telemetry (Insights tab analytics) ──────────────────────────────────
  // Fire-and-forget event logger. Uses sendBeacon when available so the
  // event survives page unload (critical for chip_click + card_click which
  // are followed by navigation). Falls back to fetch with keepalive.
  // Events are deliberately permissive on labels — operators see whatever
  // string we send under user_message in client_conversations.
  function trackEvent(event, label, url) {
    try {
      var payload = JSON.stringify({ event: event, label: label || '', url: url || '', sessionId: sessionId });
      var endpoint = API_BASE + '/api/widget/' + CLIENT_ID + '/event';
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function(){});
      }
    } catch(e) {}
  }
  // Once-per-session deduplication for panel_open + first_message_sent so
  // we don't double-count when the user toggles the panel.
  var trackedPanelOpen = false;
  var trackedFirstMessage = false;
  var selectedStoreId = STORE_ID; // may be overridden by user picking a store
  try { var savedStore = localStorage.getItem('kyra_store_' + CLIENT_ID); if (savedStore) selectedStoreId = savedStore; } catch(e) {}
  // Auto-pivot override — when the server returns a pivotAction (current
  // orderType has 0 matches but opposite has cards) and the user taps the
  // "Switch to Pickup/Delivery" chip, we lock that channel into subsequent
  // requests so follow-up questions browse the new channel too. Null means
  // "use whatever the storefront cookie says". Resets on page refresh.
  var sessionOrderTypeOverride = null;
  // Track the most-recent USER message text so the pivot CTA can re-fire it
  // with the new channel. Updated at the top of every sendMessage() call.
  var lastUserMessage = '';
  var CHIME = null;
  try { CHIME = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgkKmsi2I3OGiUrKuJYjo6aJSrqodjOzlqla2qimM6Ommdsp+EXkI/b5+zoYReQEB0obOhhF5CP3ies6CFXEI/cKCznYReQT9xo7WjhV9BPm6grKCEXkJAcaO1pIVfQD1un6ufg1xBQHOkt6aHYEA+b6Csn4JcQj9xo7amh19APG2fq5+DW0I/caS3pohhQD5uoKufhFxBPnCjt6aGX0A+baCqnoNcQUFzprioh2FAP26fqZuAWkJAdqe7qopiQT1snaecgFpCP3GkuKqJYkE9bZ6nm39YQT9zp7uqi2NAFG2dp5p9VkI/'); } catch(e) {}

  // ── DOM ─────────────────────────────────────────────────────────────────────
  // Backdrop (mobile only)
  var backdrop = document.createElement('div');
  backdrop.id = 'kyra-widget-backdrop';
  backdrop.addEventListener('click', closePanel);
  document.body.appendChild(backdrop);

  // Chat button
  var btn = document.createElement('button');
  btn.id = 'kyra-widget-btn';
  btn.setAttribute('aria-label', 'Open chat');
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>';
  document.body.appendChild(btn);

  // Unread badge
  var badge = document.createElement('div');
  badge.id = 'kyra-widget-badge';
  btn.appendChild(badge);

  // Panel
  var panel = document.createElement('div');
  panel.id = 'kyra-widget-panel';
  panel.className = 'hidden';
  panel.innerHTML = [
    '<div id="kyra-widget-header">',
    // Logo URL trumps emoji when set. Image is rendered with object-fit:cover
    // so logos at any aspect ratio fill the 44×44 avatar slot cleanly.
    '  <div class="avatar">' + (LOGO_URL ? '<img src="' + escHtml(LOGO_URL) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />' : AVATAR) + '</div>',
    '  <div class="info"><div class="title">' + TITLE + '</div><div class="subtitle"><span class="online-dot"></span>Online · Ready to help</div></div>',
    '  <button class="close-btn" aria-label="Close chat">✕</button>',
    '</div>',
    '<div id="kyra-widget-messages"></div>',
    '<div id="kyra-widget-input-area">',
    '  <div id="kyra-widget-input-row">',
    '    <textarea id="kyra-widget-input" placeholder="Type a message..." rows="1"></textarea>',
    '    <button id="kyra-widget-send" aria-label="Send">',
    '      <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    '    </button>',
    '  </div>',
    WIDGET_DISCLAIMER ? '  <div id="kyra-widget-disclaimer">' + escHtml(WIDGET_DISCLAIMER) + '</div>' : '',
    '</div>',
    POWERED_BY ? '<div id="kyra-widget-powered"><a href="https://kyra.conversionsystem.com?utm_source=widget&utm_medium=powered_by&utm_campaign=viral" rel="noopener">⚡ Powered by <strong>Kyra</strong></a></div>' : '',
  ].join('');
  document.body.appendChild(panel);

  var messagesEl = document.getElementById('kyra-widget-messages');
  var inputEl = document.getElementById('kyra-widget-input');
  var sendBtn = document.getElementById('kyra-widget-send');
  var closeBtn = panel.querySelector('.close-btn');

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function scrollToBottom() {
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(role, text) {
    var msgEl = document.createElement('div');
    msgEl.className = 'kyra-msg ' + role;
    if (role === 'bot') {
      // formatMsg handles markdown stripping + safe HTML + link rendering
      msgEl.innerHTML = '<div class="kyra-msg-avatar">' + (LOGO_URL ? '<img src="' + escHtml(LOGO_URL) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />' : AVATAR) + '</div><div class="kyra-msg-bubble">' + formatMsg(text) + '</div>';
    } else {
      // User messages: escape only, preserve newlines as <br>
      msgEl.innerHTML = '<div class="kyra-msg-bubble">' + escHtml(text).replace(/\\n/g,'<br>') + '</div>';
    }
    messagesEl.appendChild(msgEl);
    scrollToBottom();
    if (role === 'bot' && !isOpen) {
      unreadCount++;
      badge.textContent = unreadCount;
      badge.style.display = 'flex';
      try {
        if (SOUND_ENABLED && !localStorage.getItem('kyra_sound_muted') && CHIME) CHIME.play().catch(function(){});
      } catch(e) {}
    }
    return msgEl;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'kyra-msg bot';
    el.id = 'kyra-typing';
    el.innerHTML = '<div class="kyra-msg-avatar">' + (LOGO_URL ? '<img src="' + escHtml(LOGO_URL) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />' : AVATAR) + '</div><div class="kyra-msg-bubble kyra-typing"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(el);
    scrollToBottom();
  }

  function hideTyping() {
    var el = document.getElementById('kyra-typing');
    if (el) el.remove();
  }

  function showQuickReplies() {
    hideQuickReplies();
    var container = document.createElement('div');
    container.className = 'kyra-quick-replies';
    container.id = 'kyra-quick-replies';
    // QUICK_REPLIES entries are either plain strings (sent as a chat message
    // on click) OR objects { label, url } (open the URL in a new tab on
    // click — useful for CTAs like "LOTUS NOW" that should deep-link to a
    // dedicated page rather than start a conversation).
    QUICK_REPLIES.forEach(function(reply) {
      var label, url;
      if (reply && typeof reply === 'object') {
        label = reply.label || '';
        url = reply.url || '';
      } else {
        label = String(reply || '');
        url = '';
      }
      if (!label) return;
      var qbtn = document.createElement('button');
      // Distinct class for URL chips so the :hover state can flip BOTH bg
      // and text together (inline styles win over :hover with same specificity,
      // which is why the previous attempt left text invisible on hover).
      qbtn.className = url ? 'kyra-quick-btn kyra-quick-btn-cta' : 'kyra-quick-btn';
      qbtn.textContent = label;
      qbtn.addEventListener('click', function() {
        // 2026-05-13 v2: clicking a chip ALWAYS sends a message — including
        // URL-bearing CTA chips. The visitor stays in the chat and gets a
        // real KB-grounded answer. The relevant URL still surfaces below
        // the bot reply via the support-link resolver (resolveSupportLinks
        // in lib/integrations/jane.ts maps "lotus now" / "deals" / "treez
        // pay" intents to their chip URLs). Net result: chips become
        // conversation starters, not navigation buttons.
        if (url) trackEvent('chip_click', label, url);
        inputEl.value = label;
        sendMessage();
      });
      container.appendChild(qbtn);
    });
    messagesEl.appendChild(container);
    scrollToBottom();
  }

  function hideQuickReplies() {
    var el = document.getElementById('kyra-quick-replies');
    if (el) el.remove();
  }

  // 2026-05-13: the "now serving" badge was removed per customer feedback.
  // Store context is still detected silently via readJaneContext() on
  // every chat request — the bot just answers per the right store
  // without any UI artifact in the widget.

  // ── Trending / best-sellers proactive surface ─────────────────────────────
  // Fetches the dispensary's top in-stock sellers and renders them below the
  // welcome quick-replies as a discovery surface. Powered by Jane's
  // best_seller_rank via /api/widget/<clientId>/trending. Fails silently —
  // if the endpoint 404s, returns 0 results, or Jane isn't configured, the
  // welcome flow simply omits the section.
  function fetchAndRenderTrending() {
    if (!TRENDING_ENABLED) return;
    // Don't re-fire if already rendered (e.g., user closed + reopened the panel).
    if (document.getElementById('kyra-trending')) return;
    var jane = readJaneContext();
    var effectiveStoreId = jane.janeStore || window.__kyraStoreId || selectedStoreId || STORE_ID;
    var effectiveChannel = sessionOrderTypeOverride || jane.orderType || 'either';
    var qs = '?limit=3';
    if (effectiveStoreId) qs += '&storeId=' + encodeURIComponent(effectiveStoreId);
    if (effectiveChannel === 'pickup' || effectiveChannel === 'delivery') {
      qs += '&channel=' + effectiveChannel;
    }
    fetch(API_BASE + '/api/widget/' + CLIENT_ID + '/trending' + qs, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
    })
      .then(function(res) { return res.ok ? res.json() : null; })
      .then(function(data) {
        if (!data || !data.products || !data.products.length) return;
        // User may have started typing or sent a message in the meantime —
        // don't barge in once a real conversation has begun. We check by
        // looking for a user message bubble; the welcome state has none.
        if (messagesEl.querySelector('.kyra-msg.user')) return;
        renderTrending(data.label || "\\ud83d\\udd25 Today's Deals", data.products);
      })
      .catch(function() { /* fail silently — discovery is best-effort */ });
  }

  function renderTrending(label, products) {
    if (!products || !products.length) return;
    // Header
    var header = document.createElement('div');
    header.className = 'kyra-trending-header';
    header.id = 'kyra-trending-header';
    header.innerHTML = '<span class="pulse"></span><span>' + escHtml(label) + '</span>';
    messagesEl.appendChild(header);
    // Horizontal compact strip — each card is image + name + rating + price
    // only. Strain chips, THC %, brand line and "View" buttons are dropped
    // because (a) the whole card is clickable now, and (b) those details
    // already live on the in-conversation cards the bot returns when the
    // user asks something specific. Strip mode is for FAST discovery, not
    // detailed comparison.
    var strip = document.createElement('div');
    strip.className = 'kyra-trending-strip';
    strip.id = 'kyra-trending';
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var url = p.cartUrl || p.url || '#';
      var name = p.name || '';
      var price = p.price || '';
      // Image w/ emoji fallback (same convention as in-conversation cards)
      var imgHtml;
      if (p.imageUrl) {
        imgHtml = '<img class="img" src="' + escHtml(p.imageUrl) + '" alt="' + escHtml(name) + '" loading="lazy" />';
      } else {
        imgHtml = '<div class="img placeholder">\\ud83c\\udf3f</div>';
      }
      // Rating row only if we have real signal — same filter as full cards
      var ratingHtml = '';
      if (typeof p.rating === 'number' && p.rating > 0 && typeof p.reviewCount === 'number' && p.reviewCount > 0) {
        var rounded = (Math.round(p.rating * 10) / 10).toFixed(1);
        ratingHtml = '<span class="rating"><span class="star">\\u2605</span><span class="score">' + escHtml(rounded) + '</span></span>';
      }
      var card = document.createElement('a');
      card.className = 'kyra-trending-card';
      card.href = url;
      // 2026-05-13: same-window per customer directive ("ALL LINKS")
      card.rel = 'noopener';
      card.innerHTML =
        imgHtml +
        '<div class="name">' + escHtml(name) + '</div>' +
        '<div class="meta">' + ratingHtml + '<span class="price">' + escHtml(price) + '</span></div>';
      strip.appendChild(card);
    }
    messagesEl.appendChild(strip);
    // Don't scrollToBottom() here — on small viewports, scrolling past the
    // greeting hides the welcome chips. The natural top alignment puts the
    // greeting at the top of the panel; the trending strip is the last
    // welcome element and either fits in remaining viewport or the user
    // can scroll down to swipe. Calling scrollToBottom would push greeting
    // off the top on a sub-450px panel (iPhone SE territory).
  }

  function showStoreSelection() {
    hideQuickReplies();
    var container = document.createElement('div');
    container.className = 'kyra-quick-replies';
    container.id = 'kyra-quick-replies';
    // Header text
    var label = document.createElement('div');
    label.style.cssText = 'width:100%;font-size:13px;color:#6b7280;font-weight:500;padding:0 2px 4px;font-family:system-ui,-apple-system,sans-serif;';
    label.textContent = 'Which store are you visiting?';
    container.appendChild(label);
    JANE_STORES.forEach(function(store) {
      var sbtn = document.createElement('button');
      sbtn.className = 'kyra-quick-btn';
      sbtn.textContent = '📍 ' + store.name;
      sbtn.addEventListener('click', function() {
        selectedStoreId = store.id;
        try { localStorage.setItem('kyra_store_' + CLIENT_ID, store.id); } catch(e) {}
        hideQuickReplies();
        addMessage('user', '📍 ' + store.name);
        addMessage('bot', 'Got it! Showing products from our ' + store.name + ' location.' + (store.address ? ' (' + store.address + ')' : '') + ' What are you looking for today?');
        showQuickReplies();
        // Now that store is known, fetch trending for that specific store.
        fetchAndRenderTrending();
      });
      container.appendChild(sbtn);
    });
    messagesEl.appendChild(container);
    scrollToBottom();
  }

  function escHtml(str) {
    return String(str == null ? '' : str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Render support-link chips — pill buttons below the bot text that guarantee
  // the user gets the right page for informational questions (ordering, delivery,
  // hours, etc). The server resolves the URLs so the LLM can't hallucinate.
  function renderSupportLinks(links) {
    if (!links || !links.length) return;
    var container = document.createElement('div');
    container.className = 'kyra-support-links';
    for (var i = 0; i < links.length; i++) {
      var l = links[i];
      if (!l || !l.url) continue;
      var a = document.createElement('a');
      a.className = 'kyra-support-link';
      a.href = l.url;
      a.rel = 'noopener';
      a.textContent = l.label || 'Learn more';
      container.appendChild(a);
    }
    if (container.childNodes.length > 0) {
      messagesEl.appendChild(container);
      scrollToBottom();
    }
  }

  // Render structured product cards from the API's cards[] array. These live below
  // the bot's text bubble so the LLM's conversation + the live inventory stay linked
  // visually. Safe against XSS — every field is escaped before interpolation.
  function renderCards(cards, browseMore, fallbackNotice) {
    if ((!cards || !cards.length) && !fallbackNotice) return;
    // Telemetry — record how many cards were shown in this exchange so the
    // Insights tab can compute "cards rendered → cards clicked" CTR.
    if (cards && cards.length) {
      trackEvent('cards_shown', String(cards.length), '');
    }
    // Fallback note — amber banner explaining the miss + substitution
    if (fallbackNotice) {
      var note = document.createElement('div');
      note.className = 'kyra-fallback-note';
      note.textContent = fallbackNotice;
      messagesEl.appendChild(note);
    }
    if (cards && cards.length) {
      var container = document.createElement('div');
      container.className = 'kyra-cards';
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        var card = document.createElement('div');
        card.className = 'kyra-card' + (c && c.outOfStock ? ' out-of-stock' : '');
        // Image or emoji placeholder (falls back to 🌿 if no image)
        var imgHtml = c.imageUrl
          ? '<img class="kyra-card-img" src="' + escHtml(c.imageUrl) + '" alt="' + escHtml(c.name) + '" loading="lazy" onerror="this.outerHTML=\\'<div class=&quot;kyra-card-img placeholder&quot;>\\u{1F33F}</div>\\'">'
          : '<div class="kyra-card-img placeholder">\\u{1F33F}</div>';
        var strain = c.strainType ? String(c.strainType).toLowerCase() : '';
        var strainLabel = strain ? strain.charAt(0).toUpperCase() + strain.slice(1) : '';
        var chips = [];
        if (strain) chips.push('<span class="kyra-card-chip strain-' + escHtml(strain) + '">' + escHtml(strainLabel) + '</span>');
        if (c.thc) chips.push('<span class="kyra-card-chip">THC ' + escHtml(c.thc) + '</span>');
        if (c.cbd) chips.push('<span class="kyra-card-chip">CBD ' + escHtml(c.cbd) + '</span>');
        if (c.weight && chips.length < 3) chips.push('<span class="kyra-card-chip">' + escHtml(c.weight) + '</span>');
        var priceHtml = c.price ? '<span class="kyra-card-price">' + escHtml(c.price) + '</span>' : '<span class="kyra-card-price"></span>';
        var primaryUrl = c.cartUrl || c.url;
        var primaryLabel = c.cartUrl ? 'Add to Bag' : 'View \\u2192';
        var actionsHtml =
          '<div class="kyra-card-actions">' +
            priceHtml +
            (c.cartUrl ? '<a class="kyra-card-cta secondary" href="' + escHtml(c.url) + '" rel="noopener">Details</a>' : '') +
            '<a class="kyra-card-cta" href="' + escHtml(primaryUrl) + '" rel="noopener">' + primaryLabel + '</a>' +
          '</div>';
        // Build rating row — only shown if Jane returns a non-zero rating
        // with at least 1 review (filters out brand-new SKUs that have no
        // signal yet, where "★ 0.0 (0 reviews)" would look bad).
        var ratingHtml = '';
        if (typeof c.rating === 'number' && c.rating > 0 && typeof c.reviewCount === 'number' && c.reviewCount > 0) {
          var roundedRating = (Math.round(c.rating * 10) / 10).toFixed(1);
          var reviewLabel = c.reviewCount === 1 ? '1 review' : c.reviewCount.toLocaleString() + ' reviews';
          ratingHtml = '<div class="kyra-card-rating">' +
            '<span class="star">\\u2605</span>' +
            '<span class="score">' + escHtml(roundedRating) + '</span>' +
            '<span>(' + escHtml(reviewLabel) + ')</span>' +
          '</div>';
        }
        card.innerHTML =
          imgHtml +
          '<div class="kyra-card-body">' +
            '<div class="kyra-card-name">' + escHtml(c.name) + '</div>' +
            (c.brand ? '<div class="kyra-card-brand">by ' + escHtml(c.brand) + '</div>' : '') +
            ratingHtml +
            (chips.length ? '<div class="kyra-card-meta">' + chips.join('') + '</div>' : '') +
            actionsHtml +
          '</div>';
        // Attach card_click telemetry to every CTA inside this card. Captures
        // both "View →" / "Add to Bag" and "Details" via the same listener;
        // distinguish via the data-card-id we attach to each anchor.
        (function(cardData) {
          var ctaLinks = card.querySelectorAll('.kyra-card-cta');
          for (var k = 0; k < ctaLinks.length; k++) {
            ctaLinks[k].addEventListener('click', function() {
              trackEvent('card_click',
                (cardData.brand ? cardData.brand + ': ' : '') + (cardData.name || ''),
                this.href || cardData.url || '');
            });
          }
        })(c);
        container.appendChild(card);
      }
      messagesEl.appendChild(container);
    }
    // Browse-more banner (Alien Labs Products, etc.)
    if (browseMore && browseMore.url) {
      var a = document.createElement('a');
      a.className = 'kyra-browse-more';
      a.href = browseMore.url;
      a.addEventListener('click', function() {
        trackEvent('browse_more', browseMore.label || 'Browse', browseMore.url);
      });
      a.rel = 'noopener';
      var totalTxt = browseMore.totalCount ? 'Browse all ' + browseMore.totalCount + ' ' : 'Browse ';
      a.textContent = totalTxt + (browseMore.label || 'Products') + ' \\u2192';
      messagesEl.appendChild(a);
    }
    scrollToBottom();
  }

  // Convert AI response to safe HTML — strips markdown, renders links and newlines cleanly
  // Uses runtime-generated null char placeholders to prevent double-linking
  function formatMsg(raw) {
    var s = raw || '';
    var links = [];
    var PH = String.fromCharCode(0);

    // 1. Convert markdown links [text](url) → null-char placeholder
    s = s.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, function(_, txt, url) {
      var label = txt.toLowerCase().indexOf('http') === 0 ? 'View Product \\u2192' : escHtml(txt);
      links.push('<a href="' + escHtml(url) + '" rel="noopener" class="kyra-product-link">' + label + '</a>');
      return PH + 'L' + (links.length - 1) + PH;
    });

    // 2. Auto-link bare URLs not already captured above
    s = s.replace(/(https?:\\/\\/[^\\s<>"]+[^\\s<>.,!?;:"'\\)])/g, function(url) {
      var label = url.indexOf('/product/') > -1 ? 'View Product \\u2192' : 'View \\u2192';
      links.push('<a href="' + escHtml(url) + '" rel="noopener" class="kyra-product-link">' + label + '</a>');
      return PH + 'L' + (links.length - 1) + PH;
    });

    // 3. Bold and italic (placeholders use null chars — safe from these regexes)
    s = s.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
    s = s.replace(/_([^_]+)_/g, '<em>$1</em>');

    // 4. Strip markdown headers
    s = s.replace(/^#{1,6}\\s+/gm, '');

    // 5. Strip bullet markers
    s = s.replace(/^[\\-\\*\\u2022]\\s+/gm, '');

    // 6. Strip numbered list markers
    s = s.replace(/^\\d+\\.\\s+/gm, '');

    // 7. Collapse 3+ newlines to 2
    s = s.replace(/\\n{3,}/g, '\\n\\n');

    // 8. Newlines to <br>
    s = s.replace(/\\n/g, '<br>');

    // 9. Restore link placeholders
    for (var i = 0; i < links.length; i++) {
      s = s.replace(PH + 'L' + i + PH, links[i]);
    }

    return s;
  }

  // ── Age gate (cannabis compliance) ──────────────────────────────────────────
  // Returns true when the visitor has confirmed 21+ (either now or previously
  // via localStorage). Returns false while the modal is up. When false, the
  // caller should bail out of further panel-opening work; the user clicking
  // "Yes" inside the modal will re-trigger openPanel().
  function isAgeVerified() {
    if (!AGE_GATE_ENABLED) return true;
    try { return localStorage.getItem(AGE_GATE_KEY) === 'true'; } catch(e) { return false; }
  }
  function showAgeGate() {
    if (document.getElementById('kyra-age-gate')) return;
    var modal = document.createElement('div');
    modal.id = 'kyra-age-gate';
    modal.innerHTML = [
      '<div class="icon">\\ud83c\\udf3f</div>',
      '<h3>Are you 21 or older?</h3>',
      '<p>California state law requires us to verify your age before showing cannabis products.</p>',
      '<div class="buttons">',
      '  <button type="button" class="no">No, exit</button>',
      '  <button type="button" class="yes">Yes, I am 21+</button>',
      '</div>',
      '<p class="disclaimer">By selecting "Yes" you confirm you are at least 21 years of age and agree to our terms.</p>',
    ].join('');
    panel.appendChild(modal);
    modal.querySelector('.yes').addEventListener('click', function() {
      try { localStorage.setItem(AGE_GATE_KEY, 'true'); } catch(e) {}
      modal.remove();
      // Re-enter the post-gate flow: greeting + quick replies.
      if (!greeted && messagesEl.children.length === 0) {
        greeted = true;
        addMessage('bot', GREETING);
        if (JANE_STORES.length > 1 && !selectedStoreId) {
          showStoreSelection();
        } else {
          showQuickReplies();
        }
      }
    });
    modal.querySelector('.no').addEventListener('click', function() {
      modal.remove();
      closePanel();
    });
  }

  // ── Toggle ───────────────────────────────────────────────────────────────────
  // ── Agent takeover polling ────────────────────────────────────────────────
  // Poll the server every AGENT_POLL_INTERVAL_MS while the panel is open,
  // pulling any agent-sent messages since our last cursor. New messages
  // render as teal-bordered "Agent" bubbles; on the FIRST agent message
  // we drop a "Team member just joined" green pill above to signal the
  // takeover. Cursor lives in localStorage so panel close/reopen + page
  // navigation don't re-render the same agent reply twice.
  function getAgentCursor() {
    try { return localStorage.getItem(POLL_CURSOR_KEY) || ''; } catch (e) { return ''; }
  }
  function setAgentCursor(iso) {
    if (!iso) return;
    try { localStorage.setItem(POLL_CURSOR_KEY, iso); } catch (e) {}
  }
  function renderAgentJoinedNotice(name) {
    if (agentJoinedAnnounced) return;
    agentJoinedAnnounced = true;
    var notice = document.createElement('div');
    notice.className = 'kyra-agent-joined';
    notice.textContent = '👋 ' + (name || 'A team member') + ' just joined the chat';
    messagesEl.appendChild(notice);
  }
  function renderAgentMessage(msg) {
    // Defense-in-depth: skip if we've already rendered this id. Catches
    // any duplicate-row scenario the server might emit (cursor precision
    // bug, retry on transient error, etc.) without spamming the panel.
    var id = msg && msg.id;
    if (id && renderedAgentIds[id]) return;
    if (id) renderedAgentIds[id] = true;
    var name = (msg.agentName || 'Team member').slice(0, 32);
    renderAgentJoinedNotice(name);
    var msgEl = document.createElement('div');
    msgEl.className = 'kyra-msg agent';
    var avatarChar = (name.charAt(0) || 'T').toUpperCase();
    msgEl.innerHTML =
      '<div class="kyra-msg-avatar">' + escHtml(avatarChar) + '</div>' +
      '<div class="kyra-msg-bubble" data-agent-name="' + escHtml(name) + '">' +
        escHtml(msg.message || '').replace(/\\n/g, '<br>') +
      '</div>';
    messagesEl.appendChild(msgEl);
    scrollToBottom();
    if (!isOpen) {
      unreadCount++;
      badge.textContent = unreadCount;
      badge.style.display = 'flex';
      try {
        if (SOUND_ENABLED && !localStorage.getItem('kyra_sound_muted') && CHIME) CHIME.play().catch(function(){});
      } catch (e) {}
    }
  }
  function pollForAgentMessages() {
    if (!sessionId) return; // No session yet → nothing to poll for
    var since = getAgentCursor();
    var url = API_BASE + '/api/widget/' + CLIENT_ID + '/poll?sessionId=' +
      encodeURIComponent(sessionId) + (since ? '&since=' + encodeURIComponent(since) : '');
    fetch(url, { method: 'GET', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        var messages = data.messages || [];
        for (var i = 0; i < messages.length; i++) {
          renderAgentMessage(messages[i]);
        }
        if (data.cursor) setAgentCursor(data.cursor);
      })
      .catch(function () { /* network blip — try again next tick */ });
  }
  function startAgentPolling() {
    if (agentPollTimer) return;
    // First poll fires immediately so a returning visitor sees the agent's
    // last message right when the panel opens (catches replies sent while
    // the panel was closed).
    pollForAgentMessages();
    agentPollTimer = setInterval(pollForAgentMessages, AGENT_POLL_INTERVAL_MS);
  }
  function stopAgentPolling() {
    if (agentPollTimer) {
      clearInterval(agentPollTimer);
      agentPollTimer = null;
    }
  }

  // ── Body scroll lock (mobile only) ──────────────────────────────────────
  // Why: when the panel is full-screen on mobile, the visitor scrolls the
  // CONVERSATION. Without a lock, iOS scroll-chaining bubbles up to the
  // host page — every time you reach the top or bottom of the chat, the
  // page below scrolls instead. Combined with overscroll-behavior:contain
  // on the messages list this gives a buttery, app-like feel.
  //
  // iOS-safe pattern (the naive "body.style.overflow=hidden" loses your
  // scroll position when you close the widget):
  //   - On lock: snapshot the host's existing style props + window.scrollY,
  //     then position:fixed body with top:-scrollY to visually preserve
  //     where you were while disabling scroll.
  //   - On unlock: restore the snapshotted style props EXACTLY (don't
  //     clobber the host's prior fixed positioning if it had one) and
  //     scrollTo the saved Y so the page is exactly where it was.
  //
  // Idempotent: lockBodyScroll() while already locked is a no-op. Same for
  // unlockBodyScroll() while already unlocked.
  var _scrollLockState = null;
  function lockBodyScroll() {
    if (_scrollLockState) return;
    var b = document.body;
    _scrollLockState = {
      position: b.style.position,
      top: b.style.top,
      left: b.style.left,
      right: b.style.right,
      width: b.style.width,
      overflow: b.style.overflow,
      scrollY: window.scrollY || window.pageYOffset || 0,
    };
    b.style.position = 'fixed';
    b.style.top = '-' + _scrollLockState.scrollY + 'px';
    b.style.left = '0';
    b.style.right = '0';
    b.style.width = '100%';
    b.style.overflow = 'hidden';
  }
  function unlockBodyScroll() {
    if (!_scrollLockState) return;
    var s = _scrollLockState;
    var b = document.body;
    b.style.position = s.position;
    b.style.top = s.top;
    b.style.left = s.left;
    b.style.right = s.right;
    b.style.width = s.width;
    b.style.overflow = s.overflow;
    window.scrollTo(0, s.scrollY);
    _scrollLockState = null;
  }

  function openPanel() {
    isOpen = true;
    if (!trackedPanelOpen) {
      trackedPanelOpen = true;
      trackEvent('panel_open', window.location.pathname || '/', '');
      // Fire a one-time observability event capturing WHICH detection
      // mechanism caught the store. Aggregated in the Insights tab so
      // operators can verify store detection is working without needing
      // to manually inspect the page. Sources:
      //   cookie, localStorage:<key>, __NEXT_DATA__,
      //   __APOLLO_STATE__:<entry>, dom:<selector>, dom:street-regex,
      //   widget-default (fallback from embed STORE_ID), unresolved (none)
      try {
        var detectCtx = readJaneContext();
        var source = detectCtx.janeStoreSource ||
          (detectCtx.janeStore ? 'cookie' :
            (selectedStoreId || STORE_ID) ? 'widget-default' : 'unresolved');
        trackEvent('store_detected', source, detectCtx.janeStore || '');
      } catch(e) {}
    }
    panel.classList.remove('hidden');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    var isMobile = window.innerWidth <= 600;
    if (isMobile) {
      // On mobile: hide the button (close is in the header), show backdrop,
      // and scroll-lock the host page so scrolling inside the conversation
      // doesn't bubble out to the page beneath the sheet.
      btn.style.display = 'none';
      backdrop.style.display = 'block';
      lockBodyScroll();
    }
    unreadCount = 0;
    badge.style.display = 'none';
    badge.textContent = '';
    // Cannabis-vertical age gate: block the greeting + product flow until
    // the visitor confirms 21+. After they click Yes, showAgeGate() will
    // run the same greeting/store/quick-reply sequence below.
    if (!isAgeVerified()) {
      showAgeGate();
    } else if (!greeted && messagesEl.children.length === 0) {
      greeted = true;
      addMessage('bot', GREETING);
      // 2026-05-13: removed the in-widget store picker + "now serving"
      // badge. The visitor already picked their store on the host site
      // (Jane Roots location dropdown); the widget detects that selection
      // SILENTLY via readJaneContext (cookies + localStorage) and ships
      // it along with every chat request. The bot's answers are tailored
      // to the detected store, but there's no UI artifact inside the
      // chat — per customer feedback: "I didn't ask to add a store
      // selection on the chat."
      showQuickReplies();
      fetchAndRenderTrending();
    }
    applyMobileLayout();
    // Start polling for agent (human) replies — fires every AGENT_POLL_INTERVAL_MS
    // while the panel is open. Idempotent; safe to call on each openPanel.
    startAgentPolling();
    setTimeout(function() {
      if (inputEl) {
        inputEl.focus();
        if (isMobile) { setTimeout(applyMobileLayout, 400); }
      }
    }, 100);
  }

  function closePanel() {
    isOpen = false;
    // Restore host-page scrolling BEFORE swapping panel state. unlockBody
    // -Scroll is a no-op on desktop (was never locked) so the call is
    // unconditional — keeps the open/close paths symmetric and idempotent.
    unlockBodyScroll();
    panel.classList.add('hidden');
    btn.style.display = '';
    backdrop.style.display = 'none';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>';
    // Restore desktop button position
    if (window.innerWidth > 600) {
      btn.style.bottom = '24px';
    }
    // Stop the agent-poll loop. We don't need to keep it running while the
    // panel is closed — when the visitor reopens the panel, startAgentPolling
    // fires immediately and catches up via the localStorage cursor. Saves a
    // request every 6s for the (common) case of an idle widget.
    stopAgentPolling();
  }

  btn.addEventListener('click', function() { isOpen ? closePanel() : openPanel(); });

  // Storefront context is read silently on every chat request via
  // readJaneContext() — no UI listener needed. Mid-session location
  // changes get picked up automatically on the visitor's NEXT message
  // because readJaneContext fires fresh each time sendMessage runs.
  closeBtn.addEventListener('click', closePanel);

  // ── Responsive sizing (JS-driven — more reliable than CSS media queries on iOS) ─
  // Calibrated against the Voodoo/Intercom reference 2026-05-15:
  //   Mobile (≤600px)   : 85vh — tall enough to read threads but leaves
  //                       visible page chrome above so the visitor knows
  //                       they're still on the site. (Was 92vh — too
  //                       close to full-screen.)
  //   Tablet+Desktop    : 400 × min(680, vh - 120). Single tier — tablet
  //                       was previously its own tier but with the new
  //                       calmer 400×680 ceiling there's no need to
  //                       differentiate; both feel right.
  function applyMobileLayout() {
    var w = window.innerWidth;
    var isMobile = w <= 600;
    if (isMobile) {
      // Full-screen sheet (operator decision 2026-05-20, Option A): match
      // Voodoo/Intercom/Drift industry pattern. Panel = the entire visible
      // viewport — no 0.85 multiplier, no gray strip above. When the iOS
      // keyboard opens, visualViewport.height shrinks; the input stays
      // pinned to the bottom of the panel (which is glued to the top of
      // the keyboard) and the messages list resizes naturally above.
      //
      // visualViewport.offsetTop matters on iOS when the page is scrolled
      // and the URL bar is showing — without that offset compensation the
      // panel could end up positioned BEHIND the URL bar.
      var vvp = window.visualViewport;
      var vvpHeight = vvp ? vvp.height : window.innerHeight;
      var vvpOffsetTop = vvp ? vvp.offsetTop : 0;
      var bottomOffset = Math.round(window.innerHeight - vvpOffsetTop - vvpHeight);
      panel.style.position = 'fixed';
      panel.style.left = '0';
      panel.style.right = '0';
      panel.style.bottom = bottomOffset + 'px';
      panel.style.top = 'auto';
      panel.style.width = '100%';
      panel.style.maxWidth = '100%';
      panel.style.height = vvpHeight + 'px';
      panel.style.maxHeight = vvpHeight + 'px';
      // Subtle 16px sheet curve on the top corners (true sheet pattern;
      // 0 felt harsh, 20px+ felt like a window).
      panel.style.borderRadius = '16px 16px 0 0';
      if (!isOpen) {
        btn.style.display = '';
        btn.style.bottom = '24px';
      } else {
        // Panel is open → FAB is redundant (close X is in the header).
        btn.style.display = 'none';
      }
    } else {
      var idealH = 680;
      // vh - 120 ensures we never reach near the top of the viewport.
      // Floor at 520 so very-short laptop screens (≤640px) still show a
      // usable panel rather than a postage stamp.
      var maxByVh = Math.max(520, window.innerHeight - 120);
      var height = Math.min(idealH, maxByVh);
      panel.style.position = 'fixed';
      panel.style.left = '';
      panel.style.right = POSITION === 'bottom-left' ? '' : '24px';
      panel.style.bottom = '96px';
      panel.style.top = 'auto';
      panel.style.width = '400px';
      panel.style.maxWidth = 'calc(100vw - 32px)';
      panel.style.height = height + 'px';
      panel.style.maxHeight = 'calc(100vh - 120px)';
      panel.style.borderRadius = '20px';
      btn.style.display = '';
      btn.style.bottom = '24px';
    }
    if (isOpen) scrollToBottom();
  }

  applyMobileLayout();
  window.addEventListener('resize', applyMobileLayout);
  // Critical: re-apply when iOS keyboard opens/closes (visualViewport resize event)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applyMobileLayout);
    window.visualViewport.addEventListener('scroll', applyMobileLayout);
  }

  // ── Send ─────────────────────────────────────────────────────────────────────
  // Read Jane's frontend context (Purple Lotus + any Jane-powered storefront)
  // - Cookie JANE_STORE: currently selected store id (numeric)
  // - Cookie ORDER_TYPE: "pickup" | "delivery"
  // - localStorage shopping-cart: unmanaged cart items
  // Same-origin, no Jane API call needed. Per Jane's Allie 2026-04-23.
  function readJaneContext() {
    var ctx = {};
    // ── Cookies — try Jane's canonical names ─────────────────────────────
    try {
      var c = document.cookie || '';
      // Store ID: JANE_STORE is the documented name. Several Roots builds
      // also write 'jane_store_id' or 'selected_store'.
      var sm = c.match(/(?:^|;\\s*)(?:JANE_STORE|jane_store_id|selected_store)=([^;]+)/);
      if (sm) ctx.janeStore = decodeURIComponent(sm[1]);
      // Order type: ORDER_TYPE is canonical. 'cart_mode' / 'fulfillment'
      // appear on some builds.
      var om = c.match(/(?:^|;\\s*)(?:ORDER_TYPE|cart_mode|fulfillment)=([^;]+)/);
      if (om) {
        var ot = decodeURIComponent(om[1]).toLowerCase();
        if (ot === 'pickup' || ot === 'delivery') ctx.orderType = ot;
      }
    } catch(e) {}

    // ── localStorage — Jane Roots writes the picker state here ──────────
    // 2026-05-13: customer reported the widget wasn't picking up the site's
    // location selection. Roots stores the picker state under several
    // different keys across versions — scan a broad allowlist and any
    // value that looks like a store ID or order type wins. Always logs
    // the keys we found so we can extend the allowlist when new variants
    // surface in the wild.
    try {
      var STORE_KEYS = [
        'jane:store-id', 'jane:selected-store', 'roots:store-id',
        'roots:selected-store', 'roots:pickup-store', 'roots:delivery-store',
        'selected_store_id', 'selected-store-id', 'kyra_store_' + CLIENT_ID,
      ];
      for (var i = 0; i < STORE_KEYS.length && !ctx.janeStore; i++) {
        var v = localStorage.getItem(STORE_KEYS[i]);
        if (v) {
          // Some keys store raw IDs ("4398"), others wrap in JSON.
          try {
            var parsed = JSON.parse(v);
            ctx.janeStore = String(parsed.id || parsed.storeId || parsed.value || parsed) || '';
          } catch(e) {
            ctx.janeStore = String(v);
          }
          if (ctx.janeStore) ctx.janeStoreSource = STORE_KEYS[i];
        }
      }
      var ORDER_KEYS = [
        'jane:order-type', 'roots:order-type', 'roots:fulfillment',
        'cart-mode', 'fulfillment_type', 'cart_destination',
      ];
      for (var j = 0; j < ORDER_KEYS.length && !ctx.orderType; j++) {
        var vv = localStorage.getItem(ORDER_KEYS[j]);
        if (vv) {
          var ott = String(vv).toLowerCase().replace(/['"]/g, '').trim();
          if (ott === 'pickup' || ott === 'delivery') {
            ctx.orderType = ott;
            ctx.orderTypeSource = ORDER_KEYS[j];
          }
        }
      }
    } catch(e) {}

    // ── Window state — Next.js / Apollo initial state ───────────────────
    // Many Jane-Roots builds embed the selected store inside the SSR'd
    // __NEXT_DATA__ blob or Apollo cache before localStorage is populated.
    // Reading these gives us the store the moment the page loads, with no
    // dependency on Roots persisting to a key we recognise.
    if (!ctx.janeStore) {
      try {
        var nd = document.getElementById('__NEXT_DATA__');
        if (nd && nd.textContent) {
          var ndJson = JSON.parse(nd.textContent);
          // Walk a few likely paths — Roots versions vary.
          var pageProps = ndJson && ndJson.props && ndJson.props.pageProps;
          var candidate = pageProps && (
            pageProps.store || pageProps.currentStore ||
            pageProps.selectedStore || pageProps.dispensary ||
            (pageProps.initialState && pageProps.initialState.store)
          );
          if (candidate) {
            ctx.janeStore = String(candidate.id || candidate.storeId || candidate.algolia_id || '') || '';
            ctx.janeStoreText = String(candidate.name || candidate.title || candidate.address || '') || '';
            if (ctx.janeStore) ctx.janeStoreSource = '__NEXT_DATA__';
          }
        }
      } catch(e) {}
    }
    if (!ctx.janeStore) {
      try {
        var apollo = window.__APOLLO_STATE__ || window.__INITIAL_STATE__;
        if (apollo && typeof apollo === 'object') {
          // Apollo cache keys look like "Store:1234" or "Dispensary:567"
          for (var k in apollo) {
            if (/^(Store|Dispensary):/i.test(k)) {
              var s = apollo[k];
              if (s && (s.id || s.storeId)) {
                ctx.janeStore = String(s.id || s.storeId);
                ctx.janeStoreText = String(s.name || s.address || '');
                ctx.janeStoreSource = '__APOLLO_STATE__:' + k;
                break;
              }
            }
          }
        }
      } catch(e) {}
    }

    // ── DOM scraping — last-resort but the ONLY signal that always
    // matches what the visitor sees in the picker. Jane Roots renders the
    // selected store name + street address in the header dropdown; we
    // grab the visible text and let the backend fuzzy-match it against
    // the configured store list. Works even when Roots is using internal
    // React state that never lands in storage. ────────────────────────────
    if (!ctx.janeStoreText) {
      try {
        var SELECTORS = [
          '[data-testid*="store" i] [class*="address" i]',
          '[data-testid*="location" i]',
          '[data-testid*="store-selector" i]',
          '[aria-label*="store" i][aria-label*="select" i]',
          '[aria-label*="pickup" i]',
          '[aria-label*="location" i]',
          '[class*="store-selector" i]',
          '[class*="location-picker" i]',
          '[class*="StorePicker" i]',
          'header [class*="address" i]',
        ];
        var STREET_RE = /\\b\\d{1,5}\\s+(?:[NSEW]\\.?\\s+)?[A-Z][a-zA-Z'.-]+(?:\\s+[A-Z][a-zA-Z'.-]+)*\\s+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Pl|Place|Ct|Court|Pkwy|Parkway|Hwy|Highway)\\b/i;
        for (var si = 0; si < SELECTORS.length && !ctx.janeStoreText; si++) {
          var nodes = document.querySelectorAll(SELECTORS[si]);
          for (var ni = 0; ni < nodes.length && !ctx.janeStoreText; ni++) {
            var t = (nodes[ni].textContent || '').trim().replace(/\\s+/g, ' ');
            if (t && t.length >= 4 && t.length <= 200) {
              ctx.janeStoreText = t;
              ctx.janeStoreSource = 'dom:' + SELECTORS[si];
            }
          }
        }
        // Pure-text scan as final fallback: scan visible header text for
        // a street-address pattern (works on Roots builds that don't
        // expose useful selectors).
        if (!ctx.janeStoreText) {
          var hdr = document.querySelector('header') || document.body;
          if (hdr) {
            var hText = (hdr.textContent || '').replace(/\\s+/g, ' ');
            var match = hText.match(STREET_RE);
            if (match) {
              ctx.janeStoreText = match[0];
              ctx.janeStoreSource = 'dom:street-regex';
            }
          }
        }
      } catch(e) {}
    }

    // ── Cart (existing, unchanged) ───────────────────────────────────────
    try {
      var raw = localStorage.getItem('shopping-cart');
      if (raw) {
        var cartParsed = JSON.parse(raw);
        var items = Array.isArray(cartParsed) ? cartParsed
          : (cartParsed && Array.isArray(cartParsed.items)) ? cartParsed.items
          : [];
        if (items.length > 0 && items.length <= 20) {
          ctx.cart = items.slice(0, 20).map(function(i) {
            return {
              id: i && (i.product_id || i.productId || i.id),
              name: i && (i.name || i.productName),
              price: i && (i.bucket_price || i.price),
              count: i && (i.count || i.quantity || 1),
            };
          }).filter(function(x) { return x.id; });
        }
      }
    } catch(e) {}
    return ctx;
  }

  // Render the auto-pivot CTA chip ("Switch to Pickup") below the bot message
  // when the server returned a pivotAction. On tap: set the session override,
  // show a small confirmation banner, and pre-fill the input so the user can
  // re-ask their original question in the new channel.
  function renderPivotAction(pivot) {
    if (!pivot || !pivot.fromChannel || !pivot.toChannel) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kyra-support-link kyra-pivot-cta';
    // Visually distinguish from neutral support-link chips — primary purple.
    btn.style.cssText = 'background:#7c3aed;color:#fff;border-color:#7c3aed;font-weight:600;';
    var alt = pivot.alternativeCount || 0;
    btn.textContent = (pivot.label || 'Switch') + (alt ? ' (' + alt + ')' : '');
    btn.addEventListener('click', function() {
      sessionOrderTypeOverride = pivot.toChannel;
      btn.disabled = true;
      btn.style.opacity = '0.6';
      btn.textContent = 'Now browsing ' + pivot.toChannel;
      // Surface the change so the user knows the next question will use the
      // new channel. Auto-fire the last user message in the new channel so
      // they see results instantly without re-typing.
      if (lastUserMessage && !isLoading) {
        inputEl.value = lastUserMessage;
        sendMessage();
      }
    });
    messagesEl.appendChild(btn);
    scrollToBottom();
  }

  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || isLoading) return;
    if (!trackedFirstMessage) {
      trackedFirstMessage = true;
      trackEvent('first_message_sent', text.slice(0, 80), '');
    } else {
      trackEvent('message_sent', text.slice(0, 80), '');
    }
    hideQuickReplies();
    lastUserMessage = text;

    isLoading = true;
    sendBtn.disabled = true;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    addMessage('user', text);
    showTyping();

    var jane = readJaneContext();
    // Session override (set by tapping the pivot CTA) wins over the
    // storefront cookie. Reset on page refresh.
    var effectiveOrderType = sessionOrderTypeOverride || jane.orderType;
    var requestBody = JSON.stringify({
      clientId: CLIENT_ID,
      message: text,
      sessionId: sessionId,
      history: history.slice(-10),
      sourceUrl: window.location.href,
      storeId: jane.janeStore || window.__kyraStoreId || selectedStoreId || STORE_ID,
      // janeStoreText: visible store name/address scraped from the page —
      // backend address-matches this against the configured store list when
      // storeId is missing or doesn't match a known store. This is what
      // catches Roots builds that don't write to ANY of our localStorage
      // keys but DO show the address in the header picker.
      janeStoreText: jane.janeStoreText || '',
      janeStoreSource: jane.janeStoreSource || '',
      orderType: effectiveOrderType,
      cart: jane.cart,
    });

    // ── Streaming state ─────────────────────────────────────────────────────
    // botMsgEl / botBubbleEl materialize on the FIRST 'token' frame so the
    // typing indicator stays visible until the bot actually starts replying.
    // botFullText is the accumulator for incremental markdown re-render.
    var botMsgEl = null;
    var botBubbleEl = null;
    var botFullText = '';
    var leadCaptured = false;
    // Buffers for deferred render of cards / chips / pivot — see the
    // 'results' / 'chips' / 'pivotAction' switch arms below. Rendered
    // together AFTER stream completion with a 350ms beat so the visitor
    // reads the bot's text reply first.
    var pendingResults = null;
    var pendingChips = null;
    var pendingPivot = null;

    function ensureBotBubble() {
      if (botMsgEl) return;
      hideTyping();
      botMsgEl = addMessage('bot', '');
      botBubbleEl = botMsgEl.querySelector('.kyra-msg-bubble');
    }
    function appendToken(t) {
      ensureBotBubble();
      botFullText += t;
      // Re-render markdown on every chunk. Cheap (~few hundred chars total)
      // and gives bold/italic the streaming-typewriter effect Claude.ai +
      // ChatGPT use. Edge case where a half-emitted "**bold" briefly shows
      // as raw text resolves once the closing "**" lands a token later.
      botBubbleEl.innerHTML = formatMsg(botFullText);
      scrollToBottom();
    }
    function replaceBotText(t) {
      ensureBotBubble();
      botFullText = t;
      botBubbleEl.innerHTML = formatMsg(botFullText);
      scrollToBottom();
    }

    try {
      var res = await fetch(API_BASE + '/api/widget/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: requestBody,
        signal: AbortSignal.timeout(40000),
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);

      var contentType = res.headers.get('content-type') || '';
      var isStream = contentType.indexOf('text/event-stream') >= 0;

      if (!isStream) {
        // ── Backward-compat JSON path ───────────────────────────────────
        // Server returned a single JSON blob (older deploy, or the route
        // chose not to stream for some reason). Render in one shot.
        var data = await res.json();
        hideTyping();
        if (data.response) {
          if (data.sessionId && !sessionId) {
            sessionId = data.sessionId;
            try { localStorage.setItem(STORAGE_KEY, sessionId); } catch(e) {}
          }
          history.push({ role: 'user', content: text });
          history.push({ role: 'assistant', content: data.response });
          if (history.length > 20) history = history.slice(-20);
          addMessage('bot', data.response);
          // 350ms beat between the text bubble and the cards so the
          // visitor reads the answer FIRST, then sees the cards appear.
          // Operator feedback 2026-05-15: cards rendered too fast,
          // forcing visitors to scroll up to read the bot's reply.
          setTimeout(function() {
            try { renderCards(data.cards, data.browseMore, data.fallbackNotice); } catch(e) {}
            try { renderSupportLinks(data.supportLinks); } catch(e) {}
            if (data.pivotAction && sessionOrderTypeOverride !== data.pivotAction.toChannel) {
              try { renderPivotAction(data.pivotAction); } catch(e) {}
            }
          }, 350);
          if (data.leadCaptured) leadCaptured = true;
        } else {
          addMessage('bot', 'Sorry, something went wrong. Please try again.');
        }
      } else if (res.body) {
        // ── SSE streaming path ──────────────────────────────────────────
        // Materialize the bot's reply bubble EAGERLY before processing any
        // server frames. Without this, the 'results' / 'chips' / 'pivotAction'
        // frames (which arrive before the first 'token') would render their
        // DOM under #kyra-widget-messages first — so product cards displayed
        // BEFORE the bot's text explanation. Customer report 2026-05-12.
        // Pre-creating the bubble locks in the visual order:
        //   1) bot text bubble (fills as tokens stream)
        //   2) product cards
        //   3) support-link chips
        //   4) pivot CTA
        // which matches the conversational expectation: the bot speaks
        // first, then surfaces tools/cards to support what it said.
        ensureBotBubble();
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';
        var streamDone = false;

        while (!streamDone) {
          var chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });

          // SSE frames are separated by a blank line (double newline).
          // Process every complete frame; whatever remains stays in the
          // buffer for the next chunk.
          //
          // IMPORTANT: this whole script body is a backtick template literal
          // in script/route.ts — single-backslash escape sequences like \\n
          // would be interpreted at template-build time and emitted as actual
          // newlines, breaking string literals on the wire. We escape twice
          // (\\\\n -> \\n in the rendered JS -> newline at browser runtime).
          var parts = buffer.split('\\n\\n');
          buffer = parts.pop() || '';

          for (var i = 0; i < parts.length; i++) {
            var raw = parts[i];
            if (!raw) continue;
            var evName = '';
            var dataStr = '';
            var lines = raw.split('\\n');
            for (var j = 0; j < lines.length; j++) {
              var line = lines[j];
              if (line.indexOf('event:') === 0) evName = line.slice(6).trim();
              else if (line.indexOf('data:') === 0) dataStr = line.slice(5).trim();
            }
            if (!evName || !dataStr) continue;
            var payload;
            try { payload = JSON.parse(dataStr); } catch(e) { continue; }

            switch (evName) {
              case 'meta':
                if (payload.sessionId && !sessionId) {
                  sessionId = payload.sessionId;
                  try { localStorage.setItem(STORAGE_KEY, sessionId); } catch(e) {}
                }
                break;
              case 'results':
                // BUFFER (don't render yet) — defer until 'done' so the
                // visitor reads the streamed bot reply BEFORE the cards
                // appear. Without this, results frames (which arrive
                // before any tokens) caused the cards to appear above
                // the text-in-progress, pushing the bot's reply below
                // the fold. Operator feedback 2026-05-15.
                pendingResults = payload;
                break;
              case 'chips':
                pendingChips = payload;
                break;
              case 'pivotAction':
                pendingPivot = payload;
                break;
              case 'token':
                appendToken(payload.text || '');
                break;
              case 'correction':
                replaceBotText(payload.text || '');
                break;
              case 'error':
                replaceBotText(payload.message || 'Sorry, something went wrong. Please try again.');
                break;
              case 'done':
                streamDone = true;
                break;
            }
          }
        }
        // Stream may close mid-frame in rare cases (server crashed, network
        // dropped). Make sure the typing indicator is gone either way.
        hideTyping();
        // Render the buffered cards / chips / pivot AFTER the streamed
        // text is done. 350ms gives the visitor a visual beat to read
        // the bot's reply before the cards appear underneath it.
        setTimeout(function() {
          if (pendingResults) {
            try { renderCards(pendingResults.cards || [], pendingResults.browseMore || null, pendingResults.fallbackNotice || null); } catch(e) {}
          }
          if (pendingChips) {
            try { renderSupportLinks(pendingChips.supportLinks); } catch(e) {}
          }
          if (pendingPivot && sessionOrderTypeOverride !== pendingPivot.toChannel) {
            try { renderPivotAction(pendingPivot); } catch(e) {}
          }
        }, 350);
      }
    } catch(e) {
      hideTyping();
      if (!botMsgEl) {
        addMessage('bot', 'Sorry, that took too long. Please try again or ask a different question.');
      } else if (!botFullText.trim()) {
        replaceBotText('Sorry, something went wrong mid-reply. Please try again.');
      }
    }

    // Track history for context continuity (post-stream).
    if (botFullText.trim()) {
      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: botFullText });
      if (history.length > 20) history = history.slice(-20);
    }

    if (leadCaptured) {
      var noteEl = document.createElement('div');
      noteEl.style.cssText = 'text-align:center;font-size:10px;color:#9ca3af;padding:4px 0;';
      noteEl.textContent = '✓ We\\'ll follow up with you';
      messagesEl.appendChild(noteEl);
      scrollToBottom();
    }

    isLoading = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }

  sendBtn.addEventListener('click', sendMessage);

  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-grow textarea
  inputEl.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });

  // Proactive auto-open (first visit only, after PROACTIVE_DELAY_MS).
  // Delay is configurable in Settings → Chat Widget → Behavior. Setting
  // it to 0 (or any falsy value) disables the proactive bubble entirely.
  try {
    if (PROACTIVE_DELAY_MS > 0) {
      var PROACTIVE_KEY = 'kyra_proactive_shown_' + CLIENT_ID;
      if (!localStorage.getItem(PROACTIVE_KEY)) {
        setTimeout(function() {
          if (isOpen) return;
          var pro = document.createElement('div');
          pro.id = 'kyra-proactive';
          pro.innerHTML = '<span class="close">✕</span>' + escHtml(GREETING);
          pro.addEventListener('click', function(e) {
            if (e.target.classList.contains('close')) {
              pro.remove();
            } else {
              pro.remove();
              openPanel();
            }
          });
          document.body.appendChild(pro);
          try { localStorage.setItem(PROACTIVE_KEY, '1'); } catch(ignore) {}
          setTimeout(function() { if (pro.parentNode) pro.remove(); }, 15000);
        }, PROACTIVE_DELAY_MS);
      }
    }
  } catch(e) {}

})();
`.trim();

  return new NextResponse(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // 2026-05-13: no-store + no-cache + must-revalidate. Customer
      // reported that "public, max-age=0, must-revalidate" still let
      // browsers soft-cache the script — soft-reloads on <script> tags
      // sometimes skip revalidation. no-store kills the cache entirely:
      // every page load fetches the fresh script. Costs ~62KB per page
      // but guarantees the customer sees their saves immediately, which
      // was the explicit business requirement.
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Vary: '*',
      ETag: etag,
      'Access-Control-Allow-Origin': '*',
    },
  });
}
