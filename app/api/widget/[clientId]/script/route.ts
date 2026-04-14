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
    return ['😌 Products for relaxation', '😴 Products for sleep', '⚡ Energizing products', '💆 Pain relief products', '🎨 Products for creativity'];
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
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  if (!clientId) {
    return new NextResponse('// Missing clientId', { status: 400, headers: { 'Content-Type': 'application/javascript' } });
  }

  const supabase = getSupabase();

  // Fetch widget config from client (including agency_id for branding)
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, status, container_config, gateway_status, agency_id, industry')
    .eq('id', clientId)
    .single();

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
  const widgetGreeting = (cfg.widget_greeting as string) || `Hi! 👋 How can I help you today?`;
  // Free and Lite plans: badge always on regardless of config
  const planForcedBadge = ['free', 'starter'].includes(agencyPlan);
  const widgetPoweredBy = planForcedBadge ? true : (cfg.widget_powered_by !== false);
  const widgetPosition = (cfg.widget_position as string) || 'bottom-right';
  const widgetAvatarEmoji = (cfg.widget_avatar as string) || '🤖';
  const apiBase = (process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com').replace(/\/$/, '');

  // The entire widget as a self-contained IIFE
  const script = `
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
  var QUICK_REPLIES = ${JSON.stringify((cfg.widget_quick_replies as string[]) || getIndustryQuickReplies((cfg.industry as string) || (client?.industry as string) || '', cfg))};
  var STORE_ID = ${JSON.stringify((cfg.jane_default_store_id as string) || '')};
  var JANE_STORES = ${JSON.stringify((cfg.jane_stores as Array<{ id: string; name: string; address?: string }>) || [])};
  var STORAGE_KEY = 'kyra_session_' + CLIENT_ID;

  // Don't init twice
  if (window.__kyraWidget) return;
  window.__kyraWidget = true;

  // ── Styles ──────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '*, *::before, *::after { box-sizing:border-box; }',
    /* FAB Button — premium with glow */
    '#kyra-widget-btn { position:fixed; bottom:28px; ' + (POSITION === 'bottom-left' ? 'left:28px;' : 'right:28px;') + ' width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, ' + COLOR + ', ' + COLOR + 'dd); border:none; cursor:pointer; box-shadow:0 6px 24px ' + COLOR + '55, 0 2px 8px rgba(0,0,0,0.15); z-index:99999; display:flex; align-items:center; justify-content:center; transition:transform 0.2s ease, box-shadow 0.2s ease; }',
    '#kyra-widget-btn:hover { transform:scale(1.06); box-shadow:0 8px 32px ' + COLOR + '66, 0 4px 12px rgba(0,0,0,0.2); }',
    '#kyra-widget-btn svg { width:28px; height:28px; fill:white; transition:transform 0.3s ease; }',
    /* Badge */
    '#kyra-widget-badge { position:absolute; top:-4px; right:-4px; min-width:20px; height:20px; background:#ef4444; border-radius:10px; display:none; align-items:center; justify-content:center; font-size:11px; color:#fff; font-weight:700; font-family:system-ui,-apple-system,sans-serif; padding:0 5px; border:2px solid #fff; }',
    /* Backdrop */
    '#kyra-widget-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.35); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); z-index:99997; }',
    /* Panel — modern glass morphism */
    '#kyra-widget-panel { position:fixed; bottom:104px; ' + (POSITION === 'bottom-left' ? 'left:28px; transform-origin:bottom left;' : 'right:28px; transform-origin:bottom right;') + ' width:400px; max-width:calc(100vw - 32px); height:580px; max-height:calc(100vh - 130px); background:#fff; color:#111; border-radius:24px; box-shadow:0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.04); z-index:99998; display:flex; flex-direction:column; overflow:hidden; transition:opacity 0.25s ease, transform 0.25s ease; }',
    '#kyra-widget-panel.hidden { opacity:0; transform:translateY(16px) scale(0.96); pointer-events:none; }',
    /* Header — gradient with blur */
    '#kyra-widget-header { background:linear-gradient(135deg, ' + COLOR + ', ' + COLOR + 'cc); padding:18px 20px; display:flex; align-items:center; gap:14px; }',
    '#kyra-widget-header .avatar { width:44px; height:44px; border-radius:50%; background:rgba(255,255,255,0.2); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; border:2px solid rgba(255,255,255,0.25); }',
    '#kyra-widget-header .info { flex:1; min-width:0; }',
    '#kyra-widget-header .title { color:#fff; font-weight:800; font-size:16px; font-family:system-ui,-apple-system,"SF Pro Display",sans-serif; letter-spacing:-0.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
    '#kyra-widget-header .subtitle { color:rgba(255,255,255,0.8); font-size:12.5px; font-family:system-ui,-apple-system,sans-serif; display:flex; align-items:center; gap:5px; margin-top:2px; }',
    '#kyra-widget-header .online-dot { width:8px; height:8px; border-radius:50%; background:#4ade80; flex-shrink:0; animation:kyra-pulse 2s infinite; }',
    '@keyframes kyra-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.4)} 50%{box-shadow:0 0 0 6px rgba(74,222,128,0)} }',
    '#kyra-widget-header .close-btn { background:rgba(255,255,255,0.12); border:none; cursor:pointer; color:#fff; font-size:18px; line-height:1; padding:6px; border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background 0.15s; }',
    '#kyra-widget-header .close-btn:hover { background:rgba(255,255,255,0.22); }',
    /* Messages */
    '#kyra-widget-messages { flex:1; overflow-y:auto; padding:20px 16px; display:flex; flex-direction:column; gap:10px; background:linear-gradient(180deg, #f7f8fa 0%, #f0f1f5 100%); -webkit-overflow-scrolling:touch; }',
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
    '.kyra-msg-avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, ' + COLOR + ', ' + COLOR + 'aa); display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.1); }',
    /* Typing dots — smoother */
    '.kyra-typing { display:flex; align-items:center; gap:5px; padding:12px 16px; }',
    '.kyra-typing span { width:8px; height:8px; border-radius:50%; background:#b0b5c0; animation:kyra-bounce 1.4s ease-in-out infinite; }',
    '.kyra-typing span:nth-child(2) { animation-delay:0.15s; }',
    '.kyra-typing span:nth-child(3) { animation-delay:0.3s; }',
    '@keyframes kyra-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-8px)} }',
    /* Input — pill style */
    '#kyra-widget-input-area { padding:14px 16px; background:#fff; border-top:1px solid #eef0f4; display:flex; gap:10px; align-items:flex-end; padding-bottom:max(14px, env(safe-area-inset-bottom)); }',
    '#kyra-widget-input { flex:1; border:1.5px solid #e8eaf0; border-radius:24px; padding:12px 18px; font-size:15px; font-family:system-ui,-apple-system,sans-serif; resize:none; outline:none; max-height:110px; line-height:1.4; color:#1a1a1a; background:#f7f8fa; -webkit-appearance:none; transition:border-color 0.2s, box-shadow 0.2s, background 0.2s; }',
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
    /* Proactive bubble */
    '#kyra-proactive { position:fixed; bottom:104px; ' + (POSITION === 'bottom-left' ? 'left:28px;' : 'right:28px;') + ' background:#fff; padding:14px 18px; border-radius:20px 20px 6px 20px; box-shadow:0 8px 30px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04); font-size:14px; color:#1a1a1a; font-family:system-ui,-apple-system,sans-serif; max-width:300px; z-index:99996; cursor:pointer; animation:kyra-fade-in 0.35s ease; line-height:1.5; }',
    '#kyra-proactive .close { position:absolute; top:6px; right:10px; cursor:pointer; color:#b0b5c0; font-size:14px; transition:color 0.15s; }',
    '#kyra-proactive .close:hover { color:#6b7280; }',
    '@keyframes kyra-fade-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }',
  ].join('');
  document.head.appendChild(style);

  // ── State ───────────────────────────────────────────────────────────────────
  var sessionId = null;
  try { sessionId = localStorage.getItem(STORAGE_KEY); } catch(e) {}
  var isOpen = false;
  var isLoading = false;
  var greeted = false;
  var unreadCount = 0;
  var history = []; // [{role:'user'|'assistant', content:string}] — last 10 turns
  var selectedStoreId = STORE_ID; // may be overridden by user picking a store
  try { var savedStore = localStorage.getItem('kyra_store_' + CLIENT_ID); if (savedStore) selectedStoreId = savedStore; } catch(e) {}
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
    '  <div class="avatar">' + AVATAR + '</div>',
    '  <div class="info"><div class="title">' + TITLE + '</div><div class="subtitle"><span class="online-dot"></span>Online · Ready to help</div></div>',
    '  <button class="close-btn" aria-label="Close chat">✕</button>',
    '</div>',
    '<div id="kyra-widget-messages"></div>',
    '<div id="kyra-widget-input-area">',
    '  <textarea id="kyra-widget-input" placeholder="Type a message..." rows="1"></textarea>',
    '  <button id="kyra-widget-send" aria-label="Send">',
    '    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    '  </button>',
    '</div>',
    POWERED_BY ? '<div id="kyra-widget-powered"><a href="https://kyra.conversionsystem.com?utm_source=widget&utm_medium=powered_by&utm_campaign=viral" target="_blank" rel="noopener">⚡ Powered by <strong>Kyra</strong></a></div>' : '',
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
      msgEl.innerHTML = '<div class="kyra-msg-avatar">' + AVATAR + '</div><div class="kyra-msg-bubble">' + formatMsg(text) + '</div>';
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
        if (!localStorage.getItem('kyra_sound_muted') && CHIME) CHIME.play().catch(function(){});
      } catch(e) {}
    }
    return msgEl;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'kyra-msg bot';
    el.id = 'kyra-typing';
    el.innerHTML = '<div class="kyra-msg-avatar">' + AVATAR + '</div><div class="kyra-msg-bubble kyra-typing"><span></span><span></span><span></span></div>';
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
    QUICK_REPLIES.forEach(function(reply) {
      var qbtn = document.createElement('button');
      qbtn.className = 'kyra-quick-btn';
      qbtn.textContent = reply;
      qbtn.addEventListener('click', function() {
        inputEl.value = reply;
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
      });
      container.appendChild(sbtn);
    });
    messagesEl.appendChild(container);
    scrollToBottom();
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
      links.push('<a href="' + escHtml(url) + '" target="_blank" rel="noopener" class="kyra-product-link">' + label + '</a>');
      return PH + 'L' + (links.length - 1) + PH;
    });

    // 2. Auto-link bare URLs not already captured above
    s = s.replace(/(https?:\\/\\/[^\\s<>"]+[^\\s<>.,!?;:"'\\)])/g, function(url) {
      var label = url.indexOf('/product/') > -1 ? 'View Product \\u2192' : 'View \\u2192';
      links.push('<a href="' + escHtml(url) + '" target="_blank" rel="noopener" class="kyra-product-link">' + label + '</a>');
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

  // ── Toggle ───────────────────────────────────────────────────────────────────
  function openPanel() {
    isOpen = true;
    panel.classList.remove('hidden');
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    var isMobile = window.innerWidth <= 600;
    if (isMobile) {
      // On mobile: hide the button (close is in the header), show backdrop
      btn.style.display = 'none';
      backdrop.style.display = 'block';
    }
    unreadCount = 0;
    badge.style.display = 'none';
    badge.textContent = '';
    if (!greeted && messagesEl.children.length === 0) {
      greeted = true;
      addMessage('bot', GREETING);
      // Multi-store dispensary: show store selection first, then quick replies after selection
      if (JANE_STORES.length > 1 && !selectedStoreId) {
        showStoreSelection();
      } else {
        showQuickReplies();
      }
    }
    applyMobileLayout();
    setTimeout(function() {
      if (inputEl) {
        inputEl.focus();
        if (isMobile) { setTimeout(applyMobileLayout, 400); }
      }
    }, 100);
  }

  function closePanel() {
    isOpen = false;
    panel.classList.add('hidden');
    btn.style.display = '';
    backdrop.style.display = 'none';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>';
    // Restore desktop button position
    if (window.innerWidth > 600) {
      btn.style.bottom = '24px';
    }
  }

  btn.addEventListener('click', function() { isOpen ? closePanel() : openPanel(); });
  closeBtn.addEventListener('click', closePanel);

  // ── Mobile sizing (JS-driven — more reliable than CSS media queries on iOS) ─
  function applyMobileLayout() {
    var isMobile = window.innerWidth <= 600;
    if (isMobile) {
      // Use visualViewport for accurate height (accounts for iOS keyboard + browser chrome)
      var vvp = window.visualViewport;
      var vvpHeight = vvp ? vvp.height : window.innerHeight;
      var vvpOffsetTop = vvp ? vvp.offsetTop : 0;
      var bottomOffset = Math.round(window.innerHeight - vvpOffsetTop - vvpHeight);
      // Panel takes 80% of visible viewport height (tall enough to read the conversation)
      var panelH = Math.round(vvpHeight * 0.80);
      panel.style.position = 'fixed';
      panel.style.left = '0';
      panel.style.right = '0';
      panel.style.bottom = bottomOffset + 'px';
      panel.style.top = 'auto';
      panel.style.width = '100%';
      panel.style.maxWidth = '100%';
      panel.style.height = panelH + 'px';
      panel.style.maxHeight = panelH + 'px';
      panel.style.borderRadius = '20px 20px 0 0';
      // Button is hidden when panel open on mobile — shown when closed
      if (!isOpen) {
        btn.style.display = '';
        btn.style.bottom = '24px';
      }
    } else {
      // Desktop: restore defaults
      panel.style.position = 'fixed';
      panel.style.left = '';
      panel.style.right = POSITION === 'bottom-left' ? '' : '24px';
      panel.style.bottom = '100px';
      panel.style.top = 'auto';
      panel.style.width = '380px';
      panel.style.maxWidth = 'calc(100vw - 32px)';
      panel.style.height = '560px';
      panel.style.maxHeight = 'calc(100vh - 130px)';
      panel.style.borderRadius = '20px';
      btn.style.display = '';
      btn.style.bottom = '24px';
    }
    // Always scroll messages to bottom when layout changes (keyboard open/close)
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
  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || isLoading) return;
    hideQuickReplies();

    isLoading = true;
    sendBtn.disabled = true;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    addMessage('user', text);
    showTyping();

    try {
      var res = await fetch(API_BASE + '/api/widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: CLIENT_ID, message: text, sessionId: sessionId, history: history.slice(-10), sourceUrl: window.location.href, storeId: window.__kyraStoreId || selectedStoreId || STORE_ID }),
        signal: AbortSignal.timeout(40000),
      });
      var data = await res.json();
      hideTyping();
      if (data.response) {
        if (data.sessionId && !sessionId) {
          sessionId = data.sessionId;
          try { localStorage.setItem(STORAGE_KEY, sessionId); } catch(e) {}
        }
        // Track history for context continuity
        history.push({ role: 'user', content: text });
        history.push({ role: 'assistant', content: data.response });
        if (history.length > 20) history = history.slice(-20);
        addMessage('bot', data.response);
        // If lead was captured, show a subtle confirmation
        if (data.leadCaptured) {
          var noteEl = document.createElement('div');
          noteEl.style.cssText = 'text-align:center;font-size:10px;color:#9ca3af;padding:4px 0;';
          noteEl.textContent = '✓ We\\'ll follow up with you';
          messagesEl.appendChild(noteEl);
          scrollToBottom();
        }
      } else {
        addMessage('bot', 'Sorry, something went wrong. Please try again.');
      }
    } catch(e) {
      hideTyping();
      addMessage('bot', 'Sorry, that took too long. Please try again or ask a different question.');
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

  // Proactive auto-open (first visit only, after 8s)
  try {
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
      }, 8000);
    }
  } catch(e) {}

})();
`.trim();

  return new NextResponse(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300', // 5 min cache — refreshes when config changes
      'Access-Control-Allow-Origin': '*',
    },
  });
}
