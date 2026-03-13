# Container Sync API Reference

## Provisioner Base URL
```
const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'http://15.204.91.157:9090';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET || '';
```

Auth header: `Authorization: Bearer ${PROVISIONER_SECRET}`

## Existing Endpoints

### Write workspace files (SOUL.md, USER.md, TOOLS.md, AGENTS.md)
```
PUT /containers/:clientId/config
Body: { soulMd?, userMd?, toolsMd?, agentsMd?, knowledgeBase?: string[] }
```
Already wrapped in `lib/ovh/provisioner.ts` → `updateClientConfig(clientId, config)`

### Patch openclaw.json (channels, model, etc.)
```
PATCH /containers/:clientId/openclaw-config
Body: { patch: { channels: {...}, agents: {...} } }
```
Already wrapped → `patchGatewayConfig(clientId, patch)`

### Read openclaw.json
```
GET /containers/:clientId/openclaw-config
Response: { config: {...} }
```
Already wrapped → `getGatewayConfig(clientId)`

## NEW Endpoints (just added)

### Write arbitrary workspace file
```
PUT /containers/:clientId/workspace-file
Body: { path: "INTEGRATIONS.md", content: "# content..." }
```
Writes to `/home/node/.openclaw/workspace/{path}` inside the container.
Security: `..` stripped, leading `/` stripped.

### Read arbitrary workspace file
```
GET /containers/:clientId/workspace-file?path=INTEGRATIONS.md
Response: { ok: true, path: "INTEGRATIONS.md", content: "..." }
```

### Sync secrets as .env file
```
POST /containers/:clientId/sync-secrets
Body: { secrets: [{ key: "GITHUB_TOKEN", value: "ghp_..." }] }
```
Writes `.secrets.env` to workspace root. Format: `KEY=VALUE\n` per line.

## Provisioner Fetch Helper
Use the existing `provisionerFetch()` from `lib/ovh/provisioner.ts`:
```typescript
import { provisionerFetch } from '@/lib/ovh/provisioner';
// It's not exported — but it's a simple fetch wrapper:
const PROVISIONER_URL = process.env.OVH_PROVISIONER_URL || 'http://15.204.91.157:9090';
const PROVISIONER_SECRET = process.env.OVH_PROVISIONER_SECRET || '';
```

## Pattern for Sync Functions
Every sync function should:
1. Read data from Supabase
2. Format it for the container
3. Write to container via provisioner
4. Optionally send a wake event to the gateway so the AI re-reads files

Wake event pattern (from knowledge sync):
```typescript
await fetch(`${gateway.url}/api/cron`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${gateway.token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'wake',
    text: '[System] Configuration updated. Re-read workspace files.',
  }),
});
```

## Container Workspace File Layout
```
/home/node/.openclaw/workspace/
├── SOUL.md          ← AI persona (written by AI Personality tab)
├── USER.md          ← About the client's business
├── TOOLS.md         ← Available tools + secrets instructions
├── AGENTS.md        ← Agent behavior rules
├── MEMORY.md        ← Long-term memory
├── KNOWLEDGE_BASE.md ← Knowledge Base content
├── INTEGRATIONS.md  ← GHL + other integration configs (NEW)
├── AUTOMATIONS.md   ← Automation rules (NEW)
├── SKILLS.md        ← Enabled skills list (NEW)
├── .secrets.env     ← Decrypted secrets (NEW, mode 600)
└── memory/          ← Daily memory files
```
