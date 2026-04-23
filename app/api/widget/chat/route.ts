// ============================================================================
// POST /api/widget/chat
//
// Public AI chat endpoint for embeddable web chat widgets.
// No authentication required — clients embed this on their websites.
// Rate-limited per IP. Logs to client_conversations table.
//
// ✨ NEW (Mar 1): Knowledge RAG + Smart Lead Capture
// - Injects relevant knowledge base docs into AI system prompt
// - Extracts visitor contact info after engagement
// - Auto-creates CRM contacts + web_chat_leads
// - Fires webhook notifications for new leads
//
// Body: { clientId, message, sessionId?, history?, sourceUrl? }
// Returns: { response, sessionId, leadCaptured? }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { getKnowledgeContext } from '@/lib/knowledge/rag';
import { defend, scanOutput } from '@/lib/security/prompt-injection';
import {
  extractLeadFromConversation,
  saveWebChatLead,
  notifyLeadWebhook,
  getLeadCapturePrompt,
} from '@/lib/chat/lead-capture';
import { requireCredits } from '@/lib/billing/credit-engine';
import { getCreditsForModel } from '@/lib/billing/model-credits';
import { classifyMessage } from '@/lib/ghl/model-router';
import {
  getDirectLLMClient,
  resolveModel,
  checkAndDeductCredits,
  saveConversation,
} from '@/lib/chat/core';
import { isRateLimited } from '@/lib/rate-limit';
import { classifyUsage } from '@/lib/billing/classify-usage';

const WIDGET_MODEL = 'openai/gpt-4o-mini'; // Fast, cheap, good enough for customer service

// CORS headers required on EVERY response — the widget is embedded on external sites
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function POST(request: NextRequest) {
  // Rate limit by IP (Supabase-backed, persists across cold starts)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (await isRateLimited(`widget:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: CORS });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });
  }

  const clientId = body.clientId as string | undefined;
  const message = body.message as string | undefined;
  const sessionId = body.sessionId as string | undefined;
  const history = body.history as Array<{ role: 'user' | 'assistant'; content: string }> | undefined;
  const sourceUrl = body.sourceUrl as string | undefined;
  const storeId = body.storeId as string | undefined; // Jane store ID from embed param

  if (!clientId || !message?.trim()) {
    return NextResponse.json({ error: 'clientId and message are required' }, { status: 400, headers: CORS });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400, headers: CORS });
  }

  // ── Prompt injection defense ───────────────────────────────────────────────
  const widgetContactId = `widget:${sessionId || clientId}`;
  const rawMessage = message.trim();
  const defense = defend(rawMessage, widgetContactId);
  if (!defense.proceed) {
    return NextResponse.json(
      { response: defense.deflectReply || "I'm sorry, I can't help with that request.", sessionId: sessionId || 'new' },
      { status: 200, headers: CORS }
    );
  }
  const safeMessage = defense.safeInput;

  const supabase = getSupabase();

  // Look up the client and their gateway
  const { data: client, error: dbErr } = await supabase
    .from('agency_clients')
    .select('id, name, status, agency_id, gateway_url, gateway_token, gateway_status, container_config, ai_model')
    .eq('id', clientId)
    .single();

  if (dbErr || !client) {
    // Return a graceful fallback response instead of a hard error
    // (Visitor still gets a reply even if the client config is missing)
    return NextResponse.json({
      response: "Hi! Thanks for reaching out. Our team will get back to you shortly. You can also call us directly for immediate assistance.",
      sessionId: null,
    }, { headers: CORS });
  }

  if (client.status !== 'active' && client.status !== 'setup') {
    return NextResponse.json({
      response: "Hi! Thanks for your message. We'll be in touch soon. Feel free to call us if you need immediate help!",
      sessionId: null,
    }, { headers: CORS });
  }

  // Use client's configured model if set, fall back to WIDGET_MODEL
  const rawModel = (client.container_config as any)?.ai_model || (client as any).ai_model;
  // Validate: empty/undefined → fall back to WIDGET_MODEL
  const resolvedModel = rawModel && typeof rawModel === 'string' && rawModel.trim() ? rawModel.trim() : WIDGET_MODEL;
  const useOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const resolved = resolveModel(resolvedModel, useOpenRouter);
  // If resolveModel returns a bare unknown string, fall back to WIDGET_MODEL
  const clientModel = (useOpenRouter && !resolved.includes('/')) ? WIDGET_MODEL : resolved;

  // ── Smart routing (initial — may be overridden after cfg is loaded) ──────
  const complexity = classifyMessage(message.trim());
  const escalationPattern = /delivery.*late|charged|wrong item|missing|refund|complain|cancel|dispute|lawsuit/i.test(message);
  let routedModel = (complexity === 'complex' || escalationPattern) ? clientModel : 'openai/gpt-4o-mini';

  // ── Model-aware credit check ──────────────────────────────────────────────
  const preflightAction = classifyUsage(message.trim());
  const widgetPreflightCost = getCreditsForModel(routedModel);
  const creditCheck = await requireCredits(client.agency_id, preflightAction, 1, widgetPreflightCost);
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { response: 'Thanks for reaching out! Please give us a call for immediate assistance.', error: 'credits_depleted' },
      { headers: CORS },
    );
  }

  // Build session ID (persist conversation across messages)
  const resolvedSessionId = sessionId || `web:${clientId.slice(0, 8)}:${Date.now()}`;

  // ── Session memory for returning visitors ────────────────────────────────
  // Fetch prior DB history when client sends a known sessionId but no in-memory
  // history (e.g., returning visitor on a fresh page load).
  let sessionHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (sessionId && (!Array.isArray(history) || history.length === 0)) {
    try {
      const { data: sessionRows } = await supabase
        .from('client_conversations')
        .select('user_message, ai_response, created_at')
        .eq('client_id', client.id)
        .eq('session_id', resolvedSessionId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (sessionRows?.length) {
        for (const row of [...sessionRows].reverse()) {
          if (row.user_message?.trim()) sessionHistory.push({ role: 'user' as const, content: row.user_message });
          if (row.ai_response?.trim()) sessionHistory.push({ role: 'assistant' as const, content: row.ai_response });
        }
      }
    } catch (err) {
      console.error('[widget/chat] Session memory error:', err);
    }
  }

  const cfg = (client.container_config as Record<string, unknown>) ?? {};

  // ── Build Jane config from this client's container_config ──
  // Returns null if required Algolia credentials are missing — in that case we skip
  // product search entirely rather than falling through to hardcoded defaults.
  const { buildJaneConfigFromContainerConfig, fetchBrandFacet } = await import('@/lib/integrations/jane');
  const janeConfig = buildJaneConfigFromContainerConfig(cfg);
  const janeActive = !!janeConfig;
  // Augment the hardcoded known_brands list with the live brand facet from
  // Algolia (cached 1h). Purple Lotus carries 144 brands but only 41 were
  // backfilled — without this merge, queries like "Show me Jeeter" fell
  // through to the text-query path and missed products.
  let knownBrands = janeConfig?.knownBrands || [];
  if (janeActive && janeConfig) {
    try {
      const live = await fetchBrandFacet(janeConfig, storeId || (cfg.jane_default_store_id as string));
      if (live.length) {
        const merged = new Set<string>([...knownBrands, ...live]);
        knownBrands = [...merged];
      }
    } catch { /* cached path still works even on miss */ }
  }

  // ── Override smart routing for product queries (needs configured model, not mini) ──
  if (janeActive && routedModel !== clientModel) {
    try {
      const { isProductQuery } = await import('@/lib/integrations/jane');
      if (isProductQuery(message.trim(), knownBrands)) {
        routedModel = clientModel;
      }
    } catch { /* ignore */ }
  }

  const persona = (cfg.persona as string) || `AI assistant for ${client.name}`;
  const businessName = (cfg.business_name as string) || client.name;
  const customInstructions = (cfg.instructions as string) || '';

  // ── Fetch site config for tone + capabilities ─────────────────────────────
  const { data: siteData } = await supabase
    .from('client_sites')
    .select('ai_tone, ai_capabilities, ai_name, hours, booking_url, phone, business_name')
    .eq('client_id', clientId)
    .single();

  const aiTone = (siteData?.ai_tone as string) || 'professional';
  const aiCapabilities = (siteData?.ai_capabilities as string[]) || [];
  const aiName = (siteData?.ai_name as string) || (cfg.persona as string)?.split(' ')[0] || 'Alex';

  // ── Language instruction ──────────────────────────────────────────────────
  const responseLanguage = (cfg.response_language as string) || 'auto';
  // 'auto' or unset → detect from customer message. Specific language → lock to it.
  const languageInstruction = (!responseLanguage || responseLanguage === 'auto')
    ? "Detect the customer's language from their message and always respond in that same language."
    : `Always respond in ${responseLanguage.replace(/ \(.*\)/, '')}. Do not switch languages even if the customer writes in a different language.`;

  const toneInstruction: Record<string, string> = {
    professional: 'Maintain a professional, knowledgeable tone. Be helpful and precise.',
    friendly: 'Be warm, friendly and approachable. Use conversational language like talking to a friend.',
    casual: 'Be casual, relaxed and conversational. Keep it light and easy-going.',
  };

  const capabilityMap: Record<string, string> = {
    answer_questions: 'Answer customer questions accurately using your knowledge base.',
    book_appointments: `Help customers book appointments. ${siteData?.booking_url ? 'Share this booking link: ' + siteData.booking_url : 'Ask them to call to schedule.'}`,
    capture_leads: 'Collect customer name, email and phone number when they show interest.',
    provide_quotes: 'Provide rough price estimates when asked, based on typical industry rates.',
    qualify_leads: 'Ask qualifying questions to understand their needs before connecting them to the team.',
  };

  const capabilityInstructions = aiCapabilities
    .map((cap: string) => capabilityMap[cap])
    .filter(Boolean);

  // ── Knowledge RAG ──────────────────────────────────────────────────────────
  // Fetch relevant knowledge base documents and inject into system prompt.
  // This makes the AI actually USE the trained knowledge from auto-train.
  let knowledgeSection = '';
  try {
    const knowledge = await getKnowledgeContext(client.agency_id, client.id, message.trim());
    if (knowledge.text) {
      knowledgeSection = `\n\n${knowledge.text}\n`;
    }
  } catch (err) {
    console.error('[widget/chat] Knowledge RAG error:', err);
    // Degrade gracefully — proceed without knowledge
  }

  // ── FIX 4: Inject CRM relationship memory for returning visitors ──────────
  // If this visitor has been in the CRM before (matched by email/phone from prior sessions),
  // inject their history so the AI knows who they are.
  let crmContextSection = '';
  try {
    // Look up the visitor by sessionId to find previously captured lead info
    const { data: priorLead } = await supabase
      .from('web_chat_leads')
      .select('email, phone, crm_contact_id')
      .eq('client_id', clientId)
      .eq('session_id', resolvedSessionId)
      .maybeSingle();

    if (priorLead?.crm_contact_id) {
      const { getMemories, buildMemoryContext } = await import('@/lib/crm/relationship-memory');
      const { data: crmContact } = await supabase
        .from('crm_contacts')
        .select('first_name, last_name, stage, score_label, ai_summary, ai_next_action')
        .eq('id', priorLead.crm_contact_id)
        .single();

      if (crmContact) {
        const memories = await getMemories(client.agency_id, priorLead.crm_contact_id);
        const memCtx = buildMemoryContext(memories);
        const visitorName = [crmContact.first_name, crmContact.last_name].filter(Boolean).join(' ');
        crmContextSection = [
          `RETURNING VISITOR CONTEXT:`,
          visitorName ? `- Name: ${visitorName}` : '',
          crmContact.stage ? `- Stage: ${crmContact.stage}` : '',
          crmContact.score_label ? `- Lead score: ${crmContact.score_label}` : '',
          crmContact.ai_summary ? `- Summary: ${crmContact.ai_summary}` : '',
          crmContact.ai_next_action ? `- Pending follow-up: ${crmContact.ai_next_action}` : '',
          memCtx ? `Relationship notes:\n${memCtx}` : '',
        ].filter(Boolean).join('\n');
      }
    }
  } catch (err) {
    console.error('[widget/chat] CRM context error:', err);
  }

  // ── Lead Capture Prompt ────────────────────────────────────────────────────
  const exchangeCount = Array.isArray(history) ? Math.floor(history.length / 2) : 0;
  const leadCapturePrompt = getLeadCapturePrompt(exchangeCount);

  // ── Build System Prompt ────────────────────────────────────────────────────
  const systemPrompt = [
    // Use the full persona if configured, otherwise generic intro
    persona && persona.length > 50
      ? `${persona}\nYou are responding via a web chat widget on the ${businessName} website.`
      : `You are ${aiName}, a helpful AI assistant for ${businessName}, responding via a web chat widget on their website.`,
    toneInstruction[aiTone] || toneInstruction.professional,
    languageInstruction,
    `IDENTITY: Your name is ${aiName}. When someone asks "who are you?" or "what is your name?", always introduce yourself by name: "I'm ${aiName}" and explain your role at ${businessName}. Never be evasive about your identity.`,
    `RESPONSE QUALITY RULES:`,
    `- Give specific, useful answers. If you know the answer, give it directly. If you don't have the information, say so honestly and offer to connect them with the team.`,
    `- Keep replies to 2-4 sentences unless more detail is needed.`,
    `- Be conversational and natural, not robotic.`,
    `BANNED CLOSING PHRASES — NEVER end your response with any of these or anything similar:`,
    `"If you have any other questions..." / "feel free to ask" / "don't hesitate to reach out" / "How can I help you today?" / "Is there anything else I can help with?" / "Let me know if you need anything else" / "just let me know" / "Happy to help!" / "Hope that helps!"`,
    `END your response naturally after giving the answer. Stop talking. Do NOT add a closing invitation phrase.`,
    // Formatting rules: allow markdown for product recommendations (links + bold), plain text otherwise
    janeActive
      ? `FORMATTING RULES — you are in a chat widget that renders markdown:
- Use **bold** for product names and key info only.
- Use [Link Text](url) for product links — NEVER paste raw URLs.
- Keep responses concise: one short intro line, then product cards (max 3 lines each).
- No # headers, no bullet dashes (- or *), no numbered lists (1. 2. 3.) outside product cards.
- Line breaks are OK between products. No walls of text.
- For non-product questions, respond in plain conversational sentences.`
      : `CRITICAL FORMATTING RULES — you are in a plain-text chat widget, NOT a document editor:
- NEVER use markdown: no **bold**, no *italic*, no # headers, no bullet dashes (- or *), no numbered lists (1. 2. 3.)
- NEVER use markdown links like [text](url) — write URLs as plain text or say "visit our website at URL"
- Use plain conversational sentences only. If listing items, write them naturally: "We offer X, Y, and Z."
- Line breaks are OK, but keep them minimal. No walls of text.`,
    ...capabilityInstructions,
    `Do not mention you are an AI unless directly asked. But always share your name when asked who you are.`,
    cfg.calendar_url ? `When scheduling is mentioned, share this booking link: ${cfg.calendar_url}` : '',
    siteData?.booking_url ? `Booking link: ${siteData.booking_url}` : '',
    cfg.business_hours ? `Business hours: ${cfg.business_hours}` : '',
    siteData?.hours ? `Hours: ${siteData.hours}` : '',
    cfg.business_phone ? `Business phone: ${cfg.business_phone}` : '',
    siteData?.phone ? `Phone: ${siteData.phone}` : '',
    cfg.business_address ? `Business address: ${cfg.business_address}` : '',
    cfg.services ? `Services offered: ${cfg.services}` : '',
    cfg.website_url ? `Website: ${cfg.website_url}` : '',
    `If you can't resolve something, say: "Let me connect you with our team — they'll follow up shortly."`,
    // Auto-inject cannabis product recommendation prompt when Jane is active
    janeActive ? `PRODUCT RECOMMENDATION ENGINE:
You are a cannabis budtender responding in a chat widget. The widget renders TWO kinds of UI chrome automatically BELOW your text reply — you do NOT need to generate markdown for them:

1. PRODUCT CARDS — when inventory was fetched, the widget shows structured cards with image, name, brand, strain, THC, price, and a "View →" button. The cards handle the clicking. Do NOT list products with markdown links like [View Product →](url). Just narrate conversationally.

2. SUPPORT-LINK CHIPS — when the customer asks about ordering, delivery, hours, payment, deals, etc., the widget shows pill chips below your reply (e.g. "How to Order", "Delivery Info"). Do NOT paste URLs in your text — the chips handle it.

YOUR JOB: be the budtender's voice. Be warm, specific, and concise.

HOW TO RESPOND

Product questions (cards will render):
- Start with a 1-sentence intro that matches the customer's ask ("Indica is exactly what you want for sleep — here are tonight's top picks")
- Pick 2-3 products from the results to call out BY NAME (e.g. "Granddaddy Purple is a classic — heavy indica, great for bedtime")
- Do NOT list every product. Do NOT paste URLs. The cards below do the listing.
- End by inviting them to tap a card for full details or ask for more specifics

Brand questions ("What Alien Labs strains do you have?"):
- The widget shows the full brand catalog as cards + a "Browse All" button.
- Narrate the count: "We carry 4 Alien Labs products right now — 3 pre-rolls and 1 flower."
- Highlight 1-2 by name. Invite them to tap a card.

Effect recommendations:
- Indica → sleep / relax / pain relief | Sativa → energy / focus / creativity | Hybrid → balanced
- NEVER make medical claims. Say "many customers find..." not "this will help..."

Informational questions (ordering, delivery, hours, payment, deals):
- Give the answer in 1-2 sentences based on your business knowledge.
- The relevant SUPPORT-LINK CHIP is already rendered below — you don't need to paste a URL. Just say "tap the Ordering chip below for the full walkthrough" or "hit the Delivery Info chip for our zones".

NO RESULTS:
If cards didn't render (empty search), acknowledge the miss honestly in one sentence and offer an alternative ("we're out of that brand's pre-rolls right now — want me to pull up their flower, or a different brand's pre-rolls?").

NEVER fabricate product names, prices, or URLs. Only name a product if it appears in the context below.` : '',
    // Support / info page links — configured per client for delivery, payment, deals, ordering, etc.
    (() => {
      const links = cfg.support_links as Record<string, string> | undefined;
      const websiteUrl = (cfg.website_url as string) || '';
      if (!links && !websiteUrl) return '';
      const entries: string[] = [];
      if (links) {
        for (const [label, url] of Object.entries(links)) {
          if (url) entries.push(`- ${label}: ${url}`);
        }
      }
      // Auto-generate common links from website_url if support_links not fully configured
      if (websiteUrl && (!links || Object.keys(links).length < 3)) {
        if (!links?.menu && !links?.['shop']) entries.push(`- Full Menu: ${websiteUrl}/shop/all`);
        if (!links?.delivery) entries.push(`- Delivery Info: ${websiteUrl}/delivery`);
        if (!links?.deals && !links?.['specials']) entries.push(`- Today's Deals: ${websiteUrl}/deals`);
        if (!links?.ordering && !links?.['how to order']) entries.push(`- How to Order: ${websiteUrl}/order`);
      }
      if (entries.length === 0) return '';
      return `SUPPORT LINKS — when answering informational questions, include the relevant link:\n${entries.join('\n')}`;
    })(),
    customInstructions ? `BUSINESS KNOWLEDGE AND RULES (use this information to answer customer questions accurately):\n${customInstructions}` : '',
    knowledgeSection,
    crmContextSection ? `\n${crmContextSection}` : '',
    sessionHistory.length > 0 ? `\nSESSION MEMORY: This visitor has chatted before. Their prior messages are included at the start of the conversation for context.` : '',
    leadCapturePrompt,
  ].filter(Boolean).join('\n');

  // ── Store Selection Detection (for multi-store dispensaries) ────────────────
  // When user picks a store from the widget buttons, detect it and acknowledge
  const resolvedStoreId = storeId || (cfg.jane_default_store_id as string) || '';
  let storeContext = '';
  if (janeActive && resolvedStoreId) {
    // Load store info from config or defaults
    const janeStores = (cfg.jane_stores as Array<{ id: string; name: string; address?: string; menuUrl?: string }>) || [];
    const activeStore = janeStores.find(s => s.id === resolvedStoreId);
    if (activeStore) {
      storeContext = `\nCUSTOMER'S SELECTED STORE: ${activeStore.name}${activeStore.address ? ` (${activeStore.address})` : ''}. All product recommendations are for this location's inventory.`;
    }
  }

  // ── Session preference extraction ───────────────────────────────────────────
  // Reads prior turns (DB memory + in-memory history) to extract lineage/brand
  // affinity signals. Feeds into Algolia re-ranking AND the LLM system prompt so
  // follow-up queries ("what else?") actually use the session context.
  const extractSessionPreferences = (
    prior: Array<{ role: string; content: string }>,
    brands: string[],
  ): { lineages: string[]; brands: string[] } => {
    const text = prior
      .filter((m) => m.role === 'assistant' || m.role === 'user')
      .map((m) => m.content.toLowerCase())
      .join('\n');
    const lineages: string[] = [];
    for (const l of ['indica', 'sativa', 'hybrid', 'cbd']) {
      if (text.includes(l)) lineages.push(l);
    }
    const seenBrands: string[] = [];
    for (const b of brands) {
      if (text.includes(b.toLowerCase())) seenBrands.push(b);
    }
    return { lineages, brands: seenBrands.slice(0, 5) };
  };

  // ── Product Search (Jane API integration for cannabis dispensaries) ────────
  // Holds the structured card list that the widget renders as real product cards
  // (image, price, THC, strain, CTA button) — separate from the LLM's conversational text.
  type ProductCard = {
    id: string;
    name: string;
    brand?: string;
    category?: string;
    strainType?: string;
    thc?: string;
    cbd?: string;
    price?: string;
    weight?: string;
    imageUrl?: string;
    url: string;
    cartUrl?: string;
    rating?: number;
    reviewCount?: number;
  };
  let productContext = '';
  let productCards: ProductCard[] = [];
  let fallbackNotice: string | null = null;
  let browseMore: { url: string; label: string; totalCount: number } | null = null;
  // Support links resolved from the user's message — chips rendered in the widget
  // UI regardless of whether a product search happened. This guarantees "how to
  // order" always gets a link, rather than depending on the LLM generating one.
  let supportLinksOut: Array<{ label: string; url: string; topic: string }> = [];
  if (janeActive && janeConfig) {
    try {
      const { isProductQuery, parseProductIntent, searchProducts, formatProductsForAI, describeFallback, getBrandCatalog, resolveSupportLinks } =
        await import('@/lib/integrations/jane');

      // Resolve support links from the message — always runs, independent of product search.
      // cfg is the container_config; website_url comes from the same place.
      supportLinksOut = resolveSupportLinks(safeMessage, {
        support_links: cfg.support_links as Record<string, string> | undefined,
        website_url: cfg.website_url as string | undefined,
      });

      if (isProductQuery(safeMessage, knownBrands)) {
        const intent = parseProductIntent(safeMessage, knownBrands);
        intent.storeId = resolvedStoreId || janeConfig.defaultStore;
        // For brand queries, get more results to show full brand inventory
        if (intent.brand && !intent.limit) intent.limit = 30;

        // ── Open-ended brand catalog path ───────────────────────────────────
        // "What Alien Labs strains do you have?" / "Show me Jeeter" / "CBX products"
        // When a brand is detected AND no category is specified, fetch the full
        // brand catalog and render ALL products grouped by category. This is the
        // "list the strains" behaviour — no semantic search, just catalog reads.
        if (intent.brand && !intent.category) {
          const catalog = await getBrandCatalog(janeConfig, intent.brand, {
            storeId: intent.storeId,
            limit: 50,
          });
          if (catalog.products.length > 0) {
            productCards = catalog.products.slice(0, 6).map((p) => ({
              id: p.id, name: p.name, brand: p.brand, category: p.category,
              strainType: p.strainType, thc: p.thc, cbd: p.cbd, price: p.price,
              weight: p.weight, imageUrl: p.imageUrl, url: p.url, cartUrl: p.cartUrl,
              rating: p.rating, reviewCount: p.reviewCount,
            }));
            const activeStore = janeConfig.stores[intent.storeId || janeConfig.defaultStore];
            const storeBaseUrl = activeStore?.baseUrl || (cfg.website_url as string) || '';
            const fullBrand = catalog.resolvedBrand || intent.brand;
            const brandSlug = fullBrand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const brandUrl = storeBaseUrl ? `${storeBaseUrl}/brands/${brandSlug}` : '';
            if (brandUrl) {
              browseMore = { url: brandUrl, label: `${intent.brand} Products`, totalCount: catalog.products.length };
            }

            // Build LLM context — groups (by lineage) + counts so the model can
            // narrate accurately: "We have 3 Alien Labs hybrids and 1 indica."
            const groupLines = Object.entries(catalog.groups)
              .map(([cat, items]) => `  ${cat.toUpperCase()} (${items.length}): ${items.map((p) => p.name).join(', ')}`)
              .join('\n');
            productContext = `\n\nBRAND CATALOG — live ${catalog.storeId} inventory for ${intent.brand} (${catalog.products.length} products, grouped by lineage):\n${groupLines}\n\nTHE WIDGET IS ALREADY RENDERING PRODUCT CARDS + A "BROWSE ALL" BUTTON below your reply. Do NOT include markdown links or bullet lists of products. Instead, narrate conversationally in 2-3 sentences: call out the count by lineage ("we have 3 hybrids and 1 indica"), highlight 1-2 standouts by name + what they're good for, and invite the customer to tap a card for full details. The cards handle the clicking.`;
            // Short-circuit — skip the generic search path
            throw new Error('__handled_brand_catalog');
          }
        }

        // Session-preference boosts: prior mentions of indica/Alien Labs/etc nudge ranking
        const prefs = extractSessionPreferences(
          [...sessionHistory, ...(Array.isArray(history) ? history : [])],
          knownBrands,
        );
        if (prefs.lineages.length) intent.preferLineages = prefs.lineages;
        if (prefs.brands.length) intent.preferBrands = prefs.brands;

        const firecrawlKey = process.env.FIRECRAWL_API_KEY;
        // searchProducts already enforces its own deadlines (Algolia 5s per retry
        // tier, Firecrawl 15s). The previous Promise.race(12s) wrapper on top was
        // silently cutting off legitimate searches in production — Vercel's
        // serverless environment hits slightly slower network latency to Algolia
        // than local dev, and the combined first-tier + fallback could land just
        // past 12s even when the underlying Algolia request succeeded. Result:
        // `results` resolved to `null`, cards stayed empty, and the LLM was left
        // to improvise. Drop the outer race and let searchProducts drive itself;
        // route-level maxDuration=45s is the real upper bound.
        const t0 = Date.now();
        let results: Awaited<ReturnType<typeof searchProducts>> | null = null;
        try {
          results = await searchProducts(janeConfig, intent, firecrawlKey || undefined);
        } catch (err) {
          console.error(
            `[widget/chat] searchProducts threw for ${clientId} (${Date.now() - t0}ms):`,
            err instanceof Error ? err.message : String(err),
          );
        }
        // Structured diagnostic — surfaces in Vercel runtime logs so future
        // "0 cards" regressions can be traced to the exact query shape.
        console.log(
          `[widget/chat] search ${clientId} ${Date.now() - t0}ms ` +
          `intent=${JSON.stringify({ brand: intent.brand, category: intent.category, effects: intent.effects, maxPrice: intent.maxPrice })} ` +
          `products=${results?.products.length ?? 'null'} tier=${results?.fallbackTier ?? 'n/a'} source=${results?.source ?? 'n/a'}`,
        );
        if (results && results.products.length > 0) {
          // Use grouped format for brand queries
          const isBrand = !!intent.brand;
          const formatted = formatProductsForAI(results.products, isBrand);

          // Build structured cards for the widget UI (top 4 — LLM chooses which to talk about)
          productCards = results.products.slice(0, 4).map((p) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            category: p.category,
            strainType: p.strainType,
            thc: p.thc,
            cbd: p.cbd,
            price: p.price,
            weight: p.weight,
            imageUrl: p.imageUrl,
            url: p.url,
            cartUrl: p.cartUrl,
            rating: p.rating,
            reviewCount: p.reviewCount,
          }));

          // Build filtered browse URL so the AI links to pre-filtered pages, not /shop/all
          // Prefer the active store's baseUrl (inventory lives there) over generic website_url
          const activeStore = janeConfig.stores[intent.storeId || janeConfig.defaultStore];
          const storeBaseUrl = activeStore?.baseUrl || (cfg.website_url as string) || '';
          let browseMoreUrl = storeBaseUrl ? `${storeBaseUrl}/shop/all` : '';
          let browseMoreLabel = 'Full Menu';
          if (storeBaseUrl && intent.brand) {
            // Use full brand name from Algolia (e.g., "CBX Cannabiotix") for correct slug
            // Jane's /brands/ pages require the full name: /brands/cbx-cannabiotix works, /brands/cbx shows 0 products
            const fullBrand = results.resolvedBrand || intent.brand;
            const brandSlug = fullBrand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            browseMoreUrl = `${storeBaseUrl}/brands/${brandSlug}`;
            browseMoreLabel = `${intent.brand} Products`;
          } else if (storeBaseUrl && intent.category) {
            const catSlug = intent.category.replace(/\s+/g, '-');
            browseMoreUrl = `${storeBaseUrl}/shop/${catSlug}`;
            browseMoreLabel = catSlug.charAt(0).toUpperCase() + catSlug.slice(1) + ' Menu';
          }
          const totalCount = results.totalFound;
          const shownCount = results.products.length;
          const hasMore = totalCount > 4;
          if (browseMoreUrl) browseMore = { url: browseMoreUrl, label: browseMoreLabel, totalCount };

          // Fallback notice — set when searchProducts had to relax filters to return anything
          fallbackNotice = describeFallback(
            results.fallbackTier,
            results.relaxedFilters,
            intent.brand,
            intent.category,
          );

          // Fallback preface — tells the LLM EXACTLY what to apologise for + how to pivot.
          const fallbackPreface = fallbackNotice
            ? `\n\n⚠ PARTIAL MATCH ONLY — ${fallbackNotice}\nStart by acknowledging the miss in one sentence, then narrate the alternatives below (the cards render automatically).\n`
            : '';

          const prefPreface = (prefs.lineages.length || prefs.brands.length)
            ? `\n\nSESSION PREFERENCES (inferred): lineages=${prefs.lineages.join(',') || 'none'} brands=${prefs.brands.join(',') || 'none'}. If any pick fits a prior preference, reference it naturally. Never fake continuity.\n`
            : '';

          // Give the LLM just the product names + brands so it can narrate accurately.
          // The CARDS are the structured UI — the LLM's job is to speak, not list URLs.
          const namesOnly = results.products
            .slice(0, Math.min(shownCount, 8))
            .map((p, i) => `  ${i + 1}. ${p.name}${p.brand ? ' by ' + p.brand : ''}${p.strainType ? ' [' + p.strainType + ']' : ''}${p.thc ? ' THC:' + p.thc : ''}${p.price ? ' ' + p.price : ''}`)
            .join('\n');

          productContext = `\n\nLIVE ${results.storeId.toUpperCase()} INVENTORY — ${totalCount} products matched${intent.brand ? ' from ' + intent.brand : ''}${intent.category ? ' in ' + intent.category : ''}${intent.maxPrice ? ' under $' + intent.maxPrice : ''}. Top ${shownCount} are already rendered as cards BELOW your reply:${fallbackPreface}${prefPreface}\n${namesOnly}\n\nNarrate 2-3 sentences: call out 1-2 by name with WHY they fit, mention the total count (${totalCount}), and invite the customer to tap a card. Do NOT paste URLs, do NOT list every product, do NOT use markdown bullets or numbered lists — the cards handle structure.`;
        }
      }
    } catch (e) {
      // Sentinel thrown by the brand-catalog fast path to skip the generic search block
      if (!(e instanceof Error && e.message === '__handled_brand_catalog')) {
        console.error(`[widget/chat] Product search failed for ${clientId}:`, e);
      }
      // Continue without extra product context — cards / supportLinks already populated if relevant
    }
  }

  // ── Call LLM directly (bypasses OpenClaw gateway + agency persona) ─────────
  // Widget visitors are CUSTOMERS — they should talk to a business-specific assistant,
  // NOT the agency's OpenClaw container which has SOUL.md / CEO persona.
  let aiResponse = '';
  try {
    const llm = getDirectLLMClient();
    const chatRes = await llm.chat.completions.create({
      model: routedModel,
      messages: [
        { role: 'system', content: systemPrompt + storeContext + productContext },
        // DB session memory (prior page loads), then in-memory history (current session)
        ...sessionHistory,
        ...(Array.isArray(history) ? (history as Array<{role: 'user'|'assistant', content: string}>).slice(-10) : []),
        { role: 'user', content: safeMessage },
      ],
    }, { signal: AbortSignal.timeout(25000) });
    aiResponse = chatRes.choices[0]?.message?.content || '';

    // ── Output scan — catch prompt leaks ──────────────────────────────────
    const outputScan = scanOutput(aiResponse);
    if (!outputScan.safe) {
      console.warn(`[widget/chat] Output flagged for client ${clientId}: ${outputScan.leaks.join(', ')}`);
      aiResponse = outputScan.sanitizedOutput;
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      console.error(`[widget/chat] LLM timeout for client ${clientId}`);
      return NextResponse.json(
        { response: "Thanks for your message! Our team is a bit busy right now. We'll get back to you shortly.", sessionId: resolvedSessionId },
        { headers: CORS },
      );
    }
    console.error(`[widget/chat] LLM error for ${clientId} (model=${routedModel}): ${errMsg}`);
    return NextResponse.json(
      { response: "Thanks for your message! Our team will get back to you shortly.", error: 'ai_unavailable' },
      { headers: CORS },
    );
  }

  if (!aiResponse.trim()) {
    return NextResponse.json(
      { response: "I didn't quite catch that. Could you rephrase your question?", error: 'empty_response', sessionId: resolvedSessionId },
      { headers: CORS },
    );
  }

  // ── Log conversation to DB (awaited — must complete before response) ────────
  // NOTE: fire-and-forget was causing silent data loss on Vercel serverless —
  // the function can be killed right after sending the response, before async
  // operations complete. We await the insert so it always persists.
  await saveConversation({
    clientId: client.id,
    agencyId: client.agency_id,
    sessionId: resolvedSessionId,
    userMessage: message.trim(),
    aiResponse: aiResponse,
    sourceUrl: sourceUrl || null,
  });

  // Deduct credit (also awaited to avoid billing gaps)
  await checkAndDeductCredits(client.agency_id, routedModel, preflightAction, {
    clientId: client.id,
    description: `Web chat (${routedModel}): ${message.trim().slice(0, 50)}`,
  });



  // ── Lead Capture (fire-and-forget) ─────────────────────────────────────────
  // Build full conversation including current exchange
  const fullHistory = [
    ...(Array.isArray(history) ? history : []),
    { role: 'user' as const, content: message.trim() },
    { role: 'assistant' as const, content: aiResponse },
  ];

  let leadCaptured = false;

  void (async () => {
    try {
      // Only try extraction after at least 2 user messages
      const userMsgCount = fullHistory.filter(m => m.role === 'user').length;
      if (userMsgCount < 2) return;

      const extracted = extractLeadFromConversation(fullHistory);
      if (!extracted) return;

      // Need at least email or phone to save
      if (!extracted.email && !extracted.phone) return;

      const result = await saveWebChatLead(
        client.agency_id,
        client.id,
        resolvedSessionId,
        extracted,
        fullHistory,
        sourceUrl,
      );

      if (result) {
        leadCaptured = true;
        // Fire webhook notification (async, non-blocking)
        void notifyLeadWebhook(client.agency_id, extracted, result.leadId);
      }
    } catch (err) {
      console.error('[widget/chat] Lead capture error:', err);
    }
  })();

  // ── Auto-log to CRM (fire-and-forget) ─────────────────────────────────────
  void (async () => {
    try {
      const { logConversationToCrm } = await import('@/lib/crm/conversation-logger');
      await logConversationToCrm(client.agency_id, {
        type: 'InboundMessage',
        body: message.trim(),
        messageType: 'web_chat',
        direction: 'inbound',
        name: `Web Visitor (${ip})`,
      });
      await logConversationToCrm(client.agency_id, {
        type: 'OutboundMessage',
        body: aiResponse,
        messageType: 'web_chat',
        direction: 'outbound',
        name: 'AI Worker',
      });
    } catch (err) {
      console.error('[widget/chat] CRM log error:', err);
    }
  })();

  return NextResponse.json(
    {
      response: aiResponse,
      sessionId: resolvedSessionId,
      leadCaptured,
      // New: structured product cards + browse-more link + fallback notice
      // (all optional — empty for non-product queries). Widget renders these
      // alongside `response` so the text + cards live together.
      cards: productCards,
      browseMore,
      fallbackNotice,
      // Server-resolved support links (ordering, delivery, hours, etc.). These
      // render as pill chips in the widget — the LLM cannot hallucinate or drop
      // them. If the user asked "how do I order?" the widget always shows the
      // How-to-Order chip, regardless of what the LLM decided to say.
      supportLinks: supportLinksOut,
    },
    { headers: CORS },
  );
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
