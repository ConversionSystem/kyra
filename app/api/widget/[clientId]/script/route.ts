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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  if (!clientId) {
    return new NextResponse('// Missing clientId', { status: 400, headers: { 'Content-Type': 'application/javascript' } });
  }

  const supabase = getSupabase();

  // Fetch widget config from client
  const { data: client } = await supabase
    .from('agency_clients')
    .select('id, name, status, container_config, gateway_status')
    .eq('id', clientId)
    .single();

  if (!client || !['active', 'setup'].includes(client.status || '')) {
    return new NextResponse('// Widget not available', { status: 404, headers: { 'Content-Type': 'application/javascript' } });
  }

  const cfg = (client.container_config as Record<string, unknown>) ?? {};
  const widgetTitle = (cfg.widget_title as string) || `Chat with ${client.name}`;
  const widgetColor = (cfg.widget_color as string) || '#6366f1'; // indigo default
  const widgetGreeting = (cfg.widget_greeting as string) || `Hi! 👋 How can I help you today?`;
  const widgetPoweredBy = cfg.widget_powered_by !== false; // default true
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
  var STORAGE_KEY = 'kyra_session_' + CLIENT_ID;

  // Don't init twice
  if (window.__kyraWidget) return;
  window.__kyraWidget = true;

  // ── Styles ──────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#kyra-widget-btn { position:fixed; bottom:24px; ' + (POSITION === 'bottom-left' ? 'left:24px;' : 'right:24px;') + ' width:60px; height:60px; border-radius:50%; background:' + COLOR + '; border:none; cursor:pointer; box-shadow:0 4px 20px rgba(0,0,0,0.25); z-index:99999; display:flex; align-items:center; justify-content:center; transition:transform 0.2s; }',
    '#kyra-widget-btn:hover { transform:scale(1.08); }',
    '#kyra-widget-btn svg { width:28px; height:28px; fill:white; }',
    '#kyra-widget-badge { position:absolute; top:-2px; right:-2px; width:16px; height:16px; background:#ef4444; border-radius:50%; display:none; }',
    '#kyra-widget-backdrop { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:99997; }',
    '#kyra-widget-panel { position:fixed; bottom:96px; ' + (POSITION === 'bottom-left' ? 'left:24px; transform-origin:bottom left;' : 'right:24px; transform-origin:bottom right;') + ' width:380px; max-width:calc(100vw - 32px); height:540px; max-height:calc(100vh - 120px); background:#fff; color:#111; border-radius:20px; box-shadow:0 8px 40px rgba(0,0,0,0.22); z-index:99998; display:flex; flex-direction:column; overflow:hidden; transition:opacity 0.22s,transform 0.22s; }',
    '#kyra-widget-panel.hidden { opacity:0; transform:scale(0.9) translateY(8px); pointer-events:none; }',
    '#kyra-widget-header { background:' + COLOR + '; padding:14px 16px; display:flex; align-items:center; gap:12px; }',
    '#kyra-widget-header .avatar { width:40px; height:40px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }',
    '#kyra-widget-header .info { flex:1; min-width:0; }',
    '#kyra-widget-header .title { color:#fff; font-weight:700; font-size:15px; font-family:system-ui,sans-serif; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
    '#kyra-widget-header .subtitle { color:rgba(255,255,255,0.75); font-size:12px; font-family:system-ui,sans-serif; display:flex; align-items:center; gap:4px; margin-top:1px; }',
    '#kyra-widget-header .online-dot { width:7px; height:7px; border-radius:50%; background:#4ade80; flex-shrink:0; }',
    '#kyra-widget-header .close-btn { background:rgba(255,255,255,0.15); border:none; cursor:pointer; color:#fff; font-size:18px; line-height:1; padding:6px; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background 0.15s; }',
    '#kyra-widget-header .close-btn:hover { background:rgba(255,255,255,0.25); }',
    '#kyra-widget-messages { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; background:#f8f9fa; -webkit-overflow-scrolling:touch; }',
    '.kyra-msg { display:flex; align-items:flex-end; gap:8px; max-width:88%; }',
    '.kyra-msg.user { margin-left:auto; flex-direction:row-reverse; }',
    '.kyra-msg-bubble { padding:11px 15px; border-radius:18px; font-size:14px; line-height:1.55; font-family:system-ui,sans-serif; word-wrap:break-word; word-break:break-word; }',
    '.kyra-msg.bot .kyra-msg-bubble { background:#fff; color:#1a1a1a; border-bottom-left-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.1); }',
    '.kyra-msg.user .kyra-msg-bubble { background:' + COLOR + '; color:#fff; border-bottom-right-radius:4px; }',
    '.kyra-msg-avatar { width:30px; height:30px; border-radius:50%; background:' + COLOR + '; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; box-shadow:0 1px 3px rgba(0,0,0,0.12); }',
    '.kyra-typing { display:flex; align-items:center; gap:4px; padding:11px 15px; }',
    '.kyra-typing span { width:7px; height:7px; border-radius:50%; background:#9ca3af; animation:kyra-bounce 1.2s infinite; }',
    '.kyra-typing span:nth-child(2) { animation-delay:0.2s; }',
    '.kyra-typing span:nth-child(3) { animation-delay:0.4s; }',
    '@keyframes kyra-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-7px)} }',
    '#kyra-widget-input-area { padding:12px 14px; background:#fff; border-top:1px solid #e5e7eb; display:flex; gap:10px; align-items:flex-end; padding-bottom:max(12px, env(safe-area-inset-bottom)); }',
    '#kyra-widget-input { flex:1; border:1.5px solid #e5e7eb; border-radius:12px; padding:11px 14px; font-size:15px; font-family:system-ui,sans-serif; resize:none; outline:none; max-height:110px; line-height:1.4; color:#1a1a1a; background:#fff; -webkit-appearance:none; }',
    '#kyra-widget-input:focus { border-color:' + COLOR + '; box-shadow:0 0 0 3px ' + COLOR + '22; }',
    '#kyra-widget-send { width:42px; height:42px; border-radius:50%; background:' + COLOR + '; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:opacity 0.2s,transform 0.15s; }',
    '#kyra-widget-send:hover { transform:scale(1.05); }',
    '#kyra-widget-send:disabled { opacity:0.45; cursor:not-allowed; transform:none; }',
    '#kyra-widget-send svg { width:18px; height:18px; fill:white; }',
    '#kyra-widget-powered { text-align:center; padding:7px 8px; font-size:11px; color:#9ca3af; font-family:system-ui,sans-serif; background:#fff; border-top:1px solid #f3f4f6; }',
    '#kyra-widget-powered a { color:#6366f1; text-decoration:none; font-weight:600; }',
    '#kyra-widget-powered a:hover { text-decoration:underline; }',
  ].join('');
  document.head.appendChild(style);

  // ── State ───────────────────────────────────────────────────────────────────
  var sessionId = null;
  try { sessionId = localStorage.getItem(STORAGE_KEY); } catch(e) {}
  var isOpen = false;
  var isLoading = false;
  var greeted = false;
  var history = []; // [{role:'user'|'assistant', content:string}] — last 10 turns

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

  // Panel
  var panel = document.createElement('div');
  panel.id = 'kyra-widget-panel';
  panel.className = 'hidden';
  panel.innerHTML = [
    '<div id="kyra-widget-header">',
    '  <div class="avatar">' + AVATAR + '</div>',
    '  <div class="info"><div class="title">' + TITLE + '</div><div class="subtitle"><span class="online-dot"></span>Online · Typically replies instantly</div></div>',
    '  <button class="close-btn" aria-label="Close chat">✕</button>',
    '</div>',
    '<div id="kyra-widget-messages"></div>',
    '<div id="kyra-widget-input-area">',
    '  <textarea id="kyra-widget-input" placeholder="Type a message..." rows="1"></textarea>',
    '  <button id="kyra-widget-send" aria-label="Send">',
    '    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
    '  </button>',
    '</div>',
    POWERED_BY ? '<div id="kyra-widget-powered">⚡ AI by <a href="https://kyra.conversionsystem.com/signup/agency?utm_source=widget&utm_medium=powered_by&utm_campaign=viral" target="_blank" rel="noopener" title="Get your own AI worker — free to start">Kyra</a> · <a href="https://kyra.conversionsystem.com/signup/agency?utm_source=widget&utm_medium=powered_by&utm_campaign=viral" target="_blank" rel="noopener" style="color:#9ca3af;font-weight:normal">Get one free →</a></div>' : '',
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
      msgEl.innerHTML = '<div class="kyra-msg-avatar">' + AVATAR + '</div><div class="kyra-msg-bubble">' + escHtml(text) + '</div>';
    } else {
      msgEl.innerHTML = '<div class="kyra-msg-bubble">' + escHtml(text) + '</div>';
    }
    messagesEl.appendChild(msgEl);
    scrollToBottom();
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

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\\n/g,'<br>');
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
    if (!greeted && messagesEl.children.length === 0) {
      greeted = true;
      addMessage('bot', GREETING);
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
        body: JSON.stringify({ clientId: CLIENT_ID, message: text, sessionId: sessionId, history: history.slice(-10), sourceUrl: window.location.href }),
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
      addMessage('bot', 'Connection error. Please check your internet and try again.');
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
