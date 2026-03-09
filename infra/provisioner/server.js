const express = require('express');
const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const { execSync } = require('child_process');

const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors());

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const PORT = 9090;
const PROVISIONER_SECRET = process.env.PROVISIONER_SECRET || 'kyra-provisioner-2026';
const DATA_DIR = '/opt/kyra/data/clients';
const DYNAMIC_DIR = '/opt/kyra/traefik/dynamic';
const NETWORK_NAME = 'kyra-net';
const DOMAIN_SUFFIX = 'gw.kyra.conversionsystem.com';
const GATEWAY_IMAGE = 'kyra-gateway:latest';

// Kyra Router — shared sidecar for intelligent model routing
// One instance per VPS. All OpenClaw containers route through it.
const KYRA_ROUTER_IMAGE = 'kyra-router:latest';
const KYRA_ROUTER_NAME = 'kyra-router';
const KYRA_ROUTER_PORT = 8104;
const KYRA_ROUTER_URL = `http://${KYRA_ROUTER_NAME}:${KYRA_ROUTER_PORT}/v1`;

/**
 * Ensure the shared kyra-router container is running.
 * Called once at provisioner startup and before any new container is created.
 */
async function ensureKyraRouter() {
  try {
    const existing = docker.getContainer(KYRA_ROUTER_NAME);
    const info = await existing.inspect();
    if (info.State.Running) {
      console.log('[kyra-router] already running');
      return;
    }
    console.log('[kyra-router] starting stopped container...');
    await existing.start();
    return;
  } catch (_) {
    // Container doesn't exist — create it
  }

  console.log('[kyra-router] creating shared router container...');
  try {
    const container = await docker.createContainer({
      Image: KYRA_ROUTER_IMAGE,
      name: KYRA_ROUTER_NAME,
      Hostname: KYRA_ROUTER_NAME,
      Env: [
        `OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ''}`,
        `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}`,
        `OPENROUTER_API_KEY=${process.env.OPENROUTER_API_KEY || ''}`,
        `KYRA_MAX_TIER=2`,        // cap at GPT-4o-mini / Haiku by default
        `KYRA_DAILY_CAP=50.00`,   // $50/day across all containers (shared)
        `KYRA_MONTHLY_BUDGET=500.00`,
      ],
      Labels: { 'kyra.managed': 'true', 'kyra.role': 'router' },
      HostConfig: {
        Memory: 256 * 1024 * 1024,   // 256MB — lightweight Python service
        NetworkMode: NETWORK_NAME,
        RestartPolicy: { Name: 'unless-stopped' },
      },
    });
    await container.start();
    console.log('[kyra-router] started successfully');
  } catch (err) {
    console.error('[kyra-router] failed to start:', err.message);
    // Non-fatal — containers will fall back to direct API calls
  }
}

// Build the default openclaw.json for a new client container
function buildOpenclawConfig(authToken, clientId, agencyId, clientName, agentModel) {
  const agentName = clientName ? clientName.trim() : 'AI Assistant';
  const gatewayUrl = 'https://' + clientId + '.gw.kyra.conversionsystem.com';
  const model = agentModel || {
    primary: 'openai/gpt-4o-mini',
    fallbacks: ['openai/gpt-4o'],
  };
  return {
    gateway: {
      auth: { mode: 'token', token: authToken },
      trustedProxies: ['172.16.0.0/12', '10.0.0.0/8'],
      http: {
        endpoints: {
          chatCompletions: { enabled: true }
        }
      },
      controlUi: {
        allowedOrigins: [
          'https://kyra.conversionsystem.com',
          gatewayUrl
        ],
        dangerouslyDisableDeviceAuth: true
      }
    },
    agents: {
      defaults: { model }
    },
    ui: {
      assistant: {
        name: agentName,
        avatar: gatewayUrl + '/favicon.svg'
      }
    }
  };
}

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== PROVISIONER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use('/containers', auth);
app.use('/image', auth);

// ============ HEALTH ============
app.get('/health', async (req, res) => {
  try {
    const info = await docker.info();
    const containers = await docker.listContainers({ all: true });
    const kyraContainers = containers.filter(c => 
      c.Names.some(n => n.startsWith('/kyra-cl-'))
    );
    
    const memTotal = info.MemTotal;
    const memUsed = memTotal - (info.MemTotal - info.MemTotal); // approximate
    
    // Get system memory from /proc
    let memInfo = {};
    try {
      const memRaw = fs.readFileSync('/proc/meminfo', 'utf8');
      const totalMatch = memRaw.match(/MemTotal:\s+(\d+)/);
      const availMatch = memRaw.match(/MemAvailable:\s+(\d+)/);
      if (totalMatch && availMatch) {
        memInfo.totalMb = Math.round(parseInt(totalMatch[1]) / 1024);
        memInfo.availableMb = Math.round(parseInt(availMatch[1]) / 1024);
        memInfo.usedMb = memInfo.totalMb - memInfo.availableMb;
        memInfo.usagePercent = Math.round((memInfo.usedMb / memInfo.totalMb) * 100);
      }
    } catch (e) {}
    
    // Disk usage
    let diskInfo = {};
    try {
      const dfOut = execSync('df -BM / | tail -1').toString().trim().split(/\s+/);
      diskInfo.totalMb = parseInt(dfOut[1]);
      diskInfo.usedMb = parseInt(dfOut[2]);
      diskInfo.availableMb = parseInt(dfOut[3]);
      diskInfo.usagePercent = parseInt(dfOut[4]);
    } catch (e) {}
    
    res.json({
      status: 'healthy',
      hostname: info.Name,
      docker: info.ServerVersion,
      containers: {
        total: kyraContainers.length,
        running: kyraContainers.filter(c => c.State === 'running').length,
        stopped: kyraContainers.filter(c => c.State !== 'running').length
      },
      memory: memInfo,
      disk: diskInfo,
      cpus: info.NCPU,
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ LIST CONTAINERS ============
app.get('/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const kyraContainers = containers
      .filter(c => c.Names.some(n => n.startsWith('/kyra-cl-')))
      .map(c => ({
        containerId: c.Names[0].replace('/', ''),
        clientId: c.Labels['kyra.client.id'] || 'unknown',
        agencyId: c.Labels['kyra.agency.id'] || 'unknown',
        status: c.State,
        created: new Date(c.Created * 1000).toISOString(),
        image: c.Image,
        gatewayUrl: `https://${c.Labels['kyra.client.id'] || 'unknown'}.${DOMAIN_SUFFIX}`
      }));
    
    res.json({ containers: kyraContainers, count: kyraContainers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ CREATE CONTAINER ============
app.post('/containers', async (req, res) => {
  try {
    const {
      clientId,
      agencyId,
      clientName,
      config = {},
      resources = {},
      tools = {},
      autoStop = {},
      agentModel,    // optional: { primary, fallbacks } — overrides default model
    } = req.body;

    if (!clientId || !agencyId) {
      return res.status(400).json({ error: 'clientId and agencyId are required' });
    }

    const containerPrefix = req.body.containerPrefix || 'kyra-cl';
    const containerName = `${containerPrefix}-${clientId}`;
    const clientDataDir = path.join(DATA_DIR, clientId);
    const authToken = crypto.randomBytes(32).toString('hex');

    // Check if container already exists
    try {
      const existing = docker.getContainer(containerName);
      const info = await existing.inspect();
      return res.status(409).json({ 
        error: 'Container already exists',
        status: info.State.Status,
        gatewayUrl: `https://${clientId}.${DOMAIN_SUFFIX}`
      });
    } catch (e) {
      // Container doesn't exist — good
    }

    // Create client data directory
    fs.mkdirSync(clientDataDir, { recursive: true });
    fs.mkdirSync(path.join(clientDataDir, 'openclaw'), { recursive: true });
    fs.mkdirSync(path.join(clientDataDir, 'openclaw', 'workspace'), { recursive: true });
    fs.mkdirSync(path.join(clientDataDir, 'openclaw', 'workspace', 'memory'), { recursive: true });
    // Pre-create devices/ directory — required for dangerouslyDisableDeviceAuth to work
    // Without this, OpenClaw rejects all connections with 'device identity required'
    const devicesDir = path.join(clientDataDir, 'openclaw', 'devices');
    fs.mkdirSync(devicesDir, { recursive: true });
    if (!fs.existsSync(path.join(devicesDir, 'paired.json'))) {
      fs.writeFileSync(path.join(devicesDir, 'paired.json'), '{}');
      fs.writeFileSync(path.join(devicesDir, 'pending.json'), '{}');
    }

    // Write workspace files
    if (config.soulMd) {
      fs.writeFileSync(path.join(clientDataDir, 'openclaw', 'workspace', 'SOUL.md'), config.soulMd);
    }
    if (config.userMd) {
      fs.writeFileSync(path.join(clientDataDir, 'openclaw', 'workspace', 'USER.md'), config.userMd);
    }
    if (config.toolsMd) {
      fs.writeFileSync(path.join(clientDataDir, 'openclaw', 'workspace', 'TOOLS.md'), config.toolsMd);
    }
    if (config.agentsMd) {
      fs.writeFileSync(path.join(clientDataDir, 'openclaw', 'workspace', 'AGENTS.md'), config.agentsMd);
    }

    // Write knowledge base if provided
    if (config.knowledgeBase && Array.isArray(config.knowledgeBase)) {
      const kbDir = path.join(clientDataDir, 'openclaw', 'workspace', 'knowledge');
      fs.mkdirSync(kbDir, { recursive: true });
      config.knowledgeBase.forEach((chunk, i) => {
        fs.writeFileSync(path.join(kbDir, `kb-${i}.md`), chunk);
      });
    }

    // Write openclaw.json to host filesystem (persists across container recreation)
    const openclawConfigPath = path.join(clientDataDir, 'openclaw', 'openclaw.json');
    const openclawConfig = buildOpenclawConfig(authToken, clientId, agencyId, clientName || config.clientName, agentModel);
    fs.writeFileSync(openclawConfigPath, JSON.stringify(openclawConfig, null, 2));

    // Store auth token and metadata
    fs.writeFileSync(path.join(clientDataDir, 'meta.json'), JSON.stringify({
      clientId,
      agencyId,
      authToken,
      createdAt: new Date().toISOString(),
      tools,
      resources,
      autoStop
    }, null, 2));

    // Fix ownership so node user (uid 1000) inside container can write
    try { execSync('chown -R 1000:1000 ' + clientDataDir); } catch(e) { console.warn('chown failed:', e.message); }

    // Resource limits
    const memoryMb = resources.memoryMb || 1024;
    const cpuShares = resources.cpuShares || 256;

    // Build API key env vars — use agency-provided keys if available, fall back to provisioner default
    const PROVIDER_ENV_MAP = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      google: 'GOOGLE_AI_API_KEY',
    };
    const providedApiKeys = req.body.apiKeys || {};
    const apiKeyEnvs = [];
    for (const [provider, key] of Object.entries(providedApiKeys)) {
      const envName = PROVIDER_ENV_MAP[provider];
      if (envName && key) apiKeyEnvs.push(`${envName}=${key}`);
    }
    // Fallback to provisioner's own key if agency hasn't set any
    if (apiKeyEnvs.length === 0) {
      apiKeyEnvs.push(`OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ''}`);
    }

    // Ensure the shared kyra-router is running before creating new containers
    await ensureKyraRouter();

    // Create container
    const container = await docker.createContainer({
      Image: GATEWAY_IMAGE,
      name: containerName,
      Hostname: containerName,
      Cmd: ['openclaw', 'gateway', 'run', '--port', '18789', '--bind', 'lan', '--allow-unconfigured', '--token', authToken],
      Env: [
        `KYRA_CLIENT_ID=${clientId}`,
        `KYRA_AGENCY_ID=${agencyId}`,
        `OPENCLAW_GATEWAY_TOKEN=${authToken}`,
        `KYRA_AUTH_TOKEN=${authToken}`,
        `NODE_OPTIONS=--max-old-space-size=${memoryMb}`,
        // Route all AI calls through kyra-router for 60-90% cost savings
        `OPENAI_BASE_URL=${KYRA_ROUTER_URL}`,
        // Set max model tier based on client's selected AI model (from Kyra dashboard)
        `KYRA_MAX_TIER=${req.body.routerMaxTier ?? 2}`,
        ...apiKeyEnvs,
      ],
      Labels: {
        'kyra.client.id': clientId,
        'kyra.agency.id': agencyId,
        'kyra.managed': 'true',
        'kyra.created': new Date().toISOString()
      },
      HostConfig: {
        Memory: memoryMb * 1024 * 1024,
        CpuShares: cpuShares,
        NetworkMode: NETWORK_NAME,
        Binds: [
          `${clientDataDir}/openclaw:/home/node/.openclaw`
        ],
        RestartPolicy: { Name: 'unless-stopped' },
        ReadonlyRootfs: false,
        CapDrop: ['NET_RAW', 'SYS_ADMIN', 'MKNOD']
      }
    });

    // Start the container
    await container.start();

    // Write Traefik dynamic config
    const traefikConfig = `http:
  routers:
    ${containerName}:
      rule: "Host(\`${clientId}.${DOMAIN_SUFFIX}\`)"
      service: ${containerName}-svc
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt

  services:
    ${containerName}-svc:
      loadBalancer:
        servers:
          - url: "http://${containerName}:18789"
`;

    fs.writeFileSync(path.join(DYNAMIC_DIR, `${clientId}.yml`), traefikConfig);

    console.log(`[CREATE] Container ${containerName} created for client ${clientId} (agency: ${agencyId})`);

    res.status(201).json({
      containerId: containerName,
      clientId,
      agencyId,
      gatewayUrl: `https://${clientId}.${DOMAIN_SUFFIX}`,
      authToken,
      status: 'running',
      resources: { memoryMb, cpuShares },
      createdAt: new Date().toISOString()
    });

  } catch (err) {
    console.error(`[CREATE ERROR]`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ GET CONTAINER ============
app.get('/containers/:id', async (req, res) => {
  try {
    const clientId = req.params.id;
    const containerPrefix = req.body.containerPrefix || 'kyra-cl';
    const containerName = `${containerPrefix}-${clientId}`;
    const container = docker.getContainer(containerName);
    const info = await container.inspect();
    
    // Read metadata
    let meta = {};
    const metaPath = path.join(DATA_DIR, clientId, 'meta.json');
    if (fs.existsSync(metaPath)) {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    }

    res.json({
      containerId: containerName,
      clientId,
      agencyId: info.Config.Labels['kyra.agency.id'],
      status: info.State.Status,
      running: info.State.Running,
      startedAt: info.State.StartedAt,
      created: info.Created,
      gatewayUrl: `https://${clientId}.${DOMAIN_SUFFIX}`,
      resources: {
        memoryMb: Math.round(info.HostConfig.Memory / 1024 / 1024),
        cpuShares: info.HostConfig.CpuShares
      },
      meta
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: 'Container not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ============ START CONTAINER ============
app.post('/containers/:id/start', async (req, res) => {
  try {
    const clientId = req.params.id;
    const container = docker.getContainer(`kyra-cl-${clientId}`);
    await container.start();
    console.log(`[START] Container kyra-cl-${clientId} started`);
    res.json({ status: 'started', clientId });
  } catch (err) {
    if (err.statusCode === 304) {
      return res.json({ status: 'already running', clientId: req.params.id });
    }
    res.status(500).json({ error: err.message });
  }
});

// ============ STOP CONTAINER ============
app.post('/containers/:id/stop', async (req, res) => {
  try {
    const clientId = req.params.id;
    const container = docker.getContainer(`kyra-cl-${clientId}`);
    await container.stop({ t: 10 });
    console.log(`[STOP] Container kyra-cl-${clientId} stopped`);
    res.json({ status: 'stopped', clientId });
  } catch (err) {
    if (err.statusCode === 304) {
      return res.json({ status: 'already stopped', clientId: req.params.id });
    }
    res.status(500).json({ error: err.message });
  }
});

// ============ WAKE CONTAINER (start + wait for healthy) ============
app.post('/containers/:id/wake', async (req, res) => {
  try {
    const clientId = req.params.id;
    const containerPrefix = req.body.containerPrefix || 'kyra-cl';
    const containerName = `${containerPrefix}-${clientId}`;
    const container = docker.getContainer(containerName);
    
    const info = await container.inspect();
    if (info.State.Running) {
      return res.json({ status: 'already running', clientId });
    }

    await container.start();
    
    // Wait for health (up to 30 seconds)
    const gatewayUrl = `http://${containerName}:18789/health`;
    let healthy = false;
    for (let i = 0; i < 30; i++) {
      try {
        const resp = await fetch(gatewayUrl);
        if (resp.ok) { healthy = true; break; }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`[WAKE] Container ${containerName} woke up (healthy: ${healthy})`);
    res.json({ status: healthy ? 'running' : 'starting', clientId, healthy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ DELETE CONTAINER ============
app.delete('/containers/:id', async (req, res) => {
  try {
    const clientId = req.params.id;
    const containerPrefix = req.body.containerPrefix || 'kyra-cl';
    const containerName = `${containerPrefix}-${clientId}`;
    
    // Stop and remove container
    try {
      const container = docker.getContainer(containerName);
      try { await container.stop({ t: 5 }); } catch (e) {}
      await container.remove({ force: true });
    } catch (e) {
      if (e.statusCode !== 404) throw e;
    }

    // Remove Traefik config
    const traefikPath = path.join(DYNAMIC_DIR, `${clientId}.yml`);
    if (fs.existsSync(traefikPath)) {
      fs.unlinkSync(traefikPath);
    }

    // Keep data directory (for backup), but mark as deleted
    const metaPath = path.join(DATA_DIR, clientId, 'meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      meta.deletedAt = new Date().toISOString();
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    }

    console.log(`[DELETE] Container ${containerName} removed (data preserved)`);
    res.json({ status: 'deleted', clientId, dataPreserved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ UPDATE API KEY (recreates container with new env vars) ============
// PATCH /containers/:id/api-key
// Body: { apiKeys: { openai?: string, anthropic?: string, openrouter?: string, google?: string }, model?: string }
app.patch('/containers/:id/api-key', async (req, res) => {
  const clientId = req.params.id;
  const containerName = `kyra-cl-${clientId}`;

  try {
    const { apiKeys, model } = req.body;
    if (!apiKeys || typeof apiKeys !== 'object' || Object.keys(apiKeys).length === 0) {
      return res.status(400).json({ error: 'apiKeys object with at least one provider is required' });
    }

    const clientDataDir = path.join(DATA_DIR, clientId);
    if (!fs.existsSync(clientDataDir)) {
      return res.status(404).json({ error: 'Client data not found' });
    }

    // Inspect existing container to preserve its settings
    let containerInfo;
    try {
      containerInfo = await docker.getContainer(containerName).inspect();
    } catch (e) {
      return res.status(404).json({ error: 'Container not found' });
    }

    // Build updated env map from existing env
    const PROVIDER_ENV_MAP = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      google: 'GOOGLE_AI_API_KEY',
    };

    const envMap = {};
    for (const e of (containerInfo.Config.Env || [])) {
      const idx = e.indexOf('=');
      if (idx > 0) envMap[e.slice(0, idx)] = e.slice(idx + 1);
    }

    // Overlay new API keys
    for (const [provider, key] of Object.entries(apiKeys)) {
      const envName = PROVIDER_ENV_MAP[provider];
      if (envName && key) envMap[envName] = key;
    }

    const newEnv = Object.entries(envMap).map(([k, v]) => `${k}=${v}`);

    // Update openclaw.json model BEFORE recreating the container (file is on host)
    if (model) {
      const openclawConfigPath = path.join(clientDataDir, 'openclaw', 'openclaw.json');
      if (fs.existsSync(openclawConfigPath)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf8'));
          if (!cfg.agents) cfg.agents = {};
          if (!cfg.agents.defaults) cfg.agents.defaults = {};
          if (!cfg.agents.defaults.model) cfg.agents.defaults.model = {};
          cfg.agents.defaults.model.primary = model;
          fs.writeFileSync(openclawConfigPath, JSON.stringify(cfg, null, 2));
        } catch (e) {
          console.warn(`[API-KEY] Could not update openclaw.json model for ${clientId}:`, e.message);
        }
      }
    }

    // Recover auth token from env map (needed for CMD)
    const authToken = envMap['OPENCLAW_GATEWAY_TOKEN'] || envMap['KYRA_AUTH_TOKEN'] || '';
    const memoryMb = Math.round((containerInfo.HostConfig.Memory || 1024 * 1024 * 1024) / 1024 / 1024);
    const cpuShares = containerInfo.HostConfig.CpuShares || 256;
    const binds = containerInfo.HostConfig.Binds || [];
    const labels = containerInfo.Config.Labels || {};

    // Stop + remove old container (data directory is preserved)
    const oldContainer = docker.getContainer(containerName);
    try { await oldContainer.stop({ t: 10 }); } catch (e) { /* already stopped */ }
    await oldContainer.remove({ force: true });

    // Recreate with updated env
    const newContainer = await docker.createContainer({
      Image: GATEWAY_IMAGE,
      name: containerName,
      Hostname: containerName,
      Cmd: ['openclaw', 'gateway', 'run', '--port', '18789', '--bind', 'lan', '--allow-unconfigured', '--token', authToken],
      Env: newEnv,
      Labels: labels,
      HostConfig: {
        Memory: memoryMb * 1024 * 1024,
        CpuShares: cpuShares,
        NetworkMode: NETWORK_NAME,
        Binds: binds,
        RestartPolicy: { Name: 'unless-stopped' },
        ReadonlyRootfs: false,
        CapDrop: ['NET_RAW', 'SYS_ADMIN', 'MKNOD'],
      },
    });

    await newContainer.start();
    console.log(`[API-KEY] Updated keys for ${clientId} (providers: ${Object.keys(apiKeys).join(', ')}, model: ${model || 'unchanged'})`);
    res.json({ ok: true, clientId, providers: Object.keys(apiKeys), model: model || null });
  } catch (err) {
    console.error(`[API-KEY] Error updating ${clientId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ CONTAINER LOGS ============
app.get('/containers/:id/logs', async (req, res) => {
  try {
    const clientId = req.params.id;
    const container = docker.getContainer(`kyra-cl-${clientId}`);
    const logs = await container.logs({
      stdout: true, stderr: true, tail: parseInt(req.query.tail) || 50, timestamps: true
    });
    res.type('text/plain').send(logs.toString('utf8'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ UPDATE CONFIG ============
app.put('/containers/:id/config', async (req, res) => {
  try {
    const clientId = req.params.id;
    const clientDataDir = path.join(DATA_DIR, clientId, 'openclaw', 'workspace');
    
    if (!fs.existsSync(clientDataDir)) {
      return res.status(404).json({ error: 'Client data not found' });
    }

    const { soulMd, userMd, toolsMd, agentsMd, knowledgeBase } = req.body;

    if (soulMd !== undefined) {
      fs.writeFileSync(path.join(clientDataDir, 'SOUL.md'), soulMd);
    }
    if (userMd !== undefined) {
      fs.writeFileSync(path.join(clientDataDir, 'USER.md'), userMd);
    }
    if (toolsMd !== undefined) {
      fs.writeFileSync(path.join(clientDataDir, 'TOOLS.md'), toolsMd);
    }
    if (agentsMd !== undefined) {
      fs.writeFileSync(path.join(clientDataDir, 'AGENTS.md'), agentsMd);
    }
    if (knowledgeBase && Array.isArray(knowledgeBase)) {
      const kbDir = path.join(clientDataDir, 'knowledge');
      fs.mkdirSync(kbDir, { recursive: true });
      // Clear existing
      fs.readdirSync(kbDir).forEach(f => fs.unlinkSync(path.join(kbDir, f)));
      knowledgeBase.forEach((chunk, i) => {
        fs.writeFileSync(path.join(kbDir, `kb-${i}.md`), chunk);
      });
    }

    console.log(`[CONFIG] Updated config for client ${clientId}`);
    // Fix ownership so node user (uid 1000) can write
    try { execSync('chown -R 1000:1000 ' + clientDataDir); } catch(e) {}
    res.json({ status: 'updated', clientId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============ GATEWAY CONFIG MANAGEMENT (openclaw.json) ============

// Deep merge utility (target <- source)
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])
        && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Helper: read openclaw.json - prefer host file (always available, even when container stopped)
async function readOpenclawConfig(containerName) {
  // Extract clientId from container name (kyra-cl-{clientId})
  const clientId = containerName.replace('kyra-cl-', '');
  // Try new dir structure first, fall back to legacy single-file mount
  const hostConfigPathNew = path.join(DATA_DIR, clientId, 'openclaw', 'openclaw.json');
  const hostConfigPathOld = path.join(DATA_DIR, clientId, 'openclaw.json');
  const hostConfigPath = fs.existsSync(hostConfigPathNew) ? hostConfigPathNew : hostConfigPathOld;

  // Try host file first (fast, works even when container stopped)
  if (fs.existsSync(hostConfigPath)) {
    try {
      return JSON.parse(fs.readFileSync(hostConfigPath, 'utf8'));
    } catch (e) {}
  }

  // Fallback: read from container via docker exec
  const container = docker.getContainer(containerName);
  const exec = await container.exec({
    Cmd: ['cat', '/home/node/.openclaw/openclaw.json'],
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start();
  let stdout = '';
  await new Promise((resolve, reject) => {
    container.modem.demuxStream(stream,
      { write: (d) => { stdout += d.toString(); } },
      { write: () => {} }
    );
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  if (!stdout.trim()) return {};
  try { return JSON.parse(stdout.trim()); } catch (e) { return {}; }
}

// Helper: write openclaw.json to host file + container, then restart
async function writeOpenclawConfig(containerName, config) {
  const container = docker.getContainer(containerName);
  const configJson = JSON.stringify(config, null, 2);

  // Write to host filesystem (persists across recreation) — support both old and new structure
  const clientId = containerName.replace('kyra-cl-', '');
  const hostConfigPathNew = path.join(DATA_DIR, clientId, 'openclaw', 'openclaw.json');
  const hostConfigPathOld = path.join(DATA_DIR, clientId, 'openclaw.json');
  if (fs.existsSync(hostConfigPathNew)) fs.writeFileSync(hostConfigPathNew, configJson);
  if (fs.existsSync(hostConfigPathOld)) fs.writeFileSync(hostConfigPathOld, configJson);

  // Write via a shell heredoc with a unique delimiter
  const writeExec = await container.exec({
    Cmd: ['sh', '-c', 'cat > /home/node/.openclaw/openclaw.json'],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
  });
  const writeStream = await writeExec.start({ hijack: true, stdin: true });
  writeStream.write(configJson);
  writeStream.end();
  await new Promise((resolve) => { writeStream.on('end', resolve); });

  // Restart the container to apply config changes
  await container.restart({ t: 5 });
}

// GET /containers/:id/openclaw-config
app.get('/containers/:id/openclaw-config', async (req, res) => {
  try {
    const clientId = req.params.id;
    const containerName = 'kyra-cl-' + clientId;
    const config = await readOpenclawConfig(containerName);
    res.json({ config });
  } catch (err) {
    console.error('[CONFIG] Read failed for ' + req.params.id + ':', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /containers/:id/openclaw-config - Merge patch into config, reload
app.patch('/containers/:id/openclaw-config', async (req, res) => {
  try {
    const clientId = req.params.id;
    const containerName = 'kyra-cl-' + clientId;
    const { patch } = req.body;

    if (!patch || typeof patch !== 'object') {
      return res.status(400).json({ error: 'patch object required in body' });
    }

    const currentConfig = await readOpenclawConfig(containerName);
    const newConfig = deepMerge(currentConfig, patch);
    await writeOpenclawConfig(containerName, newConfig);

    console.log('[CONFIG] Patched openclaw.json for ' + clientId);
    res.json({ ok: true, config: newConfig });
  } catch (err) {
    console.error('[CONFIG] Patch failed for ' + req.params.id + ':', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /containers/:id/openclaw-config - Replace config entirely, reload
app.put('/containers/:id/openclaw-config', async (req, res) => {
  try {
    const clientId = req.params.id;
    const containerName = 'kyra-cl-' + clientId;
    const { config } = req.body;

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'config object required in body' });
    }

    await writeOpenclawConfig(containerName, config);

    console.log('[CONFIG] Replaced openclaw.json for ' + clientId);
    res.json({ ok: true, config });
  } catch (err) {
    console.error('[CONFIG] Replace failed for ' + req.params.id + ':', err.message);
    res.status(500).json({ error: err.message });
  }
});



// ============ RUN OPENCLAW CLI COMMAND ============
app.post('/containers/:id/exec-cmd', async (req, res) => {
  try {
    const clientId = req.params.id;
    const containerName = 'kyra-cl-' + clientId;
    const { cmd } = req.body;

    if (!cmd || !Array.isArray(cmd)) {
      return res.status(400).json({ error: 'cmd array required in body' });
    }

    const container = docker.getContainer(containerName);
    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start();
    let stdout = '', stderr = '';
    await new Promise((resolve, reject) => {
      container.modem.demuxStream(stream,
        { write: (d) => { stdout += d.toString(); } },
        { write: (d) => { stderr += d.toString(); } }
      );
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    const inspect = await exec.inspect();
    const exitCode = inspect.ExitCode;
    console.log('[EXEC-CMD] ' + containerName + ' $ ' + cmd.join(' ') + ' -> exit ' + exitCode);
    res.json({ ok: exitCode === 0, exitCode, stdout: stdout.trim(), stderr: stderr.trim() });
  } catch (err) {
    console.error('[EXEC-CMD] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============ BUILD/CHECK GATEWAY IMAGE ============
app.get('/image/status', async (req, res) => {
  try {
    const images = await docker.listImages();
    const gatewayImage = images.find(img => 
      img.RepoTags && img.RepoTags.includes(GATEWAY_IMAGE)
    );
    res.json({
      image: GATEWAY_IMAGE,
      exists: !!gatewayImage,
      size: gatewayImage ? Math.round(gatewayImage.Size / 1024 / 1024) + 'MB' : null,
      created: gatewayImage ? new Date(gatewayImage.Created * 1000).toISOString() : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ BULK MIGRATE EXISTING CONTAINERS TO KYRA-ROUTER ============
app.post('/router/migrate-all', auth, async (req, res) => {
  const dryRun = req.query.dry_run === 'true';
  const results = { migrated: [], skipped: [], failed: [], dry_run: dryRun };

  try {
    // Ensure router is running first
    await ensureKyraRouter();

    const allContainers = await docker.listContainers({ all: true });
    const kyraContainers = allContainers.filter(c =>
      c.Labels && c.Labels['kyra.managed'] === 'true' &&
      c.Labels['kyra.role'] !== 'router'  // skip the router itself
    );

    console.log(`[migrate-all] Found ${kyraContainers.length} Kyra containers`);

    for (const c of kyraContainers) {
      const name = c.Names[0].replace('/', '');
      try {
        const container = docker.getContainer(c.Id);
        const info = await container.inspect();

        // Check if already has OPENAI_BASE_URL pointing to kyra-router
        const currentEnv = info.Config.Env || [];
        const alreadyRouted = currentEnv.some(e =>
          e.startsWith('OPENAI_BASE_URL=') && e.includes('kyra-router')
        );

        if (alreadyRouted) {
          results.skipped.push({ name, reason: 'already_routed' });
          continue;
        }

        if (dryRun) {
          results.migrated.push({ name, dry_run: true });
          continue;
        }

        // Build new env — add/replace OPENAI_BASE_URL
        const newEnv = currentEnv
          .filter(e => !e.startsWith('OPENAI_BASE_URL='))
          .concat(`OPENAI_BASE_URL=${KYRA_ROUTER_URL}`);

        const wasRunning = info.State.Running;

        // Stop and remove (data is safe in bind mount)
        if (wasRunning) await container.stop({ t: 5 });
        await container.remove();

        // Recreate with same config + new env
        const newContainer = await docker.createContainer({
          Image: info.Config.Image,
          name: name,
          Hostname: info.Config.Hostname,
          Cmd: info.Config.Cmd,
          Env: newEnv,
          Labels: info.Config.Labels,
          HostConfig: {
            ...info.HostConfig,
            // Normalize restart policy
            RestartPolicy: info.HostConfig.RestartPolicy || { Name: 'unless-stopped' },
          },
        });

        if (wasRunning) await newContainer.start();
        results.migrated.push({ name, restarted: wasRunning });
        console.log(`[migrate-all] ✅ ${name} — kyra-router wired`);

      } catch (err) {
        console.error(`[migrate-all] ❌ ${name}:`, err.message);
        results.failed.push({ name, error: err.message });
      }

      // Small delay between containers to avoid overwhelming the VPS
      await new Promise(r => setTimeout(r, 500));
    }

    res.json({
      ...results,
      summary: {
        total: kyraContainers.length,
        migrated: results.migrated.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message, results });
  }
});

// ============ ROUTER MANAGEMENT ENDPOINT ============
app.get('/router/status', auth, async (req, res) => {
  try {
    const container = docker.getContainer(KYRA_ROUTER_NAME);
    const info = await container.inspect();
    res.json({
      running: info.State.Running,
      started: info.State.StartedAt,
      image: info.Config.Image,
      url: KYRA_ROUTER_URL,
    });
  } catch (_) {
    res.json({ running: false, url: KYRA_ROUTER_URL });
  }
});

app.post('/router/restart', auth, async (req, res) => {
  try {
    await ensureKyraRouter();
    res.json({ ok: true, message: 'kyra-router running' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============ START SERVER ============
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Kyra Provisioner API running on port ${PORT}`);
  console.log(`   Domain: ${DOMAIN_SUFFIX}`);
  console.log(`   Data: ${DATA_DIR}`);
  console.log(`   Dynamic routes: ${DYNAMIC_DIR}`);

  // Ensure directories exist
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(DYNAMIC_DIR, { recursive: true });

  // Start shared kyra-router on boot (non-blocking)
  ensureKyraRouter().catch(err =>
    console.warn('[kyra-router] startup warning:', err.message)
  );
});
