# Kyra Infrastructure

VPS: `ubuntu@15.204.91.157` | Docker + Traefik + nginx CSS proxy

## Key Fixes Applied

### WebSocket Fix (Feb 22, 2026)
`nginx/kyra-css-proxy.conf` strips `Sec-WebSocket-Extensions` header to prevent 
permessage-deflate compression negotiation. nginx can't relay compressed WS frames 
transparently → RSV2/RSV3 frame corruption → "Disconnected from gateway".

**Fix:** `proxy_set_header Sec-WebSocket-Extensions "";`

### devices/ Directory Fix (Feb 22, 2026)
`provisioner/server.js` now pre-creates `devices/` dir with empty `paired.json` and 
`pending.json` for every new container. Without this, `dangerouslyDisableDeviceAuth: true` 
still rejects connections with "device identity required" — OpenClaw needs the directory 
to create virtual device sessions.

## Deploy
```bash
# Restart provisioner (PROVISIONER_SECRET must be exported from /opt/kyra/.env or shell — never hardcode).
sudo bash -c 'cd /opt/kyra/provisioner && source /opt/kyra/.env && nohup node server.js >> /tmp/provisioner.log 2>&1 &'

# Reload nginx (WS fix)
docker exec kyra-css-proxy nginx -s reload

# Restart all containers
bash /opt/kyra/restart-all.sh
```
