/**
 * ============================================================================
 * Kyra Bridge — HTTP API → Real OpenClaw Gateway
 *
 * This bridge connects Kyra's Vercel backend to a REAL OpenClaw Gateway
 * running in the same container. It translates HTTP requests into
 * OpenClaw's native WebSocket RPC protocol.
 *
 * This is NOT a dumb API proxy. Every message flows through a full
 * OpenClaw agent with:
 *   - 60+ skills (web search, browser control, file ops, etc.)
 *   - Persistent memory per session
 *   - Sub-agent spawning for complex tasks
 *   - Tool system with real execution
 *   - Multi-model support
 *   - Session isolation per client-contact pair
 *
 * Endpoints:
 *   POST /chat       { message, sessionKey, systemContext }
 *   GET  /health     → gateway status + session count
 *   POST /tools/invoke → proxy any OpenClaw tool
 *   /__openclaw__/*  → full Gateway Dashboard (HTML + WS proxy)
 *   /dashboard       → redirect to /__openclaw__/
 *
 * Architecture:
 *   Kyra Poller (Vercel) → HTTP → [this bridge] → WS → OpenClaw Gateway
 * ============================================================================
 */

const http = require('http');
const net = require('net');
const crypto = require('crypto');
const { EventEmitter } = require('events');

// ── Config ────────────────────────────────────────────────────────────────────

const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT) || 3100;
const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT) || 18789;
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || '';
const GATEWAY_HOST = '127.0.0.1';

// ── Device Identity (Ed25519 keypair for gateway auth) ────────────────────────
// OpenClaw Gateway strips scopes from token-only auth. Device auth is required
// to get operator.admin scope. We generate a keypair at startup.

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function generateDeviceIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  // Derive device ID from public key (SHA-256 of raw key bytes)
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const rawKey = (spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX))
    ? spki.subarray(ED25519_SPKI_PREFIX.length)
    : spki;
  const deviceId = crypto.createHash('sha256').update(rawKey).digest('hex');

  // Public key as base64url (raw 32 bytes)
  const publicKeyB64Url = rawKey.toString('base64')
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');

  return { deviceId, publicKeyPem, privateKeyPem, publicKeyB64Url };
}

function signPayload(privateKeyPem, payload) {
  const key = crypto.createPrivateKey(privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(payload, 'utf8'), key);
  return sig.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function buildDeviceAuth(identity, clientId, clientMode, role, scopes, token) {
  const signedAtMs = Date.now();
  // v1 payload format (no nonce — local connection)
  const payload = [
    'v1',
    identity.deviceId,
    clientId,
    clientMode,
    role,
    scopes.join(','),
    String(signedAtMs),
    token || '',
  ].join('|');

  const signature = signPayload(identity.privateKeyPem, payload);

  return {
    id: identity.deviceId,
    publicKey: identity.publicKeyB64Url,
    signature,
    signedAt: signedAtMs,
  };
}

// Generate identity once at startup
const DEVICE_IDENTITY = generateDeviceIdentity();
console.log(`[bridge] Device identity: ${DEVICE_IDENTITY.deviceId.substring(0, 16)}...`);

// ── WebSocket Frame Encoder/Decoder ───────────────────────────────────────────
// Minimal implementation — no external dependencies.

function encodeFrame(payload) {
  const data = Buffer.from(payload, 'utf-8');
  const mask = crypto.randomBytes(4);

  let header;
  if (data.length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text
    header[1] = 0x80 | data.length;
  } else if (data.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }

  const masked = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    masked[i] = data[i] ^ mask[i % 4];
  }

  return Buffer.concat([header, mask, masked]);
}

function decodeFrame(buf) {
  if (buf.length < 2) return null;

  const opcode = buf[0] & 0x0f;
  const isMasked = (buf[1] & 0x80) !== 0;
  let payloadLen = buf[1] & 0x7f;
  let offset = 2;

  if (payloadLen === 126) {
    if (buf.length < 4) return null;
    payloadLen = buf.readUInt16BE(2);
    offset = 4;
  } else if (payloadLen === 127) {
    if (buf.length < 10) return null;
    payloadLen = Number(buf.readBigUInt64BE(2));
    offset = 10;
  }

  if (isMasked) offset += 4;
  if (buf.length < offset + payloadLen) return null;

  let payload = buf.subarray(offset, offset + payloadLen);

  if (isMasked) {
    const maskKey = buf.subarray(offset - 4, offset);
    payload = Buffer.alloc(payloadLen);
    for (let i = 0; i < payloadLen; i++) {
      payload[i] = buf[offset + i] ^ maskKey[i % 4];
    }
  }

  return { opcode, payload, bytesConsumed: offset + payloadLen };
}

// ── OpenClaw Gateway WebSocket Client ─────────────────────────────────────────

class GatewayClient extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.pending = new Map(); // id → { resolve, reject, timer }
    this._connected = false;
    this._authenticated = false;
    this._connecting = false;
    this._reconnectTimer = null;
  }

  get connected() {
    return this._connected && this._authenticated;
  }

  async connect() {
    if (this.connected) return;
    if (this._connecting) {
      // Wait for in-progress connection
      return new Promise((resolve, reject) => {
        const check = setInterval(() => {
          if (this.connected) { clearInterval(check); resolve(); }
          if (!this._connecting) { clearInterval(check); reject(new Error('Connection failed')); }
        }, 100);
        setTimeout(() => { clearInterval(check); reject(new Error('Connection wait timeout')); }, 30000);
      });
    }

    this._connecting = true;

    return new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString('base64');
      const timer = setTimeout(() => {
        this._connecting = false;
        this.destroy();
        reject(new Error('Gateway WS connect timeout (20s)'));
      }, 20000);

      const req = http.request({
        hostname: GATEWAY_HOST,
        port: GATEWAY_PORT,
        path: '/',
        method: 'GET',
        headers: {
          'Connection': 'Upgrade',
          'Upgrade': 'websocket',
          'Sec-WebSocket-Version': '13',
          'Sec-WebSocket-Key': key,
        },
      });

      req.on('upgrade', (_, socket) => {
        this.socket = socket;
        this._connected = true;
        this.buffer = Buffer.alloc(0);

        socket.on('data', (chunk) => {
          this.buffer = Buffer.concat([this.buffer, chunk]);
          this._processFrames();
        });

        socket.on('close', () => {
          console.log('[gw-ws] Socket closed');
          this._connected = false;
          this._authenticated = false;
          this.socket = null;
          this._rejectAllPending('WebSocket closed');
          this._scheduleReconnect();
        });

        socket.on('error', (err) => {
          console.error('[gw-ws] Socket error:', err.message);
          this._connected = false;
          this._authenticated = false;
        });

        console.log('[gw-ws] WebSocket upgraded, waiting for challenge...');
      });

      // Handle connect.challenge → auth
      const onMessage = (msg) => {
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          const role = 'operator';
          const scopes = ['operator.admin'];
          const clientId = 'gateway-client';
          const clientMode = 'backend';
          const device = buildDeviceAuth(
            DEVICE_IDENTITY, clientId, clientMode, role, scopes, GATEWAY_TOKEN
          );

          this.rpc('connect', {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: clientId,
              version: '1.0.0',
              platform: 'linux',
              mode: clientMode,
            },
            role,
            scopes,
            caps: [],
            auth: { token: GATEWAY_TOKEN },
            device,
          }, 15000).then(() => {
            clearTimeout(timer);
            this._authenticated = true;
            this._connecting = false;
            this.removeListener('_raw', onMessage);
            console.log('[gw-ws] Authenticated ✓ — Real OpenClaw connected');
            resolve();
          }).catch((err) => {
            clearTimeout(timer);
            this._connecting = false;
            this.removeListener('_raw', onMessage);
            reject(err);
          });
        }
      };
      this.on('_raw', onMessage);

      req.on('error', (err) => {
        clearTimeout(timer);
        this._connecting = false;
        reject(new Error(`Gateway connect error: ${err.message}`));
      });

      req.end();
    });
  }

  _processFrames() {
    while (this.buffer.length > 0) {
      const frame = decodeFrame(this.buffer);
      if (!frame) break;

      this.buffer = this.buffer.subarray(frame.bytesConsumed);

      if (frame.opcode === 0x01) { // text
        try {
          const msg = JSON.parse(frame.payload.toString('utf-8'));
          this.emit('_raw', msg);
          this._handleMessage(msg);
        } catch { /* skip malformed */ }
      } else if (frame.opcode === 0x08) { // close
        this.socket?.end();
      } else if (frame.opcode === 0x09) { // ping
        // Send pong
        if (this.socket) {
          const pong = Buffer.alloc(6);
          pong[0] = 0x8a; // FIN + pong
          pong[1] = 0x80; // masked, 0 length
          crypto.randomBytes(4).copy(pong, 2);
          this.socket.write(pong);
        }
      }
    }
  }

  _handleMessage(msg) {
    if (msg.type === 'event') {
      // Debug: log events (except ticks which are noisy)
      if (msg.event !== 'tick') {
        console.log(`[gw-ws] Event: ${msg.event} payload_keys=${msg.payload ? Object.keys(msg.payload).join(',') : 'null'}`);
      }
      this.emit('event', msg.event, msg.payload);
      return;
    }

    if (msg.type === 'res') {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.ok) {
        p.resolve(msg.payload);
      } else {
        p.reject(new Error(msg.error?.message || 'RPC failed'));
      }
    }
  }

  rpc(method, params, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
      if (!this._connected || !this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const id = crypto.randomUUID();
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method} (${timeoutMs}ms)`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      this._send({ type: 'req', id, method, params });
    });
  }

  _send(obj) {
    if (!this.socket || !this._connected) return;
    const frame = encodeFrame(JSON.stringify(obj));
    this.socket.write(frame);
  }

  destroy() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this.socket?.destroy();
    this.socket = null;
    this._connected = false;
    this._authenticated = false;
    this._connecting = false;
    this._rejectAllPending('Client destroyed');
  }

  _rejectAllPending(reason) {
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error(reason));
    }
    this.pending.clear();
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    console.log('[gw-ws] Scheduling reconnect in 3s...');
    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      try {
        await this.connect();
        console.log('[gw-ws] Reconnected ✓');
      } catch (err) {
        console.error('[gw-ws] Reconnect failed:', err.message);
        this._scheduleReconnect(); // Retry
      }
    }, 3000);
  }
}

// ── Singleton Gateway Client ──────────────────────────────────────────────────

const gw = new GatewayClient();

async function ensureConnected() {
  if (gw.connected) return;
  await gw.connect();
}

// ── Chat: Send message via OpenClaw Gateway ───────────────────────────────────

/**
 * Send a chat message through the real OpenClaw Gateway.
 * Streams deltas via the onDelta callback and returns the full response.
 *
 * @param {string} sessionKey - Unique session key (per client-contact pair)
 * @param {string} message - The message to send
 * @param {number} timeoutMs - Response timeout
 * @param {function} onDelta - Called with each text delta for streaming
 * @returns {Promise<string>} Full response text
 */
function chatSend(sessionKey, message, timeoutMs = 120000, onDelta = null) {
  return new Promise((resolve, reject) => {
    let fullContent = '';
    let settled = false;
    let runId = null;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        gw.removeListener('event', onEvent);
        reject(new Error('Chat response timeout'));
      }
    }, timeoutMs);

    function extractText(msg) {
      if (typeof msg === 'string') return msg;
      if (!msg?.content) return '';
      const blocks = Array.isArray(msg.content) ? msg.content : [msg.content];
      return blocks
        .filter(b => b.type === 'text' || typeof b === 'string')
        .map(b => typeof b === 'string' ? b : b.text || '')
        .join('');
    }

    function onEvent(event, payload) {
      if (event !== 'chat') return;
      // Gateway prefixes sessionKey with "agent:main:" — match by suffix
      const evtSession = payload?.sessionKey || '';
      const sessionMatch = evtSession === sessionKey || evtSession.endsWith(':' + sessionKey);
      if (!sessionMatch) return;
      if (runId && payload.runId && payload.runId !== runId) return;
      if (!runId && payload.runId) runId = payload.runId;

      if (payload.state === 'delta') {
        const text = extractText(payload.message);
        if (text.length > fullContent.length) {
          const delta = text.substring(fullContent.length);
          fullContent = text;
          if (onDelta && delta) onDelta(delta);
        }
      } else if (payload.state === 'final') {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          gw.removeListener('event', onEvent);
          const text = extractText(payload.message);
          if (text) fullContent = text;
          resolve(fullContent);
        }
      } else if (payload.state === 'error' || payload.state === 'aborted') {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          gw.removeListener('event', onEvent);
          reject(new Error(payload.errorMessage || `Chat ${payload.state}`));
        }
      }
    }

    gw.on('event', onEvent);

    // Send via OpenClaw Gateway RPC
    const rpcId = crypto.randomUUID();
    console.log(`[bridge] chat.send RPC: session=${sessionKey.substring(0, 30)} idempotencyKey=${rpcId.substring(0, 8)}`);
    gw.rpc('chat.send', {
      sessionKey,
      message,
      deliver: false,
      idempotencyKey: rpcId,
    }, timeoutMs).then((result) => {
      console.log(`[bridge] chat.send RPC resolved: ${JSON.stringify(result)?.substring(0, 200)}`);
    }).catch((err) => {
      console.error(`[bridge] chat.send RPC rejected: ${err.message}`);
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        gw.removeListener('event', onEvent);
        reject(new Error(`chat.send RPC failed: ${err.message}`));
      }
    });
  });
}

// ── Session Context Management ────────────────────────────────────────────────

// Track which sessions have received their system context injection
const sessionContextMap = new Map(); // sessionKey → { injectedAt, systemContextHash }

function hashContext(ctx) {
  return crypto.createHash('md5').update(ctx || '').digest('hex').substring(0, 12);
}

/**
 * Check if a session needs context (re)injection.
 * Context is re-injected if:
 *   1. Session has never been initialized
 *   2. System context has changed (different business instructions)
 *   3. Context is older than 30 minutes
 */
function needsContextInjection(sessionKey, systemContext) {
  const existing = sessionContextMap.get(sessionKey);
  if (!existing) return true;

  const age = Date.now() - existing.injectedAt;
  if (age > 30 * 60 * 1000) return true; // 30 min refresh

  const newHash = hashContext(systemContext);
  if (existing.systemContextHash !== newHash) return true;

  return false;
}

function markContextInjected(sessionKey, systemContext) {
  sessionContextMap.set(sessionKey, {
    injectedAt: Date.now(),
    systemContextHash: hashContext(systemContext),
  });
}

// Clean up old sessions every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour
  for (const [key, val] of sessionContextMap) {
    if (val.injectedAt < cutoff) {
      sessionContextMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

// ── Tools Invoke Handler ──────────────────────────────────────────────────────
// Proxies requests to the OpenClaw Gateway's /tools/invoke HTTP API.
// This gives Kyra's dashboard access to EVERY OpenClaw tool.

async function handleToolsInvoke(body, res) {
  try {
    const parsed = JSON.parse(body);
    const { tool, action, args, sessionKey, dryRun } = parsed;

    if (!tool) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: { message: 'tool is required' } }));
    }

    console.log(`[bridge] tools/invoke: tool=${tool} action=${action || 'n/a'} session=${sessionKey || 'main'}`);

    // Forward to gateway's /tools/invoke HTTP API
    const gwBody = JSON.stringify({ tool, action, args: args || {}, sessionKey, dryRun });

    const result = await new Promise((resolve, reject) => {
      const gwReq = http.request({
        hostname: GATEWAY_HOST,
        port: GATEWAY_PORT,
        path: '/tools/invoke',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          'Content-Length': Buffer.byteLength(gwBody),
        },
      }, (gwRes) => {
        let data = '';
        gwRes.on('data', chunk => data += chunk);
        gwRes.on('end', () => {
          resolve({ statusCode: gwRes.statusCode, body: data });
        });
      });
      gwReq.on('error', reject);
      gwReq.setTimeout(120000, () => {
        gwReq.destroy();
        reject(new Error('Gateway request timeout'));
      });
      gwReq.write(gwBody);
      gwReq.end();
    });

    res.writeHead(result.statusCode, {
      'Content-Type': 'application/json',
      'X-Powered-By': 'OpenClaw',
    });
    res.end(result.body);
  } catch (err) {
    console.error(`[bridge] tools/invoke error: ${err.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: { message: err.message } }));
  }
}

// ── Sessions List Handler ─────────────────────────────────────────────────────

async function handleSessionsList(res) {
  try {
    await ensureConnected();
    const result = await gw.rpc('sessions.list', {
      kinds: ['main', 'direct', 'group'],
      limit: 50,
      messageLimit: 1,
    }, 30000);

    res.writeHead(200, { 'Content-Type': 'application/json', 'X-Powered-By': 'OpenClaw' });
    res.end(JSON.stringify({ ok: true, sessions: result }));
  } catch (err) {
    console.error(`[bridge] sessions list error: ${err.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: { message: err.message } }));
  }
}

// ── Sessions History Handler ──────────────────────────────────────────────────

async function handleSessionsHistory(body, res) {
  try {
    const parsed = JSON.parse(body);
    const { sessionKey, limit, includeTools } = parsed;

    if (!sessionKey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: { message: 'sessionKey required' } }));
    }

    await ensureConnected();
    const result = await gw.rpc('chat.history', {
      sessionKey,
      limit: limit || 50,
      includeTools: includeTools || false,
    }, 30000);

    res.writeHead(200, { 'Content-Type': 'application/json', 'X-Powered-By': 'OpenClaw' });
    res.end(JSON.stringify({ ok: true, messages: result }));
  } catch (err) {
    console.error(`[bridge] sessions history error: ${err.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: { message: err.message } }));
  }
}

// ── HTTP Server ───────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // ── Health check
  if (req.method === 'GET' && req.url === '/health') {
    const gwConnected = gw.connected;
    // Always return 200 — bridge is healthy even if gateway is still booting.
    // Fly.io health checks need this to pass during the 60-90s gateway startup.
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: gwConnected ? 'ok' : 'gateway_starting',
      openClaw: true,
      realOpenClaw: true,
      bridge: 'kyra-openclaw-bridge',
      version: '1.0.0',
      gatewayConnected: gwConnected,
      activeSessions: sessionContextMap.size,
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
    }));
  }

  // ── Tools Invoke endpoint (proxy to OpenClaw Gateway's /tools/invoke)
  // This exposes EVERY OpenClaw tool through the bridge: web_search, browser,
  // exec, memory, cron, sessions, canvas, nodes, message, image, and all skills.
  // Kyra's dashboard calls this to give agencies access to the full power of
  // OpenClaw without ever touching a terminal.
  if (req.method === 'POST' && req.url === '/tools/invoke') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      handleToolsInvoke(body, res);
    });
    return;
  }

  // ── Sessions List endpoint (list all active sessions)
  if (req.method === 'GET' && req.url === '/sessions') {
    handleSessionsList(res);
    return;
  }

  // ── Sessions History endpoint (get conversation history)
  if (req.method === 'POST' && req.url === '/sessions/history') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      handleSessionsHistory(body, res);
    });
    return;
  }

  // ── Chat endpoint
  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        handleChat(parsed, res);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON', detail: String(e) }));
      }
    });
    return;
  }

  // ── OpenClaw Gateway Dashboard (full proxy)
  // Proxy the entire OpenClaw webchat UI + API through the bridge.
  // This gives agencies the FULL Gateway Dashboard experience:
  // Chat, Sessions, Cron Jobs, Skills, Nodes, Config, Logs, etc.
  if (req.url.startsWith('/__openclaw__') || req.url.startsWith('/api/') || req.url === '/favicon.ico') {
    proxyToGateway(req, res);
    return;
  }

  // ── Dashboard redirect (/ → /__openclaw__/)
  if (req.method === 'GET' && req.url === '/dashboard') {
    res.writeHead(302, { 'Location': '/__openclaw__/' });
    res.end();
    return;
  }

  // ── Not found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found. POST /chat or GET /health' }));
});

// ── Gateway Reverse Proxy ─────────────────────────────────────────────────────
// Proxies HTTP requests to the OpenClaw Gateway's internal HTTP server.
// This exposes the full Gateway Dashboard (webchat UI) through the bridge.

function proxyToGateway(clientReq, clientRes) {
  const gwUrl = `http://${GATEWAY_HOST}:${GATEWAY_PORT}${clientReq.url}`;
  const proxyReq = http.request(gwUrl, {
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      host: `${GATEWAY_HOST}:${GATEWAY_PORT}`,
      // Pass auth token if configured
      ...(GATEWAY_TOKEN ? { authorization: `Bearer ${GATEWAY_TOKEN}` } : {}),
    },
  }, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[proxy] Gateway proxy error: ${err.message}`);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
    }
    clientRes.end(JSON.stringify({ error: 'Gateway not available', detail: err.message }));
  });

  clientReq.pipe(proxyReq, { end: true });
}

// ── Chat Handler ──────────────────────────────────────────────────────────────

async function handleChat(params, res) {
  const {
    message,
    sessionKey = 'default',
    systemContext = '',
  } = params;

  if (!message) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'message required' }));
  }

  // Ensure gateway connection
  try {
    await ensureConnected();
  } catch (err) {
    console.error('[bridge] Gateway connection failed:', err.message);
    res.writeHead(503, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: 'OpenClaw Gateway not available',
      detail: err.message,
    }));
  }

  // Build the full message with context injection
  let fullMessage;
  const injectContext = systemContext && needsContextInjection(sessionKey, systemContext);

  if (injectContext) {
    // First message or context changed — inject full system context
    fullMessage = [
      '=== SYSTEM CONTEXT (follow these instructions) ===',
      systemContext,
      '=== END SYSTEM CONTEXT ===',
      '',
      'Customer message:',
      message,
    ].join('\n');

    markContextInjected(sessionKey, systemContext);
    console.log(`[bridge] Session ${sessionKey.substring(0, 30)}... — context injected`);
  } else {
    fullMessage = message;
  }

  console.log(`[bridge] Chat: session=${sessionKey.substring(0, 40)} msg="${message.substring(0, 80)}" context=${injectContext ? 'yes' : 'cached'}`);

  // Set up SSE streaming response
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Powered-By': 'OpenClaw',
  });

  try {
    const startTime = Date.now();

    const fullResponse = await chatSend(
      sessionKey,
      fullMessage,
      120000,
      (delta) => {
        // Stream each delta as SSE event
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: 'content', content: delta })}\n\n`);
        }
      }
    );

    const elapsed = Date.now() - startTime;
    console.log(`[bridge] Response: ${fullResponse.length} chars in ${elapsed}ms — session=${sessionKey.substring(0, 30)}`);

    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'done', fullResponse })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (err) {
    console.error(`[bridge] Chat error: ${err.message} — session=${sessionKey.substring(0, 30)}`);

    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}

// ── Startup ───────────────────────────────────────────────────────────────────

// ── WebSocket Proxy (for Gateway Dashboard) ──────────────────────────────────
// The OpenClaw webchat UI connects via WebSocket. We proxy upgrade requests
// from the dashboard directly to the gateway's WebSocket server.

server.on('upgrade', (req, clientSocket, head) => {
  // Only proxy WebSocket connections for the dashboard
  const gwUrl = `ws://${GATEWAY_HOST}:${GATEWAY_PORT}${req.url || '/'}`;
  console.log(`[ws-proxy] Upgrade request: ${req.url} → ${gwUrl}`);

  const gwSocket = net.connect(GATEWAY_PORT, GATEWAY_HOST, () => {
    // Forward the HTTP upgrade request to the gateway
    const headers = Object.entries(req.headers)
      .filter(([key]) => key !== 'host')
      .map(([key, val]) => `${key}: ${val}`)
      .join('\r\n');

    const upgradeReq = [
      `${req.method} ${req.url} HTTP/1.1`,
      `Host: ${GATEWAY_HOST}:${GATEWAY_PORT}`,
      headers,
      '', ''
    ].join('\r\n');

    gwSocket.write(upgradeReq);
    if (head && head.length > 0) gwSocket.write(head);

    // Once connected, pipe both directions
    gwSocket.once('data', (chunk) => {
      // First chunk includes the HTTP upgrade response
      clientSocket.write(chunk);
      // Now pipe bidirectionally
      gwSocket.pipe(clientSocket);
      clientSocket.pipe(gwSocket);
    });
  });

  gwSocket.on('error', (err) => {
    console.error(`[ws-proxy] Gateway WS error: ${err.message}`);
    clientSocket.destroy();
  });

  clientSocket.on('error', (err) => {
    console.error(`[ws-proxy] Client WS error: ${err.message}`);
    gwSocket.destroy();
  });

  clientSocket.on('close', () => gwSocket.destroy());
  gwSocket.on('close', () => clientSocket.destroy());
});

server.listen(BRIDGE_PORT, '0.0.0.0', () => {
  console.log('');
  console.log('============================================');
  console.log('  Kyra OpenClaw Bridge');
  console.log(`  HTTP API on port ${BRIDGE_PORT}`);
  console.log(`  Gateway WS on ${GATEWAY_HOST}:${GATEWAY_PORT}`);
  console.log('');
  console.log('  This is REAL OpenClaw.');
  console.log('  60+ skills. Persistent memory.');
  console.log('  Sub-agents. Tool system. The works.');
  console.log('============================================');
  console.log('');

  // Connect to gateway with retry loop (gateway takes 60-90s to boot)
  async function connectWithRetry() {
    const maxRetries = 30; // 30 * 5s = 150s max wait
    for (let i = 1; i <= maxRetries; i++) {
      try {
        await ensureConnected();
        console.log('[bridge] Gateway connected — ready for requests');
        return;
      } catch (err) {
        console.log(`[bridge] Gateway not ready (attempt ${i}/${maxRetries}): ${err.message}`);
        if (i < maxRetries) await new Promise(r => setTimeout(r, 5000));
      }
    }
    console.error('[bridge] Gateway did not become available after retries. Will retry on first request.');
  }
  connectWithRetry();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[bridge] SIGTERM received, shutting down...');
  gw.destroy();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000);
});

process.on('SIGINT', () => {
  console.log('[bridge] SIGINT received, shutting down...');
  gw.destroy();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000);
});
