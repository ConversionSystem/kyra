/**
 * POST /api/agency/pipeline/run
 * THE AUTONOMOUS PIPELINE — One click, full automation.
 * 
 * Creates campaign → finds leads → researches each → personalizes → launches outreach.
 * Returns a stream of events so the UI can show real-time progress.
 * 
 * After launch, the GHL poll cron + AI worker handles closing automatically.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClientWithoutCookies } from '@/lib/supabase/server';

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';
const OUTREACH_LOCATION_ID = 'y1BFVhXMDNUPlbPxEpSA';

async function getAgencyId(userId: string): Promise<string | null> {
  const svc = createServiceClientWithoutCookies();
  const { data } = await svc.from('agency_members').select('agency_id').eq('user_id', userId).single();
  return data?.agency_id ?? null;
}

// ─── Website scraping (same as enrich route) ─────────────────────────────────

async function fetchRawHtml(url: string): Promise<string> {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  try {
    const res = await fetch(fullUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KyraBot/1.0)' },
      signal: AbortSignal.timeout(8_000),
      redirect: 'follow',
    });
    if (!res.ok) return '';
    const text = await res.text();
    return text.slice(0, 100_000);
  } catch { return ''; }
}

function extractPhones(html: string): string[] {
  const phones = new Set<string>();
  const telLinks = html.match(/href=["']tel:([^"']+)["']/gi) || [];
  for (const m of telLinks) {
    const num = m.replace(/href=["']tel:/i, '').replace(/["']/g, '').trim();
    if (num.replace(/\D/g, '').length >= 7) phones.add(num);
  }
  const regex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const matches = html.replace(/<[^>]+>/g, ' ').match(regex) || [];
  for (const m of matches) {
    const digits = m.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith('0000')) phones.add(m.trim());
  }
  return [...phones].slice(0, 5);
}

function extractEmails(html: string): string[] {
  const text = html.replace(/<[^>]+>/g, ' ');
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const filtered = [...new Set(matches)].filter(e =>
    !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.svg') &&
    !e.includes('example.com') && !e.includes('sentry') && !e.includes('webpack')
  );
  return filtered.slice(0, 5);
}

function extractSocials(html: string): Record<string, string> {
  const socials: Record<string, string> = {};
  const patterns: [string, RegExp][] = [
    ['facebook', /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+/i],
    ['instagram', /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+/i],
    ['twitter', /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9._-]+/i],
    ['youtube', /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)[a-zA-Z0-9._-]+/i],
    ['tiktok', /https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9._-]+/i],
    ['yelp', /https?:\/\/(?:www\.)?yelp\.com\/biz\/[a-zA-Z0-9._-]+/i],
  ];
  for (const [name, re] of patterns) {
    const match = html.match(re);
    if (match) socials[name] = match[0];
  }
  return socials;
}

// ─── The main autonomous pipeline ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const agencyId = await getAgencyId(user.id);
  if (!agencyId) return NextResponse.json({ error: 'No agency' }, { status: 404 });

  const body = await req.json();
  const { name, target_industry, target_role, target_location, target_company_size,
    target_pain_points, value_prop, lead_count = 10, channel = 'both', auto_launch = true } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Campaign name required' }, { status: 400 });

  const svc = createServiceClientWithoutCookies();

  // Get GHL token for launch phase
  const { data: ghlClient } = await svc
    .from('agency_clients')
    .select('ghl_private_token')
    .eq('ghl_location_id', OUTREACH_LOCATION_ID)
    .not('ghl_private_token', 'is', null)
    .limit(1)
    .single();

  const ghlToken = ghlClient?.ghl_private_token as string | null;

  // Get OpenAI key
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

  // ─── Stream response using SSE ─────────────────────────────────────────────
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // ═══ STEP 1: CREATE CAMPAIGN ═══
        send('step', { step: 1, label: 'Creating campaign...', status: 'running' });

        const { data: campaign, error: campErr } = await svc.from('pipeline_campaigns').insert({
          agency_id: agencyId, name: name.trim(), target_industry, target_role,
          target_company_size, target_location, target_pain_points, value_prop,
          status: 'active', leads_found: 0, leads_messaged: 0, leads_replied: 0, leads_booked: 0,
        }).select().single();

        if (campErr || !campaign) {
          send('error', { step: 1, error: campErr?.message || 'Failed to create campaign' });
          controller.close(); return;
        }
        send('step', { step: 1, label: 'Campaign created', status: 'done', campaignId: campaign.id });

        // ═══ STEP 2: FIND LEADS ═══
        send('step', { step: 2, label: 'Finding real businesses...', status: 'running', total: lead_count });

        const searchPrompt = `Find exactly ${Math.min(lead_count * 2, 50)} real ${target_industry || 'businesses'} in ${target_location || 'the United States'}.
These must be REAL companies that exist on Google Maps, Yelp, Clutch, or industry directories.
Target: ${target_role || 'Owner/CEO'} at companies with ${target_company_size || '11-50'} employees.

Return JSON array: [{"company":"...","website":"...","industry":"...","location":"...","company_size":"..."}]
RULES:
- company: EXACT legal business name
- website: REAL domain (e.g. "sweetflower.com") — NO made-up domains
- Only include businesses you are confident actually exist
- NO LinkedIn URLs, NO people names (we discover those from websites)`;

        const searchRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o', temperature: 0.4, max_tokens: 4000,
            messages: [{ role: 'user', content: searchPrompt }],
            response_format: { type: 'json_object' },
          }),
        });
        const searchData = await searchRes.json();
        const rawText = searchData.choices?.[0]?.message?.content || '{}';
        let candidates: Array<Record<string, string>> = [];
        try {
          const parsed = JSON.parse(rawText);
          candidates = Array.isArray(parsed) ? parsed : parsed.companies || parsed.results || parsed.leads || [];
        } catch { candidates = []; }

        // Verify websites exist
        const verified: typeof candidates = [];
        for (const c of candidates) {
          if (!c.website) continue;
          const url = c.website.startsWith('http') ? c.website : `https://${c.website}`;
          try {
            const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5_000), redirect: 'follow' });
            if (res.ok || res.status === 405 || res.status === 403) {
              verified.push(c);
              send('lead_found', {
                step: 2, current: verified.length, total: lead_count,
                company: c.company, website: c.website, location: c.location,
              });
            }
          } catch { /* skip unreachable */ }
          if (verified.length >= lead_count) break;
        }

        // Insert leads into DB
        const leadsToInsert = verified.slice(0, lead_count).map(c => ({
          campaign_id: campaign.id, agency_id: agencyId,
          company: c.company, website: c.website, industry: c.industry || target_industry,
          location: c.location || target_location, company_size: c.company_size || target_company_size,
          full_name: `Owner at ${c.company}`, title: target_role || 'Owner',
          stage: 'found',
        }));

        const { data: insertedLeads } = await svc.from('pipeline_leads').insert(leadsToInsert).select();
        const dbLeads = insertedLeads || [];

        await svc.from('pipeline_campaigns').update({ leads_found: dbLeads.length }).eq('id', campaign.id);
        send('step', { step: 2, label: `Found ${dbLeads.length} verified businesses`, status: 'done', count: dbLeads.length });

        // ═══ STEP 3: RESEARCH EACH LEAD ═══
        send('step', { step: 3, label: 'Researching companies & finding contacts...', status: 'running', total: dbLeads.length });

        const teamPaths = ['/about', '/team', '/our-team', '/about-us', '/people', '/leadership', '/contact', '/staff', '/meet-the-team', '/company'];

        for (let i = 0; i < dbLeads.length; i++) {
          const lead = dbLeads[i];
          const baseUrl = lead.website?.startsWith('http') ? lead.website : `https://${lead.website}`;

          send('researching', { step: 3, current: i + 1, total: dbLeads.length, company: lead.company });

          // Scrape homepage + team pages
          let allHtml = '';
          const homepage = await fetchRawHtml(baseUrl);
          allHtml += homepage;

          for (const path of teamPaths) {
            const pageHtml = await fetchRawHtml(`${baseUrl}${path}`);
            if (pageHtml.length > 500) allHtml += pageHtml;
          }

          // Extract data from HTML
          const phones = extractPhones(allHtml);
          const emails = extractEmails(allHtml);
          const socials = extractSocials(allHtml);

          // GPT-4o enrichment
          const cleanText = allHtml.replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000);

          const enrichPrompt = `Analyze this company's website content and return JSON:
Company: ${lead.company}
Industry: ${lead.industry}
Website content: ${cleanText}
Phones found: ${phones.join(', ') || 'none'}
Emails found: ${emails.join(', ') || 'none'}

Return JSON:
{
  "decision_maker_name": "real person name from the website content (NOT made up)",
  "decision_maker_title": "their role",
  "person_source": "website" or "none" if no name found,
  "company_context": "1-2 sentence summary of what they do",
  "services_offered": "their main services",
  "likely_pain_points": "2-3 pain points based on their business",
  "opportunity_angle": "how ${value_prop || 'AI automation'} could help them specifically",
  "icebreaker": "specific detail from their site to reference",
  "best_email": "most relevant email from the list, or empty",
  "best_phone": "most relevant phone, or empty"
}`;

          let enrichment: Record<string, string> = {};
          try {
            const enrichRes = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'gpt-4o', temperature: 0.3, max_tokens: 1500,
                messages: [{ role: 'user', content: enrichPrompt }],
                response_format: { type: 'json_object' },
              }),
            });
            const enrichData = await enrichRes.json();
            enrichment = JSON.parse(enrichData.choices?.[0]?.message?.content || '{}');
          } catch { /* continue with empty enrichment */ }

          // ═══ STEP 4: PERSONALIZE ═══
          const personName = enrichment.decision_maker_name && enrichment.person_source === 'website'
            ? enrichment.decision_maker_name : lead.company;

          const emailPrompt = `Write a cold outreach email for:
To: ${personName} at ${lead.company} (${lead.industry})
About them: ${enrichment.company_context || 'N/A'}
Their pain points: ${enrichment.likely_pain_points || 'N/A'}
Our angle: ${enrichment.opportunity_angle || 'N/A'}
Icebreaker: ${enrichment.icebreaker || 'N/A'}
Our offer: ${value_prop || 'AI-powered automation for your business'}

Return JSON:
{
  "subject": "short, curiosity-driven subject (no corporate speak)",
  "email": "3-4 paragraph email. Conversational, peer-to-peer tone. Reference something specific about THEIR business. End with: Angel Castro, Conversion System\\nhttps://kyra.conversionsystem.com/get-demo",
  "sms_opener": "1-2 sentence SMS. Casual, reference their business. End with a question. Under 160 chars."
}

RULES: No corporate speak. No 'I hope this finds you well'. Talk like a human texting a peer.`;

          let messaging: Record<string, string> = {};
          try {
            const msgRes = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'gpt-4o', temperature: 0.7, max_tokens: 1000,
                messages: [{ role: 'user', content: emailPrompt }],
                response_format: { type: 'json_object' },
              }),
            });
            const msgData = await msgRes.json();
            messaging = JSON.parse(msgData.choices?.[0]?.message?.content || '{}');
          } catch { /* continue */ }

          // Update lead in DB
          const fullName = enrichment.decision_maker_name && enrichment.person_source === 'website'
            ? enrichment.decision_maker_name : lead.full_name;
          const title = enrichment.decision_maker_title || lead.title;

          await svc.from('pipeline_leads').update({
            full_name: fullName,
            title,
            email: enrichment.best_email || emails[0] || null,
            phone: enrichment.best_phone || phones[0] || null,
            personalized_subject: messaging.subject || null,
            personalized_email: messaging.email || null,
            personalized_opener: messaging.sms_opener || messaging.sms || null,
            stage: 'researched',
            enrichment_data: {
              company_context: enrichment.company_context,
              services_offered: enrichment.services_offered,
              likely_pain_points: enrichment.likely_pain_points,
              opportunity_angle: enrichment.opportunity_angle,
              icebreaker: enrichment.icebreaker,
              person_source: enrichment.person_source,
              emails_found: emails,
              phones_found: phones,
              socials,
            },
          }).eq('id', lead.id);

          send('lead_researched', {
            step: 3, current: i + 1, total: dbLeads.length,
            leadId: lead.id, company: lead.company,
            name: fullName, title,
            email: enrichment.best_email || emails[0] || null,
            phone: enrichment.best_phone || phones[0] || null,
            subject: messaging.subject,
            smsOpener: messaging.sms_opener || messaging.sms,
            socials: Object.keys(socials),
          });
        }

        send('step', { step: 3, label: `Researched ${dbLeads.length} companies`, status: 'done' });

        // ═══ STEP 5: LAUNCH OUTREACH ═══
        if (!auto_launch || !ghlToken) {
          send('step', { step: 4, label: ghlToken ? 'Ready to launch — click Launch when ready' : 'GHL not connected — connect to launch automatically', status: 'waiting' });
          send('done', { campaignId: campaign.id, leadsFound: dbLeads.length, autoLaunched: false });
          controller.close();
          return;
        }

        send('step', { step: 4, label: 'Launching outreach...', status: 'running', total: dbLeads.length });

        // Reload leads with enrichment
        const { data: enrichedLeads } = await svc.from('pipeline_leads')
          .select('*').eq('campaign_id', campaign.id).eq('stage', 'researched');

        let sent = 0;
        let errors = 0;

        for (const lead of enrichedLeads || []) {
          try {
            // Create GHL contact
            const contactRes = await fetch(`${GHL_API}/contacts/`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${ghlToken}`, Version: GHL_VERSION, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                locationId: OUTREACH_LOCATION_ID,
                firstName: (lead.full_name || '').split(' ')[0] || '',
                lastName: (lead.full_name || '').split(' ').slice(1).join(' ') || '',
                email: lead.email || '',
                phone: lead.phone || '',
                companyName: lead.company || '',
                source: 'Kyra AI Pipeline',
                tags: ['kyra-pipeline', `campaign-${campaign.id.slice(0, 8)}`],
              }),
              signal: AbortSignal.timeout(10_000),
            });
            const contactData = await contactRes.json().catch(() => ({}));
            const contactId = contactData?.contact?.id || contactData?.id;

            if (!contactId) { errors++; continue; }

            // Add enrichment note
            const ed = (lead.enrichment_data || {}) as Record<string, string>;
            await fetch(`${GHL_API}/contacts/${contactId}/notes`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${ghlToken}`, Version: GHL_VERSION, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                body: `🎯 Kyra Pipeline Lead\n\nCompany: ${ed.company_context || 'N/A'}\nPain Points: ${ed.likely_pain_points || 'N/A'}\nAngle: ${ed.opportunity_angle || 'N/A'}`,
              }),
              signal: AbortSignal.timeout(8_000),
            }).catch(() => {});

            const sentChannels: string[] = [];

            // Send email
            if ((channel === 'email' || channel === 'both') && lead.email && lead.personalized_email) {
              const emailHtml = `<p>${(lead.personalized_email as string).replace(/\n/g, '</p><p>')}</p>`;
              const emailRes = await fetch(`${GHL_API}/conversations/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${ghlToken}`, Version: GHL_VERSION, 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'Email', contactId, subject: lead.personalized_subject || 'Quick question', html: emailHtml, message: lead.personalized_email }),
                signal: AbortSignal.timeout(10_000),
              });
              if (emailRes.ok) sentChannels.push('email');
            }

            // Send SMS
            if ((channel === 'sms' || channel === 'both') && lead.phone && lead.personalized_opener) {
              const smsRes = await fetch(`${GHL_API}/conversations/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${ghlToken}`, Version: GHL_VERSION, 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'SMS', contactId, message: lead.personalized_opener }),
                signal: AbortSignal.timeout(10_000),
              });
              if (smsRes.ok) sentChannels.push('sms');
            }

            // Update lead
            await svc.from('pipeline_leads').update({
              stage: 'messaged', messaged_at: new Date().toISOString(),
              ghl_contact_id: contactId,
              enrichment_data: { ...ed, sent_channels: sentChannels },
            }).eq('id', lead.id);

            sent++;
            send('lead_launched', {
              step: 4, current: sent + errors, total: (enrichedLeads || []).length,
              leadId: lead.id, name: lead.full_name, company: lead.company,
              channels: sentChannels, email: lead.email, phone: lead.phone,
            });

            await new Promise(r => setTimeout(r, 500)); // rate limit
          } catch {
            errors++;
          }
        }

        await svc.from('pipeline_campaigns').update({ leads_messaged: sent }).eq('id', campaign.id);
        send('step', { step: 4, label: `Launched ${sent} messages (${errors} failed)`, status: 'done' });

        // ═══ STEP 5: AI CLOSER ACTIVATED ═══
        send('step', { step: 5, label: 'AI Closer activated — monitoring for replies 24/7', status: 'active' });
        send('done', {
          campaignId: campaign.id, leadsFound: dbLeads.length,
          leadsMessaged: sent, autoLaunched: true,
          message: 'Your AI worker is now monitoring for replies and will qualify, nurture, and book demos automatically.',
        });

      } catch (err) {
        send('error', { error: err instanceof Error ? err.message : 'Pipeline failed' });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
