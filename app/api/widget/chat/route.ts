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
  const { buildJaneConfigFromContainerConfig } = await import('@/lib/integrations/jane');
  const janeConfig = buildJaneConfigFromContainerConfig(cfg);
  const janeActive = !!janeConfig;
  const knownBrands = janeConfig?.knownBrands || [];

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
You are also a cannabis product recommendation specialist — think helpful, knowledgeable budtender.

PRODUCT ANSWERS — MANDATORY FORMAT:
Every time you recommend or mention a specific product, you MUST include ALL of these:
1. Product name (bold)
2. Brand name
3. THC % (if available)
4. Strain type (indica/sativa/hybrid)
5. Short reason why it's a good pick for the customer's ask
6. Direct product page link using [View Product →](url) — NEVER skip the link

BRAND QUESTIONS:
When a customer asks about a specific brand (e.g., "What Alien Labs strains do you have?"):
- List ALL products from that brand currently in stock
- Group by category (flower, pre-rolls, vapes, edibles) if more than 3 products
- Include strain names, THC%, and direct links for each

CATEGORY + POTENCY QUESTIONS:
When asked "highest THC flower" or "strongest pre-roll":
- Sort by THC% descending
- Show the top 3-5 results with full details + links

DEALS & PROMOTIONS:
When asked about deals, specials, or promotions:
- Check if any deal info is provided in context below
- Always include the deals page link if available
- Recommend products from active deals when possible

EFFECT-BASED RECOMMENDATIONS:
- Indica → sleep/relax/pain | Sativa → energy/focus/creativity | Hybrid → balanced
- "Something to help me sleep" → recommend top indica products with links
- NEVER make medical claims. Say "many customers find..." not "this will help your..."

GENERAL STORE QUESTIONS:
For non-product questions (delivery, payment, ordering, rewards, returns):
- Answer directly from your business knowledge
- ALWAYS include the relevant page link when available (see SUPPORT LINKS below)
- Examples: "How do I order?" → answer + ordering page link, "Where do you deliver?" → answer + delivery link

Be knowledgeable but not pushy. If no products match, suggest browsing the full menu or trying a different category.` : '',
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
  if (janeActive && janeConfig) {
    try {
      const { isProductQuery, parseProductIntent, searchProducts, formatProductsForAI, describeFallback } =
        await import('@/lib/integrations/jane');
      if (isProductQuery(safeMessage, knownBrands)) {
        const intent = parseProductIntent(safeMessage, knownBrands);
        intent.storeId = resolvedStoreId || janeConfig.defaultStore;
        // For brand queries, get more results to show full brand inventory
        if (intent.brand && !intent.limit) intent.limit = 30;

        // Session-preference boosts: prior mentions of indica/Alien Labs/etc nudge ranking
        const prefs = extractSessionPreferences(
          [...sessionHistory, ...(Array.isArray(history) ? history : [])],
          knownBrands,
        );
        if (prefs.lineages.length) intent.preferLineages = prefs.lineages;
        if (prefs.brands.length) intent.preferBrands = prefs.brands;

        const firecrawlKey = process.env.FIRECRAWL_API_KEY;
        // 12s timeout — Firecrawl scrape takes ~8s. Algolia is ~4ms so this is mostly for fallback.
        const searchPromise = searchProducts(janeConfig, intent, firecrawlKey || undefined);
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000));
        const results = await Promise.race([searchPromise, timeoutPromise]);
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

          // Build a dynamic formatting example from the first real result so the few-shot
          // doesn't leak another dispensary's product names/URLs into the prompt.
          const sample = results.products[0];
          const sampleStrain = sample.strainType
            ? sample.strainType.charAt(0).toUpperCase() + sample.strainType.slice(1)
            : 'Hybrid';
          const sampleBits = [
            sample.brand ? `by ${sample.brand}` : '',
            sample.price || '',
          ].filter(Boolean).join(' — ');
          const sampleDetails = [
            sampleStrain,
            sample.thc ? `THC: ${sample.thc}` : '',
            'Short reason why it fits the ask.',
          ].filter(Boolean).join(' · ');
          const formattingExample = `**${sample.name}**${sampleBits ? ' ' + sampleBits : ''}\n${sampleDetails}\n[View Product →](${sample.url})`;

          const browseMoreLine = browseMoreUrl
            ? `\n\nBROWSE MORE LINK: [Browse All ${totalCount} ${browseMoreLabel} →](${browseMoreUrl})`
            : '';
          const browseMoreRule = browseMoreUrl
            ? (hasMore
                ? `IMPORTANT: After showing your 3-4 picks, you MUST tell the customer the total count and link to browse all. Example: "We carry **${totalCount} ${intent.brand || intent.category || ''} products** in stock right now — here are my top picks. [Browse all ${totalCount} →](${browseMoreUrl})"`
                : 'Show all products since there are only a few.')
            : 'Show all products since there are only a few.';
          const browseMoreHint = browseMoreUrl
            ? 'When suggesting "browse more", ALWAYS use the BROWSE MORE LINK above — NEVER use /shop/all'
            : 'If the customer wants more, invite them to visit the store or ask about a specific category.';

          // Fallback preface — tells the LLM EXACTLY what to apologise for + how to pivot.
          // This is the Tier 1 fix that kills the canned "no results" message.
          const fallbackPreface = fallbackNotice
            ? `\n\n⚠ PARTIAL MATCH ONLY — ${fallbackNotice}\nRULES FOR THIS RESPONSE:\n- Start by acknowledging the miss in one sentence ("We're out of Alien Labs pre-rolls right now").\n- Then pivot to the alternatives below ("but here are some great picks that still hit the mark…").\n- Never silently substitute — the customer asked for something specific, call it out.\n`
            : '';

          // Session-preference preface — if prior turns mentioned a lineage or brand,
          // tell the LLM to reference the continuity ("since you liked indica earlier…")
          const prefPreface = (prefs.lineages.length || prefs.brands.length)
            ? `\n\nSESSION PREFERENCES (inferred from this visitor's prior turns):\n- Mentioned lineages: ${prefs.lineages.join(', ') || 'none'}\n- Mentioned brands: ${prefs.brands.join(', ') || 'none'}\nIf any pick below matches, say so naturally ("since you liked indica earlier, ${prefs.lineages.includes('indica') ? 'this' : 'that'} fits"). Never fake continuity if none exists.\n`
            : '';

          productContext = `\n\nPRODUCT SEARCH RESULTS (from live ${results.storeId} inventory — ${totalCount} total products found${intent.brand ? ` from ${intent.brand}` : ''}, showing top ${shownCount}):${fallbackPreface}${prefPreface}\n${formatted}${browseMoreLine}\n\nFORMATTING (use markdown bold and links):\n\n${formattingExample}\n\nRULES:\n- Pick the BEST 3-4 products from the search results to highlight. Do NOT list every single product.\n- Use **bold** for product names\n- Use [View Product →](url) for EVERY product — NEVER skip links, NEVER paste raw URLs\n- Each product: name+brand+price on line 1, strain·THC·description on line 2, link on line 3\n- ${browseMoreRule}\n- ${browseMoreHint}\n- ${isBrand ? 'Choose a mix across categories (flower, pre-rolls, vapes, edibles) for variety.' : 'One short intro line, then products.'}`;

        }
      }
    } catch (e) {
      console.error(`[widget/chat] Product search failed for ${clientId}:`, e);
      // Continue without product context — AI will answer from knowledge
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
    },
    { headers: CORS },
  );
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
