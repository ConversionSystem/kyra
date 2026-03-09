"""
Kyra Router — OpenAI-compatible API server.

Drop-in replacement for the OpenAI API endpoint.
Point any OpenAI client at http://localhost:8104/v1 to get automatic
model routing with 60-90% cost savings.

Start with:
    uvicorn klaw.api:app --port 8104 --host 0.0.0.0

Environment variables:
    OPENAI_API_KEY       — for GPT-4o-mini / GPT-4o
    ANTHROPIC_API_KEY    — for Claude Haiku / Sonnet
    OPENROUTER_API_KEY   — for free fallback models
    KYRA_MAX_TIER        — max routing tier (0-4, default 2 = gpt-4o-mini/haiku)
    KYRA_DAILY_CAP       — daily spend cap per instance (default $2.00)
"""

import json
import os
import time
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from klaw.router import KlawRouter, PRICING, TIER_NAMES

# ─── Config from env ───────────────────────────────────────────────────────
MAX_TIER = int(os.environ.get("KYRA_MAX_TIER", "2"))      # default: cheap tier only
DAILY_CAP = float(os.environ.get("KYRA_DAILY_CAP", "2.00"))
MONTHLY_BUDGET = float(os.environ.get("KYRA_MONTHLY_BUDGET", "30.00"))

# ─── Router singleton ───────────────────────────────────────────────────────
router = KlawRouter(
    daily_cap=DAILY_CAP,
    monthly_budget=MONTHLY_BUDGET,
    max_tier=MAX_TIER,
    skip_license=True,      # MIT license — no KLAW subscription needed
)

# ─── FastAPI app ────────────────────────────────────────────────────────────
app = FastAPI(
    title="Kyra Router",
    description="OpenAI-compatible AI routing proxy — saves 60-90% on LLM costs",
    version="0.1.0",
)


# ─── Request/Response models ─────────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str = "gpt-4o-mini"
    messages: list[Message]
    max_tokens: Optional[int] = 1024
    temperature: Optional[float] = 0.7
    stream: Optional[bool] = False
    system: Optional[str] = None  # Anthropic-style system prompt passthrough


# ─── Helpers ─────────────────────────────────────────────────────────────────
def extract_query_and_system(messages: list[Message]) -> tuple[str, str]:
    """Extract the latest user message and system prompt from a message list."""
    system = ""
    query = ""
    for msg in messages:
        if msg.role == "system":
            system = msg.content
        elif msg.role == "user":
            query = msg.content  # use the last user message
    return query, system


def build_openai_response(
    content: str,
    model_used: str,
    routing_meta: dict,
    request_id: str,
) -> dict:
    """Build an OpenAI-format chat completion response."""
    input_tokens = routing_meta.get("classification", {}) and len(content) // 4
    return {
        "id": f"chatcmpl-{request_id}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model_used,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content,
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": routing_meta.get("classification", {}).get("word_count", len(content) // 4),
            "completion_tokens": len(content) // 4,
            "total_tokens": len(content) // 2,
        },
        # Kyra routing metadata (extra fields — ignored by standard clients)
        "kyra_router": {
            "tier": routing_meta.get("tier"),
            "tier_name": routing_meta.get("tier_name"),
            "model_actual": routing_meta.get("model"),
            "cost_usd": routing_meta.get("cost"),
            "savings_usd": routing_meta.get("savings"),
            "latency_ms": routing_meta.get("latency_ms"),
            "k_address": routing_meta.get("classification", {}).get("k_address"),
        },
    }


async def stream_response(content: str, model_used: str, request_id: str):
    """Stream content in SSE OpenAI format."""
    chunk_size = 24
    for i in range(0, len(content), chunk_size):
        chunk = content[i:i + chunk_size]
        data = {
            "id": f"chatcmpl-{request_id}",
            "object": "chat.completion.chunk",
            "created": int(time.time()),
            "model": model_used,
            "choices": [
                {
                    "index": 0,
                    "delta": {"content": chunk},
                    "finish_reason": None,
                }
            ],
        }
        yield f"data: {json.dumps(data)}\n\n"

    # Final chunk
    final = {
        "id": f"chatcmpl-{request_id}",
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model_used,
        "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
    }
    yield f"data: {json.dumps(final)}\n\n"
    yield "data: [DONE]\n\n"


# ─── Routes ──────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    stats = router.stats()
    return {
        "status": "ok",
        "version": "0.1.0",
        "daily_cost": stats["daily_cost"],
        "daily_queries": stats["daily_queries"],
        "total_savings": stats["total_savings"],
        "tier_distribution": stats.get("tier_percentages", {}),
    }


@app.get("/v1/models")
async def list_models():
    """OpenAI-compatible models endpoint."""
    return {
        "object": "list",
        "data": [
            {"id": "kyra-router", "object": "model", "created": 1700000000,
             "owned_by": "kyra"},
            {"id": "gpt-4o-mini", "object": "model", "created": 1700000000,
             "owned_by": "kyra-router"},
            {"id": "gpt-4o", "object": "model", "created": 1700000000,
             "owned_by": "kyra-router"},
        ],
    }


@app.post("/v1/chat/completions")
async def chat_completions(req: ChatRequest):
    """
    OpenAI-compatible chat completions endpoint.
    Routes to the cheapest model capable of answering the query.
    """
    request_id = uuid.uuid4().hex[:12]
    query, system_prompt = extract_query_and_system(req.messages)

    if not query.strip():
        raise HTTPException(status_code=400, detail="No user message found in messages")

    # Route through Kyra router
    result = router.route(
        query=query,
        system_prompt=system_prompt,
        max_tokens=req.max_tokens or 1024,
    )

    content = result.get("response", "")
    model_used = result.get("model", "kyra-router")

    # Handle streaming
    if req.stream:
        return StreamingResponse(
            stream_response(content, model_used, request_id),
            media_type="text/event-stream",
        )

    return JSONResponse(build_openai_response(content, model_used, result, request_id))


@app.get("/stats")
async def stats():
    """Kyra router cost and savings stats."""
    return router.stats()


@app.post("/classify")
async def classify(req: Request):
    """Classify a query without routing it."""
    body = await req.json()
    query = body.get("query", "")
    classification = router.classify(query)
    return {
        "query": query,
        "classification": classification,
        "tier_name": TIER_NAMES.get(classification.get("tier", 2), "?"),
    }
