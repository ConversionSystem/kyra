/**
 * OpenClaw Gateway WebSocket RPC Client
 * 
 * Uses Node.js native net/http to create a raw WebSocket connection,
 * avoiding webpack bundling issues with the `ws` library.
 * 
 * Protocol:
 *   1. Connect via HTTP upgrade to ws://host:port
 *   2. Wait for connect.challenge event
 *   3. Send connect request with auth token
 *   4. Use chat.send RPC method
 *   5. Listen for chat events (delta, final, error)
 */

import http from 'http';
import crypto from 'crypto';
import { EventEmitter } from 'events';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_API_KEY || '';

function uuid(): string {
  return crypto.randomUUID();
}

// ── Minimal WebSocket frame encoder/decoder ──────────────────────────────

function encodeFrame(payload: string): Buffer {
  const data = Buffer.from(payload, 'utf-8');
  const mask = crypto.randomBytes(4);
  
  let header: Buffer;
  if (data.length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text
    header[1] = 0x80 | data.length; // MASK + length
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
  
  // Apply mask
  const masked = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    masked[i] = data[i] ^ mask[i % 4];
  }
  
  return Buffer.concat([header, mask, masked]);
}

interface FrameResult {
  opcode: number;
  payload: Buffer;
  bytesConsumed: number;
}

function decodeFrame(buf: Buffer): FrameResult | null {
  if (buf.length < 2) return null;
  
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
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
  
  if (masked) offset += 4;
  if (buf.length < offset + payloadLen) return null;
  
  let payload = buf.subarray(offset, offset + payloadLen);
  
  if (masked) {
    const maskKey = buf.subarray(offset - 4, offset);
    payload = Buffer.alloc(payloadLen);
    for (let i = 0; i < payloadLen; i++) {
      payload[i] = buf[offset + i] ^ maskKey[i % 4];
    }
  }
  
  return { opcode, payload, bytesConsumed: offset + payloadLen };
}

// ── Gateway Client ───────────────────────────────────────────────────────

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

class GatewayWsClient extends EventEmitter {
  private socket: import('net').Socket | null = null;
  private buffer = Buffer.alloc(0);
  private pending = new Map<string, PendingRequest>();
  private _connected = false;
  private _authenticated = false;

  get connected(): boolean { return this._connected && this._authenticated; }

  async connect(): Promise<void> {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      const url = new URL(GATEWAY_URL);
      const key = crypto.randomBytes(16).toString('base64');

      const timer = setTimeout(() => {
        this.destroy();
        reject(new Error('Gateway WS connect timeout'));
      }, 15000);

      const req = http.request({
        hostname: url.hostname,
        port: parseInt(url.port) || 18789,
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

        socket.on('data', (chunk: Buffer) => {
          this.buffer = Buffer.concat([this.buffer, chunk]);
          this.processFrames();
        });

        socket.on('close', () => {
          this._connected = false;
          this._authenticated = false;
          this.socket = null;
          this.rejectAllPending('WebSocket closed');
        });

        socket.on('error', (err: Error) => {
          console.error('[GW-WS] Socket error:', err.message);
          this._connected = false;
          this._authenticated = false;
        });

        console.log('[GW-WS] Upgraded, waiting for challenge...');
      });

      // Handle the connect.challenge → authenticate flow
      const onMessage = (msg: any) => {
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          // Send connect auth
          this.rpc('connect', {
            minProtocol: 3,
            maxProtocol: 3,
            client: { id: 'kyra-backend', version: '0.3.0', platform: 'node', mode: 'backend' },
            role: 'operator',
            scopes: ['operator.admin'],
            auth: { token: GATEWAY_TOKEN },
            caps: [],
          }, 10000).then(() => {
            clearTimeout(timer);
            this._authenticated = true;
            this.removeListener('_raw', onMessage);
            console.log('[GW-WS] Authenticated ✓');
            resolve();
          }).catch((err) => {
            clearTimeout(timer);
            this.removeListener('_raw', onMessage);
            reject(err);
          });
        }
      };
      this.on('_raw', onMessage);

      req.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`Gateway connect error: ${err.message}`));
      });

      req.end();
    });
  }

  private processFrames(): void {
    while (this.buffer.length > 0) {
      const frame = decodeFrame(this.buffer);
      if (!frame) break;

      this.buffer = this.buffer.subarray(frame.bytesConsumed);

      if (frame.opcode === 0x01) { // text
        try {
          const msg = JSON.parse(frame.payload.toString('utf-8'));
          this.emit('_raw', msg);
          this.handleMessage(msg);
        } catch { /* skip */ }
      } else if (frame.opcode === 0x08) { // close
        this.socket?.end();
      } else if (frame.opcode === 0x09) { // ping
        this.sendRaw(Buffer.from([0x8a, 0x80, 0, 0, 0, 0])); // pong
      }
    }
  }

  private handleMessage(msg: any): void {
    if (msg.type === 'event') {
      this.emit('event', msg.event, msg.payload);
      return;
    }

    if (msg.type === 'res') {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.ok) p.resolve(msg.payload);
      else p.reject(new Error(msg.error?.message || 'RPC failed'));
    }
  }

  rpc(method: string, params: any, timeoutMs = 120000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this._connected || !this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const id = uuid();
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      this.send({ type: 'req', id, method, params });
    });
  }

  private send(obj: any): void {
    if (!this.socket || !this._connected) return;
    const frame = encodeFrame(JSON.stringify(obj));
    this.socket.write(frame);
  }

  private sendRaw(buf: Buffer): void {
    if (!this.socket) return;
    this.socket.write(buf);
  }

  destroy(): void {
    this.socket?.destroy();
    this.socket = null;
    this._connected = false;
    this._authenticated = false;
    this.rejectAllPending('Client destroyed');
  }

  private rejectAllPending(reason: string): void {
    const keys = Array.from(this.pending.keys());
    for (const k of keys) {
      const p = this.pending.get(k)!;
      clearTimeout(p.timer);
      p.reject(new Error(reason));
    }
    this.pending.clear();
  }
}

// ── Singleton ────────────────────────────────────────────────────────────

let gwClient: GatewayWsClient | null = null;

function getGw(): GatewayWsClient {
  if (!gwClient) {
    gwClient = new GatewayWsClient();
  }
  return gwClient;
}

/**
 * Connect to gateway (idempotent)
 */
export async function connectGateway(): Promise<void> {
  const gw = getGw();
  if (gw.connected) return;
  await gw.connect();
}

/**
 * Check if gateway is connected
 */
export function isGatewayConnected(): boolean {
  return gwClient?.connected === true;
}

/**
 * Health check — try to connect
 */
export async function gatewayHealthCheck(): Promise<boolean> {
  try {
    await connectGateway();
    return isGatewayConnected();
  } catch {
    return false;
  }
}

/**
 * Send a chat message and collect the full response.
 */
export async function chatSend(
  sessionKey: string,
  message: string,
  timeoutMs = 120000,
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    await connectGateway();
  } catch (err) {
    return { success: false, error: `Gateway connection failed: ${String(err)}` };
  }

  const gw = getGw();

  return new Promise((resolve) => {
    let fullContent = '';
    let settled = false;
    let runId: string | null = null;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        gw.removeListener('event', onEvent);
        resolve({ success: false, error: 'Chat response timeout' });
      }
    }, timeoutMs);

    function extractText(msg: any): string {
      if (typeof msg === 'string') return msg;
      if (!msg?.content) return '';
      const blocks = Array.isArray(msg.content) ? msg.content : [msg.content];
      return blocks
        .filter((b: any) => b.type === 'text' || typeof b === 'string')
        .map((b: any) => typeof b === 'string' ? b : b.text || '')
        .join('');
    }

    function onEvent(event: string, payload: any) {
      if (event !== 'chat' || payload?.sessionKey !== sessionKey) return;
      if (runId && payload.runId && payload.runId !== runId) return;
      if (!runId && payload.runId) runId = payload.runId;

      if (payload.state === 'delta') {
        const text = extractText(payload.message);
        if (text.length >= fullContent.length) fullContent = text;
      } else if (payload.state === 'final') {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          gw.removeListener('event', onEvent);
          const text = extractText(payload.message);
          if (text) fullContent = text;
          resolve({ success: true, content: fullContent });
        }
      } else if (payload.state === 'error' || payload.state === 'aborted') {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          gw.removeListener('event', onEvent);
          resolve({ success: false, error: payload.errorMessage || `Chat ${payload.state}` });
        }
      }
    }

    gw.on('event', onEvent);

    // Send the chat message
    gw.rpc('chat.send', {
      sessionKey,
      message,
      deliver: false,
    }, timeoutMs).catch((err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        gw.removeListener('event', onEvent);
        resolve({ success: false, error: `chat.send failed: ${String(err)}` });
      }
    });
  });
}
