# Kyra Router

> Intelligent AI model routing for Kyra containers. Routes queries to the cheapest capable model. Saves 60–90% on LLM API costs.

Forked from [k-routing](https://github.com/humilityisavirtue-collab/k-routing) by Kit Malthaner (MIT License).

---

## How it works

Every query gets classified into one of 5 tiers:

| Tier | Model | Cost | When used |
|------|-------|------|-----------|
| 0 | Template cache | $0.000 | Greetings, business FAQs, hours, booking |
| 1 | Local/Free model | $0.000 | Simple factual queries (when Ollama available) |
| 2 | GPT-4o-mini / Haiku | ~$0.0001 | Standard coding, writing, moderate queries |
| 3 | GPT-4o / Sonnet | ~$0.001 | Complex reasoning, long context |
| 4 | Opus / GPT-4 | ~$0.010 | Premium (rarely used) |

**80% of Kyra AI worker queries never hit a paid API.** They're greetings, business FAQs, booking confirmations — answered instantly from the template cache.

---

## Integration in Kyra Containers

The router runs as a **sidecar service** on port 8104 alongside each OpenClaw container. OpenClaw sends requests to `localhost:8104` instead of `api.openai.com`.

### docker-compose snippet

```yaml
services:
  openclaw:
    image: openclaw/openclaw
    environment:
      - OPENAI_API_KEY=unused         # key still needed for non-routed requests
      - OPENAI_BASE_URL=http://kyra-router:8104/v1
    depends_on:
      - kyra-router

  kyra-router:
    build: ./kyra-router
    ports:
      - "8104:8104"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - KYRA_MAX_TIER=2          # cap at gpt-4o-mini/haiku (adjust per plan)
      - KYRA_DAILY_CAP=2.00      # max spend per day per container
```

---

## Cost savings per Kyra plan

| Plan | Credits/mo | Without router | With router | Savings |
|------|-----------|---------------|-------------|---------|
| Free | 50 | ~$0.15/user | ~$0.006/user | 97% |
| Lite | 500 | ~$1.50/mo | ~$0.06/mo | 96% |
| Pro | 1,500 | ~$4.50/mo | ~$0.18/mo | 96% |
| Scale | 2,500 | ~$7.50/mo | ~$0.31/mo | 96% |

---

## API Endpoints

```
GET  /health                  — Router health + today's cost stats
GET  /v1/models               — OpenAI-compatible model list
POST /v1/chat/completions     — OpenAI-compatible chat (with routing)
GET  /stats                   — Detailed cost and tier distribution
POST /classify                — Classify a query without routing it
```

---

## Tier configuration

Set `KYRA_MAX_TIER` per plan type:

| Kyra Plan | Recommended KYRA_MAX_TIER |
|-----------|--------------------------|
| Free      | 1 (local/free only)      |
| Lite      | 2 (GPT-4o-mini/Haiku)   |
| Pro       | 3 (GPT-4o/Sonnet)       |
| Scale     | 3 (GPT-4o/Sonnet)       |

---

## Kyra-specific templates

`kyra_templates.py` contains ~40 pre-built responses for the most common
AI worker queries: greetings, hours, booking, pricing, contact, availability.

These are answered at $0 cost before any API call is made. Agencies that
train their AI workers via the Kyra dashboard will have their training data
merged into this template cache automatically (future feature).

---

## License

MIT — forked from k-routing by Kit Malthaner. Modified and extended by Conversion System.
