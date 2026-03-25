// ── Role Worker Definitions ──────────────────────────────────────────────────
// Shared data for all role-based AI workers.
// Used by both the AI Workers tab and the AI Setup page.

export interface TemplateVariable {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  type?: 'text' | 'textarea' | 'select';
  options?: string[];
}

export interface RoleWorker {
  id: string;
  type: 'role';
  emoji: string;
  name: string;
  description: string;
  roleBadge: string;
  tags: string[];
  whatItDoes: string[];
  channels: ('sms' | 'voice' | 'chat' | 'telegram')[];
  tools: string[];
  useCase: 'customer-facing' | 'internal';  // customer-facing = talks to end customers; internal = agency/operator use
  visibility?: 'public' | 'private';  // default 'public'
  allowedAgencies?: string[];          // agency IDs that can see this worker (only when visibility = 'private')
  variables?: TemplateVariable[];
  soulMd?: string;
  /** ClawHub skill slugs to auto-install when this worker is applied */
  requiredClawHubSkills?: string[];
}

export const ROLE_WORKERS: RoleWorker[] = [
  {
    id: 'sales-qualifier', type: 'role', emoji: '🎯', name: 'Sales Qualifier',
    roleBadge: 'Lead Qualification',
    description: 'Engages new leads via text and voice, asks qualification questions using the BANT framework, scores fit, and routes qualified leads to book meetings with your team.',
    tags: ['leads', 'qualification', 'BANT', 'booking'],
    whatItDoes: [
      'Engages new leads instantly via SMS or chat',
      'Qualifies using BANT (Budget, Authority, Need, Timeline)',
      'Routes hot leads to book a meeting automatically',
      'Gracefully disqualifies bad fits without burning the relationship',
    ],
    channels: ['sms', 'chat', 'voice'],
    tools: ['Books Appointments', 'Tags Contacts', 'Creates Deals', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'qualification_criteria', label: 'Qualification Criteria', placeholder: 'Budget over $5k, decision maker, timeline within 90 days...', required: false, type: 'textarea' },
      { key: 'ideal_customer', label: 'Ideal Customer Profile', placeholder: 'Small business owners in home services with 5-50 employees', required: false },
      { key: 'disqualification_response', label: 'Disqualification Response', placeholder: 'Thanks for your interest! Based on what you shared, we might not be the best fit right now...', required: false, type: 'textarea' },
      { key: 'booking_url', label: 'Booking URL', placeholder: 'https://calendly.com/your-team/discovery', required: false },
    ],
  },
  {
    id: 'appointment-setter', type: 'role', emoji: '📞', name: 'Appointment Setter',
    roleBadge: 'Scheduling',
    description: 'Specializes in booking, confirming, and rescheduling appointments with zero friction. Handles scheduling logistics so your team focuses on the meeting, not the calendar.',
    tags: ['scheduling', 'calendar', 'reminders', 'booking'],
    whatItDoes: [
      'Books, confirms, and reschedules appointments 24/7',
      'Handles multiple appointment types and calendar logistics',
      'Sends confirmation messages with all details',
      'Manages reschedule requests without human intervention',
    ],
    channels: ['sms', 'chat', 'voice'],
    tools: ['Books Appointments', 'Tags Contacts', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'appointment_types', label: 'Appointment Types', placeholder: 'Free consultation - 30min\nStrategy session - 60min\nQuick check-in - 15min', required: false, type: 'textarea' },
      { key: 'booking_url', label: 'Booking URL', placeholder: 'https://calendly.com/your-team', required: false },
      { key: 'reschedule_policy', label: 'Reschedule Policy', placeholder: 'Reschedule up to 2 hours before. No-shows get one follow-up.', required: false },
      { key: 'reminder_message', label: 'Reminder Message Template', placeholder: 'Just a friendly reminder about your upcoming appointment...', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'intake-specialist', type: 'role', emoji: '📝', name: 'Intake Specialist',
    roleBadge: 'Client Onboarding',
    description: 'Collects required information from new clients or patients to complete onboarding. Walks through each field patiently and routes to the right department when done.',
    tags: ['intake', 'onboarding', 'forms', 'routing'],
    whatItDoes: [
      'Collects required client/patient info one field at a time',
      'Routes completed intakes to the right department',
      'Sends confirmation when intake is complete',
      'Handles partial info gracefully with follow-up',
    ],
    channels: ['sms', 'chat'],
    tools: ['Tags Contacts', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'required_fields', label: 'Required Fields', placeholder: 'Full name\nDate of birth\nInsurance provider\nReason for visit', required: false, type: 'textarea' },
      { key: 'routing_rules', label: 'Routing Rules', placeholder: 'Insurance questions → billing team\nUrgent care → nurse line\nGeneral inquiry → front desk', required: false, type: 'textarea' },
      { key: 'confirmation_message', label: 'Confirmation Message', placeholder: 'All set! We have everything we need. A team member will reach out within 24 hours.', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'community-manager', type: 'role', emoji: '💬', name: 'Community Manager',
    roleBadge: 'Customer Support',
    description: 'Answers FAQs, handles customer support, and maintains your brand tone across every interaction. Knows when to answer confidently and when to escalate to a human.',
    tags: ['support', 'FAQ', 'community', 'escalation'],
    whatItDoes: [
      'Answers FAQs instantly using your knowledge base',
      'Maintains your brand tone across every interaction',
      'Detects when to escalate to a human vs handle solo',
      'Handles support tickets, complaints, and general inquiries',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'faq_topics', label: 'Common FAQ Topics & Answers', placeholder: 'What are your hours? → Mon-Fri 9am-5pm EST\nDo you offer refunds? → Yes, within 30 days...', required: false, type: 'textarea' },
      { key: 'escalation_triggers', label: 'Escalation Triggers', placeholder: 'Refund requests\nLegal complaints\nBilling disputes\nAngry/abusive language', required: false, type: 'textarea' },
      { key: 'tone_guidelines', label: 'Tone Guidelines', placeholder: 'Professional but approachable. Use first names. Never use jargon.', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'researcher', type: 'role', emoji: '🔍', name: 'Researcher',
    roleBadge: 'Intelligence',
    description: 'Deep dives into topics on demand, compiles structured reports, tracks industry trends, and delivers actionable intelligence your team can act on immediately.',
    tags: ['research', 'reports', 'analysis', 'intelligence'],
    whatItDoes: [
      'Deep dives into any topic on demand',
      'Compiles structured reports with actionable intelligence',
      'Tracks competitors, trends, and industry news',
      'Delivers findings in your preferred format',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'research_topics', label: 'Default Research Topics', placeholder: 'AI adoption in healthcare\nCompetitor pricing changes\nRegulatory updates', required: false, type: 'textarea' },
      { key: 'competitors', label: 'Key Competitors', placeholder: 'Competitor A\nCompetitor B\nCompetitor C', required: false, type: 'textarea' },
      { key: 'report_format', label: 'Report Format', placeholder: 'Executive Summary', required: false, type: 'select', options: ['Executive Summary', 'Detailed Analysis', 'Quick Brief'] },
    ],
  },
  {
    id: 'weekly-reporter', type: 'role', emoji: '📊', name: 'Weekly Reporter',
    roleBadge: 'Analytics',
    description: 'Compiles periodic business activity summaries — conversations, leads, metrics, notable events — into clear, actionable reports your team actually reads.',
    tags: ['reports', 'analytics', 'metrics', 'weekly'],
    whatItDoes: [
      'Compiles conversation and lead metrics weekly',
      'Flags significant changes (up or down) automatically',
      'Delivers clear summaries your team actually reads',
      'Tracks custom KPIs you define',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Reads Analytics', 'Sends Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'report_metrics', label: 'Metrics to Track', placeholder: 'New leads\nCalls made\nAppointments booked\nRevenue closed\nCustomer satisfaction', required: false, type: 'textarea' },
      { key: 'report_schedule', label: 'Report Schedule', placeholder: 'Weekly', required: false, type: 'select', options: ['Weekly', 'Bi-weekly', 'Monthly'] },
      { key: 'highlight_threshold', label: 'Highlight Threshold', placeholder: 'Flag changes over 20%', required: false },
    ],
  },
  {
    id: 'social-scout', type: 'role', emoji: '🕵️', name: 'Social Scout',
    roleBadge: 'Social Monitoring',
    description: 'Monitors social mentions, competitor activity, and trending topics across platforms. Surfaces engagement opportunities and flags anything that needs a human response.',
    tags: ['social', 'monitoring', 'competitors', 'trends'],
    whatItDoes: [
      'Monitors social mentions of your brand 24/7',
      'Tracks competitor activity across platforms',
      'Surfaces engagement opportunities before they\'re missed',
      'Flags anything requiring urgent human response',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Tags Contacts', 'Escalates to Human'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'platforms', label: 'Platforms to Monitor', placeholder: 'Instagram\nTwitter/X\nLinkedIn\nTikTok', required: false, type: 'textarea' },
      { key: 'competitors_to_track', label: 'Competitors to Track', placeholder: 'Competitor A (@handle)\nCompetitor B (@handle)', required: false, type: 'textarea' },
      { key: 'keywords', label: 'Keywords to Watch', placeholder: 'your brand name\nindustry terms\nproduct names', required: false, type: 'textarea' },
      { key: 'alert_urgency', label: 'Alert Urgency Rules', placeholder: 'Negative reviews → urgent\nCompetitor launch → high\nTrending topic → medium', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'brand-voice', type: 'role', emoji: '🛡️', name: 'Brand Voice Guard',
    roleBadge: 'Content Review',
    description: 'Reviews content for brand consistency — tone, messaging, vocabulary. Catches off-brand language before it goes public and suggests on-brand alternatives with specific fixes.',
    tags: ['content', 'branding', 'review', 'consistency'],
    whatItDoes: [
      'Reviews content for brand consistency before publishing',
      'Catches off-brand language and suggests alternatives',
      'Enforces vocabulary rules and messaging pillars',
      'Provides specific line-by-line fixes with explanations',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Reviews Content'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'brand_tone', label: 'Brand Tone', placeholder: 'Professional but approachable. Never use slang. Always use inclusive language.', required: false, type: 'textarea' },
      { key: 'forbidden_words', label: 'Forbidden Words/Phrases', placeholder: 'synergy\nleverage\ngame-changer\ndisrupt', required: false, type: 'textarea' },
      { key: 'messaging_pillars', label: 'Messaging Pillars', placeholder: 'Innovation\nTrust\nSimplicity', required: false, type: 'textarea' },
      { key: 'approved_vocabulary', label: 'Approved Vocabulary', placeholder: 'Use "team members" not "employees"\nUse "clients" not "customers"', required: false, type: 'textarea' },
    ],
  },

  // ── GROUP A: Customer-Facing ──────────────────────────────────────────────

  {
    id: 'whatsapp-support', type: 'role', emoji: '💚', name: 'WhatsApp Support',
    roleBadge: 'Multi-Channel Support',
    description: 'Handles WhatsApp and SMS inquiries, qualifies leads, books appointments, and escalates complex issues — so you never miss a customer message.',
    tags: ['support', 'leads', 'qualification', 'booking', 'multi-channel'],
    whatItDoes: [
      'Responds to customer inquiries within seconds across WhatsApp and SMS',
      'Qualifies leads with discovery questions and scores their intent',
      'Books appointments and sends confirmation details',
      'Escalates complex issues to the owner with full conversation context',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: ['Books Appointments', 'Tags Contacts', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'business_hours', label: 'Business Hours', placeholder: 'Mon-Fri 9am-5pm EST', required: false },
      { key: 'booking_url', label: 'Booking URL', placeholder: 'https://calendly.com/your-team', required: false },
      { key: 'owner_name', label: 'Owner Name', placeholder: 'John Smith', required: false },
      { key: 'services', label: 'Services Offered', placeholder: 'Web design, SEO, paid ads, social media management', required: false },
      { key: 'faq_topics', label: 'FAQ Topics & Answers', placeholder: 'What are your hours? → Mon-Fri 9am-5pm\nDo you offer refunds? → Yes, within 30 days', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'phone-receptionist', type: 'role', emoji: '🏢', name: 'Phone Receptionist',
    roleBadge: 'Voice Call Handling',
    description: 'Answers inbound calls professionally, routes to the right person, books appointments, and handles FAQs — 24/7 without putting callers on hold.',
    tags: ['voice', 'scheduling', 'FAQ', 'reception'],
    whatItDoes: [
      'Greets callers and identifies their needs through natural conversation',
      'Books and confirms appointments with date, time, and prep instructions',
      'Answers FAQs about hours, location, services, and pricing',
      'Escalates billing disputes and complaints to a human immediately',
    ],
    channels: ['voice', 'sms'],
    tools: ['Books Appointments', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'business_phone', label: 'Business Phone', placeholder: '+1 (555) 123-4567', required: false },
      { key: 'business_hours', label: 'Business Hours', placeholder: 'Mon-Fri 9am-5pm EST', required: false },
      { key: 'booking_url', label: 'Booking URL', placeholder: 'https://calendly.com/your-team', required: false },
      { key: 'services', label: 'Services Offered', placeholder: 'Haircuts, coloring, styling, treatments', required: false },
    ],
  },
  {
    id: 'sdr-outbound', type: 'role', emoji: '📤', name: 'SDR Outbound',
    roleBadge: 'Sales Prospecting',
    description: 'Researches target accounts, drafts personalized cold outreach, and builds multi-touch sequences that turn cold contacts into warm conversations.',
    tags: ['leads', 'outreach', 'prospecting', 'sales', 'email'],
    whatItDoes: [
      'Researches prospects and identifies decision-makers from public data',
      'Drafts personalized cold emails under 120 words with a unique angle per prospect',
      'Builds 5-touch follow-up sequences (email → LinkedIn → breakup)',
      'Tracks reply rates and adjusts messaging based on what works',
    ],
    channels: ['chat', 'sms'],
    tools: ['Tags Contacts', 'Creates Deals', 'Web Search'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'target_persona', label: 'Target Persona', placeholder: 'VP of Marketing at B2B SaaS companies, 50-200 employees', required: false, type: 'textarea' },
      { key: 'ideal_customer_profile', label: 'Ideal Customer Profile', placeholder: 'B2B SaaS, $5M-$50M ARR, US-based, using HubSpot', required: false, type: 'textarea' },
      { key: 'booking_url', label: 'Booking URL', placeholder: 'https://calendly.com/your-team/discovery', required: false },
    ],
  },
  {
    id: 'objection-handler', type: 'role', emoji: '🗣️', name: 'Objection Handler',
    roleBadge: 'Sales Coaching',
    description: 'Provides instant rebuttals and talk tracks for every sales objection — price, timing, competition, authority — with 3 response options per objection.',
    tags: ['sales', 'coaching', 'objections', 'training'],
    whatItDoes: [
      'Classifies objections by category (price, timing, competition, authority, need)',
      'Generates 3 response options per objection so reps pick what fits their style',
      'Always includes a discovery question to keep the conversation going',
      'Coaches tone: never dismiss the objection, always acknowledge first',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Reviews Content'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'product_name', label: 'Product Name', placeholder: 'Acme CRM Pro', required: false },
      { key: 'main_competitors', label: 'Main Competitors', placeholder: 'HubSpot — broader but less specialized\nSalesforce — enterprise, we\'re SMB-focused', required: false, type: 'textarea' },
      { key: 'key_differentiators', label: 'Key Differentiators', placeholder: '3x faster onboarding\nDedicated account manager\nNo annual contract required', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'nps-recovery', type: 'role', emoji: '⭐', name: 'NPS Recovery',
    roleBadge: 'Customer Retention',
    description: 'Follows up with NPS detractors using personalized, empathetic messages that acknowledge their specific concerns and offer concrete resolution paths.',
    tags: ['retention', 'NPS', 'support', 'recovery'],
    whatItDoes: [
      'Drafts personalized follow-up messages referencing the specific feedback given',
      'Identifies root cause category (product, support, pricing, onboarding)',
      'Connects customers with the right team or resource',
      'Tracks recovery rate and feeds systemic issues to leadership',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'owner_name', label: 'Owner Name', placeholder: 'John Smith', required: false },
      { key: 'support_email', label: 'Support Email', placeholder: 'support@acme.com', required: false },
      { key: 'response_sla', label: 'Response SLA', placeholder: 'Within 4 hours during business hours', required: false },
    ],
  },
  {
    id: 'abandoned-cart', type: 'role', emoji: '🛒', name: 'Abandoned Cart',
    roleBadge: 'E-Commerce Recovery',
    description: 'Sends timed, personalized cart recovery sequences at 1hr, 24hr, and 72hr intervals — with urgency copy, discount codes, and conversion tracking.',
    tags: ['ecommerce', 'recovery', 'email', 'conversion'],
    whatItDoes: [
      'Triggers personalized recovery messages at 1hr, 24hr, and 72hr after abandonment',
      'Segments carts by value, product type, and customer history',
      'Generates urgency-driven copy (low stock, expiring discounts)',
      'Tracks recovery rate and revenue recaptured per campaign',
    ],
    channels: ['sms', 'chat'],
    tools: ['Tags Contacts', 'Sends Messages'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'discount_code', label: 'Discount Code', placeholder: 'COMEBACK10', required: false },
      { key: 'cart_expiry_hours', label: 'Cart Expiry (hours)', placeholder: '72', required: false },
      { key: 'recovery_email', label: 'Recovery Email', placeholder: 'orders@acme.com', required: false },
    ],
  },
  {
    id: 'review-responder', type: 'role', emoji: '🌟', name: 'Review Responder',
    roleBadge: 'Reputation Management',
    description: 'Drafts personalized responses to 1-5 star reviews, escalates safety issues, and delivers weekly sentiment summaries to catch recurring problems early.',
    tags: ['reviews', 'reputation', 'content', 'support'],
    whatItDoes: [
      'Drafts personalized review responses in brand voice within 4 hours',
      'Detects urgent issues (defects, safety, legal threats) and escalates immediately',
      'Tracks sentiment trends and identifies recurring complaints',
      'Delivers weekly review digest: volume, average rating, top issues',
    ],
    channels: ['chat', 'telegram'],
    tools: ['Tags Contacts', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'brand_tone', label: 'Brand Tone', placeholder: 'Warm, professional, empathetic. Never defensive.', required: false, type: 'textarea' },
      { key: 'support_email', label: 'Support Email', placeholder: 'support@acme.com', required: false },
      { key: 'escalation_contact', label: 'Escalation Contact', placeholder: 'manager@acme.com', required: false },
    ],
  },
  {
    id: 'cold-outreach', type: 'role', emoji: '📨', name: 'Cold Outreach',
    roleBadge: 'B2B Prospecting',
    description: 'Finds leads matching your ICP, crafts personalized first-touch messages, and manages 4-step sequences across email and LinkedIn — without sounding robotic.',
    tags: ['leads', 'outreach', 'prospecting', 'B2B', 'email'],
    whatItDoes: [
      'Identifies prospects matching your ideal customer profile from public signals',
      'Crafts personalized first lines based on recent news, posts, or company activity',
      'Manages multi-step sequences with value-add follow-ups (never just "bumping this")',
      'Tracks sent, opened, replied metrics and optimizes messaging weekly',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Tags Contacts', 'Creates Deals'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'icp_title', label: 'ICP Job Titles', placeholder: 'CEO, Founder, VP of Marketing at agencies with 5-50 employees', required: false, type: 'textarea' },
      { key: 'icp_industry', label: 'ICP Industry', placeholder: 'Digital marketing agencies', required: false },
      { key: 'icp_company_size', label: 'ICP Company Size', placeholder: '5-50 employees', required: false },
      { key: 'booking_url', label: 'Booking URL', placeholder: 'https://calendly.com/your-team/discovery', required: false },
    ],
  },

  // ── GROUP B: Agency Deliverables ──────────────────────────────────────────

  {
    id: 'social-media-manager', type: 'role', emoji: '📱', name: 'Social Media Manager',
    roleBadge: 'Content & Scheduling',
    description: 'Writes platform-native posts for Twitter, LinkedIn, and Instagram, plans weekly content calendars, and tracks what performs so you can do more of it.',
    tags: ['content', 'social', 'scheduling', 'marketing'],
    whatItDoes: [
      'Writes posts adapted to each platform — punchy for Twitter, story-driven for LinkedIn',
      'Plans weekly content calendar with mix of educational, promotional, and personal',
      'Drafts replies to comments and identifies conversations worth joining',
      'Generates weekly performance report: impressions, engagement, top content',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'brand_tone', label: 'Brand Tone', placeholder: 'Professional but witty. Educational over promotional.', required: false, type: 'textarea' },
      { key: 'content_pillars', label: 'Content Pillars', placeholder: 'Industry insights\nProduct tips\nCustomer stories\nBehind the scenes', required: false, type: 'textarea' },
      { key: 'posting_frequency', label: 'Posting Frequency', placeholder: '3x/week Twitter, 2x/week LinkedIn, daily Instagram stories', required: false },
    ],
  },
  {
    id: 'brand-monitor', type: 'role', emoji: '👁️', name: 'Brand Monitor',
    roleBadge: 'Reputation Tracking',
    description: 'Watches for brand mentions across social platforms, flags negative sentiment, surfaces engagement opportunities, and delivers daily digests.',
    tags: ['social', 'monitoring', 'reputation', 'alerts'],
    whatItDoes: [
      'Monitors brand mentions across Twitter, Reddit, LinkedIn, and news',
      'Flags negative sentiment and competitor comparisons for immediate response',
      'Surfaces positive mentions worth amplifying or engaging with',
      'Delivers daily digest: total mentions, sentiment breakdown, top posts',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Sends Alerts'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'brand_keywords', label: 'Brand Keywords', placeholder: 'Acme Corp\nacmecorp\n@acmecorp\n#acme', required: false, type: 'textarea' },
      { key: 'competitors', label: 'Competitors', placeholder: 'Competitor A\nCompetitor B', required: false, type: 'textarea' },
      { key: 'alert_threshold', label: 'Alert Threshold', placeholder: 'Negative sentiment or 5+ mentions in 1 hour', required: false },
    ],
  },
  {
    id: 'email-sequence', type: 'role', emoji: '📧', name: 'Email Sequence',
    roleBadge: 'Lead Nurturing',
    description: 'Writes multi-step drip campaigns with strong subject lines, value-add content at each step, and clear CTAs — no generic "just checking in" follow-ups.',
    tags: ['email', 'nurturing', 'leads', 'content', 'marketing'],
    whatItDoes: [
      'Writes 5-7 step email sequences with escalating value per touch',
      'Crafts subject lines under 5 words that get opened',
      'Adapts tone from educational to conversion-focused as sequence progresses',
      'Generates A/B variants for subject lines and CTAs',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'sequence_goal', label: 'Sequence Goal', placeholder: 'Convert free trial users to paid plans', required: false },
      { key: 'target_persona', label: 'Target Persona', placeholder: 'SaaS founders who signed up for a free trial but haven\'t activated', required: false, type: 'textarea' },
      { key: 'cta_url', label: 'CTA URL', placeholder: 'https://app.acme.com/upgrade', required: false },
    ],
  },
  {
    id: 'content-repurposer', type: 'role', emoji: '♻️', name: 'Content Repurposer',
    roleBadge: 'Content Distribution',
    description: 'Takes one piece of content and converts it into platform-native formats: Twitter threads, LinkedIn posts, newsletter snippets, and video scripts.',
    tags: ['content', 'social', 'distribution', 'marketing'],
    whatItDoes: [
      'Converts blog posts into Twitter threads, LinkedIn posts, and newsletter snippets',
      'Adapts tone and format for each platform (not just copy-paste)',
      'Generates short-form video scripts from long-form articles',
      'Extracts 5-10 quotable moments per piece for social sharing',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'brand_voice', label: 'Brand Voice', placeholder: 'Authoritative but approachable. Data-driven. No jargon.', required: false, type: 'textarea' },
      { key: 'primary_platform', label: 'Primary Platform', placeholder: 'LinkedIn', required: false },
      { key: 'secondary_platforms', label: 'Secondary Platforms', placeholder: 'Twitter\nInstagram\nNewsletter\nYouTube Shorts', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'competitor-intelligence', type: 'role', emoji: '🔭', name: 'Competitor Intelligence',
    roleBadge: 'Market Research',
    description: 'Tracks competitor pricing, product updates, job postings, and content — and delivers weekly reports on what changed and what it means.',
    tags: ['research', 'competitors', 'reports', 'analytics'],
    whatItDoes: [
      'Tracks competitor pricing changes and product announcements daily',
      'Analyzes competitor job postings to infer strategic priorities',
      'Monitors competitor social and content for positioning shifts',
      'Delivers weekly brief: changes detected, so-what analysis, recommended responses',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'competitors', label: 'Competitors', placeholder: 'Competitor A — https://competitor-a.com\nCompetitor B — https://competitor-b.com', required: false, type: 'textarea' },
      { key: 'tracking_keywords', label: 'Tracking Keywords', placeholder: 'pricing change\nnew feature\nfunding round\nhiring', required: false, type: 'textarea' },
      { key: 'alert_frequency', label: 'Alert Frequency', placeholder: 'Weekly digest + immediate alerts for major changes', required: false },
    ],
  },
  {
    id: 'seo-writer', type: 'role', emoji: '🏆', name: 'SEO Content Writer',
    roleBadge: 'Organic Growth',
    description: 'Writes SEO-optimized content based on real keyword data, structures it for featured snippets, and optimizes existing content for rankings.',
    tags: ['seo', 'content', 'marketing', 'writing'],
    whatItDoes: [
      'Researches target keywords and maps content to search intent',
      'Writes SEO-optimized articles with proper H1/H2 structure',
      'Optimizes existing content for featured snippets and People Also Ask',
      'Generates meta titles and descriptions under character limits',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'target_industry', label: 'Target Industry', placeholder: 'Digital marketing', required: false },
      { key: 'target_location', label: 'Target Location', placeholder: 'Austin, TX', required: false },
      { key: 'primary_keywords', label: 'Primary Keywords', placeholder: 'AI marketing tools\nautomated lead generation\nSMB CRM software', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'newsletter-curator', type: 'role', emoji: '📬', name: 'Newsletter Curator',
    roleBadge: 'Email Marketing',
    description: 'Curates the best industry content, writes weekly newsletter editions with your voice, and tracks open rates to continuously improve.',
    tags: ['newsletter', 'email', 'content', 'curation'],
    whatItDoes: [
      'Scans RSS feeds, Twitter, and industry sources for relevant content weekly',
      'Writes newsletter editions with editorial voice — not just link dumps',
      'Generates 3 subject line options per edition with predicted open rates',
      'Tracks performance and adjusts content mix based on click data',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'newsletter_niche', label: 'Newsletter Niche', placeholder: 'AI and automation for small business', required: false },
      { key: 'audience_description', label: 'Audience Description', placeholder: 'SMB owners and marketing managers interested in AI tools', required: false },
      { key: 'sending_day', label: 'Sending Day', placeholder: 'Tuesday', required: false },
    ],
  },

  // ── GROUP C: Industry Verticals ───────────────────────────────────────────

  {
    id: 'real-estate-qualifier', type: 'role', emoji: '🏠', name: 'Real Estate Lead Qualifier',
    roleBadge: 'Real Estate',
    description: 'Qualifies buyer and seller leads, collects property preferences, pre-qualifies financing, and routes hot leads to the agent before they go cold.',
    tags: ['leads', 'qualification', 'real-estate', 'booking'],
    whatItDoes: [
      'Qualifies buyer leads: timeline, pre-approval status, price range, must-haves',
      'Qualifies seller leads: motivation, timeline, property condition, price expectations',
      'Books property tours and listing consultations automatically',
      'Routes hot leads to agent immediately with full qualification summary',
    ],
    channels: ['sms', 'chat', 'voice'],
    tools: ['Books Appointments', 'Tags Contacts', 'Creates Deals', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Realty', required: false },
      { key: 'agent_name', label: 'Agent Name', placeholder: 'Sarah Johnson', required: false },
      { key: 'service_area', label: 'Service Area', placeholder: 'Austin, TX metro area', required: false },
      { key: 'booking_url', label: 'Booking URL', placeholder: 'https://calendly.com/your-team', required: false },
    ],
  },
  {
    id: 'wellness-receptionist', type: 'role', emoji: '🧘', name: 'Wellness Receptionist',
    roleBadge: 'Healthcare & Wellness',
    description: 'Handles appointment scheduling for wellness businesses — spas, chiropractors, gyms, therapists — with intake pre-screening and HIPAA-aware responses.',
    tags: ['scheduling', 'healthcare', 'intake', 'booking'],
    whatItDoes: [
      'Books wellness appointments with service selection and duration',
      'Pre-screens new patients with intake questions before their visit',
      'Answers FAQs about services, pricing, insurance, and cancellation policy',
      'Never provides medical diagnoses — always recommends professional consultation',
    ],
    channels: ['sms', 'chat', 'voice'],
    tools: ['Books Appointments', 'Tags Contacts', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Serenity Wellness Center', required: false },
      { key: 'services', label: 'Services Offered', placeholder: 'Deep tissue massage — 60min\nSwedish massage — 90min\nAcupuncture — 45min', required: false, type: 'textarea' },
      { key: 'booking_url', label: 'Booking URL', placeholder: 'https://calendly.com/your-team', required: false },
      { key: 'cancellation_policy', label: 'Cancellation Policy', placeholder: '24-hour cancellation required. Late cancellations charged 50%.', required: false },
      { key: 'intake_questions', label: 'Intake Questions', placeholder: 'Any current injuries?\nAre you pregnant?\nAllergies to oils or lotions?', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'restaurant-host', type: 'role', emoji: '🍽️', name: 'Restaurant Host',
    roleBadge: 'Food & Beverage',
    description: 'Handles reservations, answers menu questions, manages waitlist, and handles special requests — so front-of-house can focus on in-person guests.',
    tags: ['scheduling', 'restaurant', 'hospitality', 'booking'],
    whatItDoes: [
      'Books reservations for any party size and notes special requests',
      'Answers questions about menu, dietary options, hours, and location',
      'Manages waitlist and sends hold/confirmation messages',
      'Handles special occasions: birthdays, anniversaries, private dining',
    ],
    channels: ['sms', 'chat', 'voice'],
    tools: ['Books Appointments', 'Tags Contacts'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Bella Cucina', required: false },
      { key: 'restaurant_name', label: 'Restaurant Name', placeholder: 'Bella Cucina Italian Kitchen', required: false },
      { key: 'business_hours', label: 'Business Hours', placeholder: 'Tue-Sun 5pm-10pm, closed Mondays', required: false },
      { key: 'booking_url', label: 'Booking URL', placeholder: 'https://resy.com/your-restaurant', required: false },
      { key: 'max_party_size', label: 'Max Party Size', placeholder: '12', required: false },
      { key: 'cuisine_type', label: 'Cuisine Type', placeholder: 'Italian', required: false },
    ],
  },
  {
    id: 'ecommerce-support', type: 'role', emoji: '📦', name: 'E-Commerce Support',
    roleBadge: 'Retail & E-Commerce',
    description: 'Handles order status, returns, shipping questions, and product inquiries — reducing support volume by 60% while keeping customer satisfaction high.',
    tags: ['support', 'ecommerce', 'returns', 'shipping'],
    whatItDoes: [
      'Answers order status, shipping, and delivery questions instantly',
      'Handles return and exchange requests per company policy',
      'Answers product questions using knowledge base',
      'Escalates damaged/lost orders and complaints to human support',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Store', required: false },
      { key: 'return_policy', label: 'Return Policy', placeholder: '30-day returns, free shipping on exchanges, refund within 5-7 business days', required: false, type: 'textarea' },
      { key: 'shipping_policy', label: 'Shipping Policy', placeholder: 'Free shipping over $50. Standard 3-5 days. Express 1-2 days.', required: false, type: 'textarea' },
      { key: 'support_email', label: 'Support Email', placeholder: 'support@acme.com', required: false },
      { key: 'escalation_contact', label: 'Escalation Contact', placeholder: 'manager@acme.com', required: false },
    ],
  },
  {
    id: 'legal-intake', type: 'role', emoji: '⚖️', name: 'Legal Intake Specialist',
    roleBadge: 'Legal Services',
    description: 'Pre-qualifies potential clients, collects case details, and books consultations — while making clear the AI is not providing legal advice.',
    tags: ['legal', 'intake', 'qualification', 'booking'],
    whatItDoes: [
      'Pre-qualifies leads by practice area, jurisdiction, and timeline',
      'Collects case details through structured intake questions',
      'Books consultation appointments with the appropriate attorney',
      'Always clarifies: AI is not providing legal advice, attorney consultation required',
    ],
    channels: ['sms', 'chat', 'voice'],
    tools: ['Books Appointments', 'Tags Contacts', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Smith & Associates Law', required: false },
      { key: 'firm_name', label: 'Firm Name', placeholder: 'Smith & Associates', required: false },
      { key: 'practice_areas', label: 'Practice Areas', placeholder: 'Personal injury\nFamily law\nEstate planning\nBusiness litigation', required: false, type: 'textarea' },
      { key: 'booking_url', label: 'Booking URL', placeholder: 'https://calendly.com/your-firm/consultation', required: false },
      { key: 'disclaimer_text', label: 'Disclaimer Text', placeholder: 'This is not legal advice. For legal counsel, please schedule a consultation with one of our attorneys.', required: false, type: 'textarea' },
    ],
  },

  // ── GROUP D: Internal Operations ──────────────────────────────────────────

  {
    id: 'pipeline-tracker', type: 'role', emoji: '💼', name: 'Pipeline Tracker',
    roleBadge: 'Sales Operations',
    description: 'Scores leads by engagement, identifies hot prospects ready for outreach, flags deals going cold, and delivers weekly pipeline reports with revenue forecasts.',
    tags: ['crm', 'leads', 'reports', 'analytics', 'sales'],
    whatItDoes: [
      'Scores leads by engagement signals: page views, email opens, feature usage',
      'Identifies hot leads and recommends personalized outreach timing',
      'Flags deals going cold with suggested re-engagement messages',
      'Delivers weekly pipeline report: new leads, active deals, closed, forecast',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Deals', 'Tags Contacts', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'crm_platform', label: 'CRM Platform', placeholder: 'GoHighLevel', required: false },
      { key: 'pipeline_stages', label: 'Pipeline Stages', placeholder: 'New Lead → Qualified → Proposal → Negotiation → Closed Won / Lost', required: false, type: 'textarea' },
      { key: 'hot_lead_threshold', label: 'Hot Lead Threshold', placeholder: 'Score 80+ or 3+ site visits in 7 days', required: false },
    ],
  },
  {
    id: 'churn-sentinel', type: 'role', emoji: '🔮', name: 'Churn Sentinel',
    roleBadge: 'Customer Retention',
    description: 'Detects at-risk customers from behavioral signals, scores churn risk, and triggers retention actions before customers cancel.',
    tags: ['retention', 'analytics', 'alerts', 'crm'],
    whatItDoes: [
      'Monitors engagement signals: login frequency, feature usage, support tickets',
      'Scores churn risk from 1-10 with explanation of driving factors',
      'Triggers personalized retention outreach at 7-day warning',
      'Reports weekly: at-risk accounts, churn probability, recommended actions',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Sends Alerts', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'risk_threshold', label: 'Risk Threshold', placeholder: 'Score 7+ out of 10 triggers intervention', required: false },
      { key: 'retention_offer', label: 'Retention Offer', placeholder: '20% discount for 3 months, free onboarding session, dedicated CSM', required: false, type: 'textarea' },
      { key: 'csm_contact', label: 'CSM Contact', placeholder: 'csm@acme.com', required: false },
    ],
  },
  {
    id: 'revenue-analyst', type: 'role', emoji: '📈', name: 'Revenue Analyst',
    roleBadge: 'Business Analytics',
    description: 'Analyzes MRR, churn, LTV, and conversion rates — and delivers weekly reports with specific recommendations, not just charts.',
    tags: ['analytics', 'reports', 'revenue', 'metrics'],
    whatItDoes: [
      'Calculates MRR, ARR, churn rate, and LTV from available data',
      'Identifies revenue trends and flags anomalies week-over-week',
      'Benchmarks metrics against industry standards for context',
      'Delivers weekly report: numbers first, insights second, recommendations third',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Web Search'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'reporting_frequency', label: 'Reporting Frequency', placeholder: 'Weekly', required: false },
      { key: 'key_metrics', label: 'Key Metrics', placeholder: 'MRR\nChurn rate\nLTV\nCAC\nConversion rate', required: false, type: 'textarea' },
      { key: 'team_channel', label: 'Team Channel', placeholder: '#revenue-updates', required: false },
    ],
  },
  {
    id: 'meeting-scheduler', type: 'role', emoji: '📅', name: 'Meeting Scheduler',
    roleBadge: 'Scheduling',
    description: 'Handles cross-timezone scheduling, proposes available slots, sends calendar invites, and manages rescheduling requests — without the email tennis.',
    tags: ['scheduling', 'calendar', 'meetings', 'productivity'],
    whatItDoes: [
      "Proposes 3 available time slots adjusted for all attendees' timezones",
      'Sends calendar invites with agenda and meeting details',
      'Handles reschedule requests gracefully with alternative options',
      'Sends 24-hour reminders and meeting prep notes',
    ],
    channels: ['chat', 'sms'],
    tools: ['Books Appointments', 'Sends Messages'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'owner_name', label: 'Owner Name', placeholder: 'John Smith', required: false },
      { key: 'calendar_url', label: 'Calendar URL', placeholder: 'https://calendly.com/your-team', required: false },
      { key: 'meeting_duration_options', label: 'Meeting Duration Options', placeholder: '15min quick sync\n30min standard\n60min deep dive', required: false },
      { key: 'timezone', label: 'Timezone', placeholder: 'US/Eastern', required: false },
    ],
  },
  {
    id: 'client-reporter', type: 'role', emoji: '📋', name: 'Client Reporter',
    roleBadge: 'Agency Reporting',
    description: "Generates professional client performance reports with metrics, wins, and next steps — so agencies can send value-packed updates without hours of work.",
    tags: ['reports', 'analytics', 'agency', 'clients'],
    whatItDoes: [
      'Compiles metrics from connected tools into a structured report',
      'Highlights wins, improvements, and areas needing attention',
      "Generates client-ready language that's clear, not jargon-heavy",
      'Sends weekly report to client via email or Telegram automatically',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Sends Messages'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Agency', required: false },
      { key: 'client_name', label: 'Client Name', placeholder: 'Widget Co', required: false },
      { key: 'report_metrics', label: 'Report Metrics', placeholder: 'Leads generated\nAds spend\nConversion rate\nRevenue attributed\nROI', required: false, type: 'textarea' },
      { key: 'sending_day', label: 'Sending Day', placeholder: 'Friday', required: false },
      { key: 'client_email', label: 'Client Email', placeholder: 'client@widgetco.com', required: false },
    ],
  },
  {
    id: 'reddit-prospector', type: 'role', emoji: '🔎', name: 'Reddit Prospector',
    roleBadge: 'Social Listening',
    description: 'Monitors subreddits for "what tool should I use" threads, drafts contextual replies that mention your product naturally, and tracks response performance.',
    tags: ['social', 'prospecting', 'content', 'outreach'],
    whatItDoes: [
      'Monitors relevant subreddits for product recommendation requests',
      'Drafts context-aware replies that add value before mentioning your solution',
      'Flags competitor mentions and comparison threads for response',
      'Tracks which subreddits and comment styles drive the most traffic',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'product_name', label: 'Product Name', placeholder: 'Acme CRM', required: false },
      { key: 'target_subreddits', label: 'Target Subreddits', placeholder: 'r/smallbusiness\nr/SaaS\nr/marketing\nr/Entrepreneur', required: false, type: 'textarea' },
      { key: 'value_proposition', label: 'Value Proposition', placeholder: 'All-in-one CRM that replaces 5 tools for SMBs at half the cost', required: false },
    ],
  },
  {
    id: 'influencer-outreach', type: 'role', emoji: '🤝', name: 'Influencer Outreach',
    roleBadge: 'Creator Marketing',
    description: 'Finds relevant micro-influencers for your niche, evaluates fit by engagement rate and audience alignment, and drafts personalized partnership pitches.',
    tags: ['outreach', 'social', 'marketing', 'influencers'],
    whatItDoes: [
      'Identifies micro-influencers with high engagement in your target niche',
      'Evaluates fit: follower count, engagement rate, audience alignment',
      'Drafts personalized partnership pitches referencing their content',
      'Tracks outreach status and follows up with 3-touch sequence',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Tags Contacts', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'target_niche', label: 'Target Niche', placeholder: 'SaaS productivity tools', required: false },
      { key: 'min_followers', label: 'Min Followers', placeholder: '5000', required: false },
      { key: 'max_followers', label: 'Max Followers', placeholder: '100000', required: false },
      { key: 'partnership_offer', label: 'Partnership Offer', placeholder: 'Free product access + 20% revenue share on referrals', required: false },
    ],
  },
  {
    id: 'data-analyst', type: 'role', emoji: '🔢', name: 'Data Analyst',
    roleBadge: 'Business Intelligence',
    description: "Turns raw data into business insights — analyzes trends, spots anomalies, answers 'why did X happen' questions, and delivers clear summaries.",
    tags: ['analytics', 'reports', 'data', 'intelligence'],
    whatItDoes: [
      'Analyzes provided data and identifies key trends and patterns',
      'Answers specific business questions with data-backed explanations',
      'Flags anomalies and provides root cause hypotheses',
      'Summarizes findings in plain language with recommended actions',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Web Search'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'primary_metrics', label: 'Primary Metrics', placeholder: 'Revenue\nConversion rate\nUser signups\nChurn\nNPS score', required: false, type: 'textarea' },
      { key: 'reporting_period', label: 'Reporting Period', placeholder: 'Weekly', required: false },
    ],
  },
  {
    id: 'onboarding-guide', type: 'role', emoji: '🚀', name: 'Customer Onboarding Guide',
    roleBadge: 'Customer Success',
    description: 'Walks new customers through activation steps, checks in at key milestones, identifies stuck users, and hands off to support when needed.',
    tags: ['onboarding', 'support', 'retention', 'customer-success'],
    whatItDoes: [
      'Guides new customers through setup steps with personalized check-ins',
      'Tracks activation milestones and flags users who are stuck',
      'Answers product questions during the critical first 30 days',
      'Escalates high-touch accounts to CSM when churn risk is detected',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Sends Messages', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'product_name', label: 'Product Name', placeholder: 'Acme CRM', required: false },
      { key: 'activation_steps', label: 'Activation Steps', placeholder: '1. Create account\n2. Import contacts\n3. Set up first pipeline\n4. Send first campaign', required: false, type: 'textarea' },
      { key: 'csm_contact', label: 'CSM Contact', placeholder: 'csm@acme.com', required: false },
      { key: 'trial_length_days', label: 'Trial Length (days)', placeholder: '14', required: false },
    ],
  },
  {
    id: 'ab-test-analyst', type: 'role', emoji: '🧪', name: 'A/B Test Analyst',
    roleBadge: 'Growth & Optimization',
    description: 'Analyzes experiment results for statistical significance, segments by user cohort, and recommends what to ship — so growth decisions are data-driven.',
    tags: ['analytics', 'testing', 'growth', 'optimization'],
    whatItDoes: [
      'Calculates statistical significance and confidence intervals for A/B tests',
      'Segments results by user cohort, device, and traffic source',
      'Identifies which variant wins and explains the likely mechanism',
      'Recommends whether to ship, iterate, or abandon the experiment',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'test_platform', label: 'Test Platform', placeholder: 'Optimizely', required: false },
      { key: 'significance_threshold', label: 'Significance Threshold', placeholder: '95%', required: false },
      { key: 'reporting_format', label: 'Reporting Format', placeholder: 'Executive summary with charts', required: false },
    ],
  },

  // ── GROUP E — HR & Recruiting ───────────────────────────────────────────────
  {
    id: 'hr-recruiter', type: 'role', emoji: '🧑‍💼', name: 'HR Recruiter',
    roleBadge: 'Talent Acquisition',
    description: 'Screens job applications, scores candidates against requirements, schedules interviews, and tracks the hiring pipeline from applied to offered.',
    tags: ['hr', 'recruiting', 'talent', 'hiring'],
    whatItDoes: [
      'Screens job applications and scores candidates against requirements',
      'Schedules interviews and sends calendar invites',
      'Drafts job descriptions and outreach messages',
      'Tracks pipeline: applied → screened → interviewed → offered',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Books Appointments', 'Tags Contacts', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'open_roles', label: 'Open Roles', placeholder: 'Senior Engineer\nProduct Manager\nDesigner', required: false, type: 'textarea' },
      { key: 'required_skills', label: 'Required Skills', placeholder: '3+ years experience\nRelevant degree\nPortfolio required', required: false, type: 'textarea' },
      { key: 'interview_process', label: 'Interview Process', placeholder: 'Phone screen → Technical interview → Culture fit → Offer', required: false },
    ],
  },
  {
    id: 'hr-onboarding', type: 'role', emoji: '🎉', name: 'Employee Onboarding',
    roleBadge: 'HR Onboarding',
    description: 'Walks new hires through first-week checklist and paperwork, answers policy questions, schedules orientation, and checks in at day 7, 30, and 90.',
    tags: ['hr', 'onboarding', 'new-hire', 'employees'],
    whatItDoes: [
      'Walks new hires through first-week checklist and paperwork',
      'Answers questions about policies, benefits, and tools',
      'Schedules orientation meetings and introductions',
      'Checks in at day 7, day 30, and day 90',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Books Appointments', 'Tags Contacts', 'Sends Messages'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'company_values', label: 'Company Values', placeholder: 'Innovation, transparency, customer obsession', required: false },
      { key: 'first_week_checklist', label: 'First Week Checklist', placeholder: 'Sign offer letter\nSet up email\nMeet your team\nComplete compliance training', required: false, type: 'textarea' },
      { key: 'key_tools', label: 'Key Tools', placeholder: 'Slack, Notion, GitHub, Figma', required: false, type: 'textarea' },
      { key: 'hr_contact', label: 'HR Contact', placeholder: 'hr@acme.com', required: false },
    ],
  },

  // ── GROUP F — Creative ──────────────────────────────────────────────────────
  {
    id: 'copywriter', type: 'role', emoji: '✍️', name: 'Copywriter',
    roleBadge: 'Conversion Copywriting',
    description: 'Writes conversion-focused copy for ads, landing pages, and emails. Tests different angles and generates A/B variants for headlines and CTAs.',
    tags: ['content', 'writing', 'ads', 'conversion', 'copy'],
    whatItDoes: [
      'Writes conversion-focused copy for ads, landing pages, and emails',
      'Tests different angles: pain-focused, benefit-focused, social proof',
      'Adapts tone for brand voice while optimizing for conversion',
      'Generates A/B variants for headlines and CTAs',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Web Search'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'brand_tone', label: 'Brand Tone', placeholder: 'Professional but friendly, conversational', required: false },
      { key: 'target_audience', label: 'Target Audience', placeholder: 'Small business owners aged 30-50', required: false },
      { key: 'product_name', label: 'Product Name', placeholder: 'Acme CRM', required: false },
      { key: 'key_benefits', label: 'Key Benefits', placeholder: 'Save 10 hours/week\nIncrease revenue 30%\nNo technical skills needed', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'video-scripter', type: 'role', emoji: '🎬', name: 'Video Scripter',
    roleBadge: 'Video Production',
    description: 'Writes scripts for YouTube, TikTok, Instagram Reels, and ads with hooks, value sections, and CTAs in platform-native formats.',
    tags: ['content', 'video', 'script', 'social', 'youtube', 'tiktok'],
    whatItDoes: [
      'Writes scripts for YouTube, TikTok, Instagram Reels, and ads',
      'Structures content with hook, value, and CTA in platform-native formats',
      'Adapts long-form content into short-form scripts under 60 seconds',
      'Writes voiceover scripts with timing and visual direction notes',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'video_length', label: 'Video Length', placeholder: '60 seconds', required: false },
      { key: 'platform', label: 'Platform', placeholder: 'YouTube', required: false },
      { key: 'audience_description', label: 'Audience Description', placeholder: 'Entrepreneurs looking to scale', required: false },
      { key: 'call_to_action', label: 'Call to Action', placeholder: 'Book a free demo at acme.com', required: false },
    ],
  },
  {
    id: 'podcast-producer', type: 'role', emoji: '🎙️', name: 'Podcast Producer',
    roleBadge: 'Podcast & Audio',
    description: 'Generates episode outlines, interview questions, show notes, timestamps, and promotional social clips for podcast production.',
    tags: ['content', 'podcast', 'audio', 'interview', 'show-notes'],
    whatItDoes: [
      'Generates episode outlines, interview questions, and talking points',
      'Writes show notes, timestamps, and episode descriptions',
      'Creates audiogram scripts and promotional social clips',
      'Suggests episode topics based on audience trends',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'podcast_name', label: 'Podcast Name', placeholder: 'The Growth Show', required: false },
      { key: 'target_audience', label: 'Target Audience', placeholder: 'SaaS founders and marketers', required: false },
      { key: 'episode_length', label: 'Episode Length', placeholder: '30 minutes', required: false },
      { key: 'podcast_niche', label: 'Podcast Niche', placeholder: 'B2B SaaS growth strategies', required: false },
    ],
  },

  // ── GROUP G — SaaS Operations ───────────────────────────────────────────────
  {
    id: 'saas-churn-prevention', type: 'role', emoji: '🔒', name: 'Churn Prevention',
    roleBadge: 'SaaS Retention',
    description: 'Identifies at-risk SaaS users from behavioral signals, sends personalized re-engagement messages, and tracks recovery rate.',
    tags: ['saas', 'retention', 'churn', 'reengagement', 'customer-success'],
    whatItDoes: [
      'Identifies at-risk SaaS users from behavioral signals',
      'Sends personalized re-engagement messages at the right moment',
      'Offers relevant help, tips, or escalation to success team',
      'Tracks recovery rate: how many at-risk users became active again',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Sends Messages', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'product_name', label: 'Product Name', placeholder: 'Acme CRM', required: false },
      { key: 'activation_benchmark', label: 'Activation Benchmark', placeholder: '3 logins in first 7 days', required: false },
      { key: 'owner_name', label: 'Owner Name', placeholder: 'John Smith', required: false },
      { key: 'csm_contact', label: 'CSM Contact', placeholder: 'csm@acme.com', required: false },
    ],
  },
  {
    id: 'feature-request-manager', type: 'role', emoji: '💡', name: 'Feature Request Manager',
    roleBadge: 'Product Feedback',
    description: 'Collects and triages feature requests from customers, links similar requests, tracks volume, and routes high-impact requests to the product team.',
    tags: ['saas', 'product', 'feedback', 'features', 'customer-success'],
    whatItDoes: [
      'Collects and triages feature requests from customers',
      'Links similar requests together and tracks request volume',
      'Sets clear expectations: "This is logged and reviewed quarterly"',
      'Routes high-impact requests to product team with context',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Escalates to Human', 'Creates Reports'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'product_name', label: 'Product Name', placeholder: 'Acme CRM', required: false },
      { key: 'roadmap_process', label: 'Roadmap Process', placeholder: 'Requests reviewed quarterly by product team', required: false },
      { key: 'feedback_email', label: 'Feedback Email', placeholder: 'feedback@acme.com', required: false },
    ],
  },
  {
    id: 'usage-analytics-agent', type: 'role', emoji: '🔬', name: 'Usage Analytics',
    roleBadge: 'Product Intelligence',
    description: 'Analyzes feature adoption and usage patterns, identifies power users and inactive accounts, and delivers weekly product health reports.',
    tags: ['saas', 'analytics', 'product', 'usage', 'adoption'],
    whatItDoes: [
      'Analyzes feature adoption and usage patterns',
      'Identifies power users, casual users, and inactive accounts',
      'Flags features with low adoption that need improvement',
      'Weekly product health report with retention and engagement metrics',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Web Search'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'product_name', label: 'Product Name', placeholder: 'Acme CRM', required: false },
      { key: 'key_features', label: 'Key Features', placeholder: 'Dashboard\nPipeline\nEmail campaigns\nReporting', required: false, type: 'textarea' },
      { key: 'reporting_period', label: 'Reporting Period', placeholder: 'Weekly', required: false },
    ],
  },

  // ── GROUP H — Finance & Invoicing ───────────────────────────────────────────
  {
    id: 'invoice-manager', type: 'role', emoji: '🧾', name: 'Invoice Manager',
    roleBadge: 'Finance & Billing',
    description: 'Tracks outstanding invoices, sends payment reminders with escalating urgency, and flags overdue invoices past 30/60/90 days for human follow-up.',
    tags: ['finance', 'invoicing', 'payments', 'billing', 'accounts-receivable'],
    whatItDoes: [
      'Tracks outstanding invoices and sends payment reminders',
      'Follows up on overdue payments with escalating urgency',
      'Generates invoice summaries: paid, pending, overdue',
      'Flags invoices past 30/60/90 days for human follow-up',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Sends Messages', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'payment_terms', label: 'Payment Terms', placeholder: 'Net 30', required: false },
      { key: 'late_fee_policy', label: 'Late Fee Policy', placeholder: '1.5% per month after 30 days', required: false },
      { key: 'escalation_contact', label: 'Escalation Contact', placeholder: 'accounting@acme.com', required: false },
    ],
  },
  {
    id: 'expense-tracker', type: 'role', emoji: '💳', name: 'Expense Tracker',
    roleBadge: 'Finance & Budgeting',
    description: 'Categorizes expenses, tracks against budget, alerts when spending approaches limits, and generates weekly expense reports by category.',
    tags: ['finance', 'expenses', 'budget', 'accounting', 'reports'],
    whatItDoes: [
      'Categorizes expenses and tracks against budget',
      'Alerts when spending approaches category limits',
      'Generates weekly expense reports by category',
      'Flags unusual transactions for review',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Sends Messages'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'budget_categories', label: 'Budget Categories', placeholder: 'Marketing\nSoftware\nTravel\nOffice supplies', required: false, type: 'textarea' },
      { key: 'monthly_budget', label: 'Monthly Budget', placeholder: '$10,000', required: false },
      { key: 'alert_threshold_pct', label: 'Alert Threshold %', placeholder: '80', required: false },
    ],
  },

  // ── GROUP I — Freelance Operations ──────────────────────────────────────────
  {
    id: 'proposal-writer', type: 'role', emoji: '📄', name: 'Proposal Writer',
    roleBadge: 'Freelance Operations',
    description: 'Writes project proposals with executive summary, deliverables, timeline, and pricing options. Creates follow-up sequences for sent proposals.',
    tags: ['freelance', 'proposals', 'sales', 'pricing', 'client-management'],
    whatItDoes: [
      'Writes project proposals based on scope and client brief',
      'Structures proposals with executive summary, deliverables, timeline, and pricing',
      'Generates pricing options (basic, standard, premium)',
      'Creates follow-up sequences for proposals sent but not replied',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'owner_name', label: 'Owner Name', placeholder: 'John Smith', required: false },
      { key: 'service_offerings', label: 'Service Offerings', placeholder: 'Web design\nSEO\nPaid ads\nContent strategy', required: false, type: 'textarea' },
      { key: 'typical_timeline', label: 'Typical Timeline', placeholder: '2-4 weeks', required: false },
      { key: 'payment_terms', label: 'Payment Terms', placeholder: '50% upfront, 50% on completion', required: false },
    ],
  },
  {
    id: 'client-success-manager', type: 'role', emoji: '💎', name: 'Client Success Manager',
    roleBadge: 'Client Relations',
    description: 'Checks in with clients at key milestones, collects feedback proactively, handles scope questions, and requests referrals after project completion.',
    tags: ['client', 'retention', 'satisfaction', 'freelance', 'agency'],
    whatItDoes: [
      'Checks in with clients at key project milestones',
      'Collects feedback and satisfaction scores proactively',
      'Handles scope questions and change requests professionally',
      'Sends project completion summaries and requests referrals',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Sends Messages', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'owner_name', label: 'Owner Name', placeholder: 'John Smith', required: false },
      { key: 'project_stages', label: 'Project Stages', placeholder: 'Kickoff → Design → Development → Review → Launch', required: false, type: 'textarea' },
      { key: 'referral_incentive', label: 'Referral Incentive', placeholder: '10% off next project', required: false },
    ],
  },

  // ── GROUP J — Education ─────────────────────────────────────────────────────
  {
    id: 'language-tutor', type: 'role', emoji: '🌍', name: 'Language Tutor',
    roleBadge: 'Education',
    description: 'Teaches vocabulary, grammar, and conversation in the target language. Adapts lessons to student level and sends daily practice exercises.',
    tags: ['education', 'language', 'tutoring', 'learning', 'practice'],
    whatItDoes: [
      'Teaches vocabulary, grammar, and conversation in target language',
      'Adapts lessons to student level and learning pace',
      'Sends daily practice exercises via SMS or chat',
      'Tracks progress and adjusts difficulty over time',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Sends Messages'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Language School', required: false },
      { key: 'target_language', label: 'Target Language', placeholder: 'Spanish', required: false },
      { key: 'student_level', label: 'Student Level', placeholder: 'Beginner', required: false },
      { key: 'daily_practice_time', label: 'Daily Practice Time', placeholder: '15 minutes', required: false },
      { key: 'curriculum_focus', label: 'Curriculum Focus', placeholder: 'Conversational Spanish for travel', required: false },
    ],
  },
  {
    id: 'student-tutor', type: 'role', emoji: '📚', name: 'Student Tutor',
    roleBadge: 'Education',
    description: 'Explains concepts with examples and analogies, creates practice problems, builds study plans, and adapts teaching style to student needs.',
    tags: ['education', 'tutoring', 'students', 'learning', 'study'],
    whatItDoes: [
      'Explains concepts clearly with examples and analogies',
      'Creates practice problems and checks answers',
      'Builds study plans and sends daily reminders',
      'Adapts teaching style to student questions and confusion',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Sends Messages'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Tutoring', required: false },
      { key: 'subject_areas', label: 'Subject Areas', placeholder: 'Math\nScience\nEnglish\nHistory', required: false, type: 'textarea' },
      { key: 'grade_level', label: 'Grade Level', placeholder: 'High school', required: false },
      { key: 'study_schedule', label: 'Study Schedule', placeholder: 'Mon/Wed/Fri after school', required: false },
      { key: 'practice_frequency', label: 'Practice Frequency', placeholder: 'Daily', required: false },
    ],
  },

  // ── GROUP K — Supply Chain ──────────────────────────────────────────────────
  {
    id: 'inventory-manager', type: 'role', emoji: '🗃️', name: 'Inventory Manager',
    roleBadge: 'Supply Chain',
    description: 'Tracks stock levels, sends low-inventory alerts, forecasts reorder timing based on sales velocity, and delivers weekly inventory health reports.',
    tags: ['inventory', 'supply-chain', 'logistics', 'stock', 'reorder'],
    whatItDoes: [
      'Tracks stock levels and sends low-inventory alerts',
      'Forecasts reorder timing based on sales velocity',
      'Identifies slow-moving items and overstock situations',
      'Weekly inventory health report with reorder recommendations',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Sends Messages', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Supply', required: false },
      { key: 'product_categories', label: 'Product Categories', placeholder: 'Electronics\nClothing\nFood & Beverage', required: false, type: 'textarea' },
      { key: 'reorder_threshold', label: 'Reorder Threshold', placeholder: '20 units', required: false },
      { key: 'supplier_contact', label: 'Supplier Contact', placeholder: 'orders@supplier.com', required: false },
    ],
  },

  // ── GROUP L — Business ────────────────────────────────────────────────────
  {
    id: 'deal-forecaster', type: 'role', emoji: '📡', name: 'Deal Forecaster',
    roleBadge: 'Sales Intelligence',
    description: 'Scores deals by close probability, flags stale deals, forecasts MRR from your current pipeline, and identifies which deals to prioritize this week.',
    tags: ['sales', 'pipeline', 'forecasting', 'crm', 'deals'],
    whatItDoes: [
      'Scores deals by close probability using pipeline signals',
      'Flags deals going stale with suggested next actions',
      'Revenue forecast: expected MRR from current pipeline',
      'Identifies which deals to prioritize this week',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Deals', 'Tags Contacts', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'pipeline_stages', label: 'Pipeline Stages', placeholder: 'Discovery\nProposal Sent\nNegotiation\nClosed Won\nClosed Lost', required: false, type: 'textarea' },
      { key: 'close_criteria', label: 'Close Criteria', placeholder: 'Budget confirmed, decision maker engaged, timeline under 30 days...', required: false, type: 'textarea' },
      { key: 'forecast_period', label: 'Forecast Period', placeholder: '30 days', required: false },
    ],
  },
  {
    id: 'personal-crm', type: 'role', emoji: '👤', name: 'Personal CRM',
    roleBadge: 'Relationship Management',
    description: 'Tracks relationships and follow-up reminders, logs conversation details, nudges when contacts go quiet, and surfaces who to reconnect with based on deal stage.',
    tags: ['crm', 'relationships', 'follow-up', 'networking'],
    whatItDoes: [
      'Tracks relationships and follow-up reminders',
      'Logs key conversation details and next steps',
      'Sends nudges when contacts have gone quiet too long',
      'Surfaces who to reconnect with based on deal stage',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Creates Deals', 'Sends Messages'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'follow_up_intervals', label: 'Follow-Up Intervals', placeholder: '3 days, 7 days, 14 days', required: false },
      { key: 'contact_categories', label: 'Contact Categories', placeholder: 'Prospects\nClients\nPartners\nVendors\nPersonal', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'competitor-pricing', type: 'role', emoji: '💲', name: 'Competitor Pricing',
    roleBadge: 'Competitive Intelligence',
    description: 'Monitors competitor pricing changes daily, alerts on price shifts, compares positioning across features and target market, and delivers weekly pricing landscape reports.',
    tags: ['competitors', 'pricing', 'intelligence', 'market-research'],
    whatItDoes: [
      'Monitors competitor pricing changes daily',
      'Alerts when a competitor raises or drops prices',
      'Compares positioning: features vs. price vs. target market',
      'Weekly pricing landscape report with recommendations',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Creates Reports', 'Sends Alerts'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'competitors', label: 'Competitors', placeholder: 'Competitor A — product.com\nCompetitor B — rival.io', required: false, type: 'textarea' },
      { key: 'your_pricing', label: 'Your Pricing', placeholder: '$49/mo Starter, $99/mo Pro, $249/mo Enterprise', required: false },
      { key: 'check_frequency', label: 'Check Frequency', placeholder: 'Daily', required: false },
    ],
  },

  // ── GROUP M — E-Commerce ──────────────────────────────────────────────────
  {
    id: 'inventory-tracker', type: 'role', emoji: '🔄', name: 'Inventory Tracker',
    roleBadge: 'E-Commerce Operations',
    description: 'Tracks stock levels across products and variants, sends low-stock alerts, identifies best-sellers and slow movers, and forecasts reorder dates based on sales velocity.',
    tags: ['inventory', 'ecommerce', 'stock', 'operations', 'supply-chain'],
    whatItDoes: [
      'Tracks stock levels across products and variants',
      'Sends low-stock alerts before items run out',
      'Identifies best-sellers and slow movers',
      'Forecasts reorder dates based on sales velocity',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Sends Alerts', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Store', required: false },
      { key: 'product_categories', label: 'Product Categories', placeholder: 'Electronics\nClothing\nAccessories', required: false, type: 'textarea' },
      { key: 'low_stock_threshold', label: 'Low Stock Threshold', placeholder: '10 units', required: false },
      { key: 'reorder_lead_days', label: 'Reorder Lead Days', placeholder: '7', required: false },
    ],
  },
  {
    id: 'pricing-optimizer', type: 'role', emoji: '💹', name: 'Pricing Optimizer',
    roleBadge: 'Dynamic Pricing',
    description: 'Analyzes price elasticity from sales data, suggests optimal prices by product and segment, monitors competitor prices, and tests pricing hypotheses.',
    tags: ['pricing', 'ecommerce', 'optimization', 'revenue', 'strategy'],
    whatItDoes: [
      'Analyzes price elasticity from sales data',
      'Suggests optimal prices by product and segment',
      'Monitors competitor prices and flags opportunities',
      'Tests pricing hypotheses and measures impact',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Store', required: false },
      { key: 'product_catalog', label: 'Product Catalog', placeholder: 'Widget A — $29\nWidget B — $49\nWidget C — $99', required: false, type: 'textarea' },
      { key: 'margin_target', label: 'Margin Target', placeholder: '40%', required: false },
      { key: 'competitor_urls', label: 'Competitor URLs', placeholder: 'competitor1.com/pricing\ncompetitor2.com/plans', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'product-lister', type: 'role', emoji: '🏷️', name: 'Product Lister',
    roleBadge: 'E-Commerce Content',
    description: 'Writes SEO-optimized product titles and descriptions, creates bullet points highlighting features and benefits, and adapts listings for different platforms.',
    tags: ['ecommerce', 'content', 'seo', 'product', 'listings'],
    whatItDoes: [
      'Writes SEO-optimized product titles and descriptions',
      'Creates bullet points that highlight key features and benefits',
      'Adapts listings for different platforms (Amazon, Shopify, Etsy)',
      'Generates alt text and meta descriptions for product images',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Web Search'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Store', required: false },
      { key: 'product_type', label: 'Product Type', placeholder: 'Handmade jewelry', required: false },
      { key: 'platform', label: 'Platform', placeholder: 'Shopify', required: false },
      { key: 'brand_voice', label: 'Brand Voice', placeholder: 'Friendly, premium, eco-conscious', required: false },
      { key: 'key_features', label: 'Key Features', placeholder: 'Handcrafted\n100% recycled materials\nLifetime warranty', required: false, type: 'textarea' },
    ],
  },

  // ── GROUP N — Data & Analytics ────────────────────────────────────────────
  {
    id: 'sql-assistant', type: 'role', emoji: '🗄️', name: 'SQL Assistant',
    roleBadge: 'Data & Analytics',
    description: 'Writes SQL queries from plain-English descriptions, optimizes slow queries, generates reports from database schemas, and documents queries with clear comments.',
    tags: ['data', 'sql', 'database', 'analytics', 'engineering'],
    whatItDoes: [
      'Writes SQL queries from plain-English descriptions',
      'Optimizes slow queries and explains execution plans',
      'Generates reports from database schemas',
      'Documents queries with clear comments',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'database_type', label: 'Database Type', placeholder: 'PostgreSQL', required: false },
      { key: 'schema_description', label: 'Schema Description', placeholder: 'Users table, Orders table, Products table with foreign keys...', required: false, type: 'textarea' },
      { key: 'common_tables', label: 'Common Tables', placeholder: 'users\norders\nproducts\ninvoices', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'report-generator', type: 'role', emoji: '📑', name: 'Report Generator',
    roleBadge: 'Business Reporting',
    description: 'Compiles data from multiple sources into structured reports, formats for different audiences, highlights key metrics and anomalies, and sends automated reports on schedule.',
    tags: ['reports', 'analytics', 'data', 'business-intelligence'],
    whatItDoes: [
      'Compiles data from multiple sources into structured reports',
      'Formats reports for different audiences: exec summary vs. detailed',
      'Highlights key metrics, trends, and anomalies',
      'Sends automated reports on schedule',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Sends Messages'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'report_type', label: 'Report Type', placeholder: 'Weekly performance', required: false },
      { key: 'data_sources', label: 'Data Sources', placeholder: 'CRM\nGoogle Analytics\nStripe\nAd platforms', required: false, type: 'textarea' },
      { key: 'audience', label: 'Audience', placeholder: 'Executive team', required: false },
      { key: 'frequency', label: 'Frequency', placeholder: 'Weekly', required: false },
    ],
  },
  {
    id: 'dashboard-builder', type: 'role', emoji: '🖥️', name: 'Dashboard Designer',
    roleBadge: 'Business Intelligence',
    description: 'Designs KPI dashboards from business requirements, maps metrics to visualization types, creates dashboard specs for dev handoff, and identifies which metrics matter most.',
    tags: ['data', 'dashboards', 'analytics', 'visualization', 'kpi'],
    whatItDoes: [
      'Designs KPI dashboards from business requirements',
      'Maps metrics to visualization types (bar, line, funnel)',
      'Creates dashboard specs ready for dev handoff',
      'Identifies which metrics matter most for each stakeholder',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'business_goals', label: 'Business Goals', placeholder: 'Increase MRR to $100k\nReduce churn below 5%\nScale to 1000 users', required: false, type: 'textarea' },
      { key: 'key_stakeholders', label: 'Key Stakeholders', placeholder: 'CEO\nVP Sales\nMarketing Manager', required: false, type: 'textarea' },
      { key: 'primary_metrics', label: 'Primary Metrics', placeholder: 'MRR\nChurn rate\nCAC\nLTV', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'data-cleaner', type: 'role', emoji: '🧹', name: 'Data Cleaner',
    roleBadge: 'Data Quality',
    description: 'Identifies duplicates, nulls, and format inconsistencies, standardizes data formats, generates data quality reports, and creates validation rules.',
    tags: ['data', 'quality', 'cleaning', 'database', 'operations'],
    whatItDoes: [
      'Identifies duplicates, nulls, and format inconsistencies',
      'Standardizes data formats (phone, email, date, address)',
      'Generates data quality reports with fix recommendations',
      'Creates data validation rules to prevent future issues',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'data_sources', label: 'Data Sources', placeholder: 'CRM contacts\nEmail list\nOrder history', required: false, type: 'textarea' },
      { key: 'critical_fields', label: 'Critical Fields', placeholder: 'email\nphone\ncompany_name\naddress', required: false, type: 'textarea' },
      { key: 'output_format', label: 'Output Format', placeholder: 'CSV', required: false },
    ],
  },

  // ── GROUP O — SaaS ────────────────────────────────────────────────────────
  {
    id: 'release-notes-writer', type: 'role', emoji: '📢', name: 'Release Notes Writer',
    roleBadge: 'Product Communication',
    description: 'Turns technical changelogs into user-friendly release notes, categorizes changes, adapts tone for different audiences, and creates email announcements.',
    tags: ['saas', 'product', 'communication', 'content', 'changelog'],
    whatItDoes: [
      'Turns technical changelogs into user-friendly release notes',
      'Categorizes changes: new features, improvements, bug fixes',
      'Adapts tone for different audiences (devs vs. end users)',
      'Creates email announcements and in-app notifications',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme SaaS', required: false },
      { key: 'product_name', label: 'Product Name', placeholder: 'AcmeApp', required: false },
      { key: 'audience_type', label: 'Audience Type', placeholder: 'End users', required: false },
      { key: 'tone_guide', label: 'Tone Guide', placeholder: 'Friendly, clear, non-technical', required: false },
      { key: 'changelog_format', label: 'Changelog Format', placeholder: 'Markdown bullet list', required: false },
    ],
  },
  {
    id: 'saas-onboarding-flow', type: 'role', emoji: '🚪', name: 'SaaS Onboarding',
    roleBadge: 'User Activation',
    description: 'Guides new users through key activation steps, sends personalized tips based on behavior, identifies stuck users before they churn, and escalates high-value accounts.',
    tags: ['saas', 'onboarding', 'activation', 'customer-success', 'retention'],
    whatItDoes: [
      'Guides new users through key activation steps',
      'Sends personalized tips based on user behavior',
      'Identifies and helps stuck users before they churn',
      'Escalates high-value accounts to success team',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: ['Tags Contacts', 'Sends Messages', 'Escalates to Human'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme SaaS', required: false },
      { key: 'product_name', label: 'Product Name', placeholder: 'AcmeApp', required: false },
      { key: 'activation_milestone', label: 'Activation Milestone', placeholder: 'Complete first project', required: false },
      { key: 'trial_length_days', label: 'Trial Length (Days)', placeholder: '14', required: false },
      { key: 'csm_threshold', label: 'CSM Escalation Threshold', placeholder: 'Enterprise plan or 50+ seats', required: false },
    ],
  },

  // ── GROUP P — Real Estate ─────────────────────────────────────────────────
  {
    id: 'listing-scout', type: 'role', emoji: '🏘️', name: 'Listing Scout',
    roleBadge: 'Real Estate Research',
    description: 'Finds listings matching buyer criteria from public sources, monitors new listings and price drops daily, compares properties side-by-side, and alerts buyer clients.',
    tags: ['real-estate', 'listings', 'research', 'buyer', 'property'],
    whatItDoes: [
      'Finds listings matching buyer criteria from public sources',
      'Monitors new listings and price drops daily',
      'Compares properties side-by-side on key criteria',
      'Alerts buyer clients when a match comes to market',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Tags Contacts', 'Sends Messages'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Realty', required: false },
      { key: 'service_area', label: 'Service Area', placeholder: 'Austin, TX metro area', required: false },
      { key: 'buyer_criteria', label: 'Buyer Criteria', placeholder: '3+ bedrooms\nUnder $500k\nGood school district\nBuilt after 2010', required: false, type: 'textarea' },
      { key: 'alert_frequency', label: 'Alert Frequency', placeholder: 'Daily', required: false },
    ],
  },
  {
    id: 'market-analyzer-realestate', type: 'role', emoji: '📐', name: 'Market Analyzer',
    roleBadge: 'Real Estate Intelligence',
    description: 'Analyzes local market trends (median prices, days on market, inventory), compares neighborhood performance, identifies buyer vs. seller conditions, and generates market reports.',
    tags: ['real-estate', 'market', 'analytics', 'investment', 'research'],
    whatItDoes: [
      'Analyzes local market trends: median prices, days on market, inventory',
      'Compares neighborhood performance over time',
      'Identifies buyer vs. seller market conditions',
      'Generates market reports for client presentations',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Web Search', 'Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Realty', required: false },
      { key: 'service_area', label: 'Service Area', placeholder: 'Austin, TX metro area', required: false },
      { key: 'report_frequency', label: 'Report Frequency', placeholder: 'Weekly', required: false },
      { key: 'key_metrics', label: 'Key Metrics', placeholder: 'Median price\nDays on market\nInventory levels\nPrice per sqft', required: false, type: 'textarea' },
    ],
  },

  // ── GROUP Q — HR ──────────────────────────────────────────────────────────
  {
    id: 'performance-reviewer', type: 'role', emoji: '🏅', name: 'Performance Reviewer',
    roleBadge: 'HR Performance',
    description: 'Generates structured performance review templates by role, helps managers write balanced feedback, tracks goal progress, and summarizes team performance trends.',
    tags: ['hr', 'performance', 'reviews', 'management', 'feedback'],
    whatItDoes: [
      'Generates structured performance review templates by role',
      'Helps managers write balanced, specific feedback',
      'Tracks goal progress and milestone completion',
      'Summarizes team performance trends for leadership',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Tags Contacts'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'review_cycle', label: 'Review Cycle', placeholder: 'Quarterly', required: false },
      { key: 'roles', label: 'Roles', placeholder: 'Software Engineer\nDesigner\nProduct Manager\nSales Rep', required: false, type: 'textarea' },
      { key: 'competency_framework', label: 'Competency Framework', placeholder: 'Technical skills\nCommunication\nLeadership\nProblem solving', required: false, type: 'textarea' },
    ],
  },

  // ── GROUP R — Customer Success Voice ───────────────────────────────────────
  {
    id: 'voicemail-transcriber', type: 'role', emoji: '☎️', name: 'Voicemail Transcriber',
    roleBadge: 'Voice Intelligence',
    description: 'Transcribes voicemails to text and categorizes by intent, drafts callback responses, flags urgent messages for human follow-up, and logs all voicemails in CRM.',
    tags: ['voice', 'voicemail', 'transcription', 'customer-success', 'support'],
    whatItDoes: [
      'Transcribes voicemails to text and categorizes by intent',
      'Drafts callback responses based on voicemail content',
      'Flags urgent messages for immediate human follow-up',
      'Logs all voicemails with transcripts in CRM',
    ],
    channels: ['voice', 'sms', 'chat'],
    tools: ['Tags Contacts', 'Escalates to Human', 'Creates Reports'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'business_hours', label: 'Business Hours', placeholder: 'Mon-Fri 9am-5pm EST', required: false },
      { key: 'urgent_keywords', label: 'Urgent Keywords', placeholder: 'emergency\ncancel\nrefund\nlegal\ncomplaint', required: false, type: 'textarea' },
      { key: 'callback_sla', label: 'Callback SLA', placeholder: '2 hours', required: false },
    ],
  },
  {
    id: 'interview-screener', type: 'role', emoji: '🎤', name: 'Interview Screener',
    roleBadge: 'Voice Screening',
    description: 'Conducts structured phone screens for job candidates, asks role-specific screening questions, scores candidates on required criteria, and schedules next-round interviews.',
    tags: ['hr', 'recruiting', 'screening', 'voice', 'interviews'],
    whatItDoes: [
      'Conducts structured phone screens for job candidates',
      'Asks role-specific screening questions consistently',
      'Scores candidates on required criteria',
      'Schedules next-round interviews for qualified candidates',
    ],
    channels: ['voice', 'sms', 'chat'],
    tools: ['Books Appointments', 'Tags Contacts', 'Creates Reports'],
    useCase: 'customer-facing',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'role_title', label: 'Role Title', placeholder: 'Senior Software Engineer', required: false },
      { key: 'screening_questions', label: 'Screening Questions', placeholder: 'Years of experience?\nCurrent salary expectations?\nAvailability to start?', required: false, type: 'textarea' },
      { key: 'minimum_requirements', label: 'Minimum Requirements', placeholder: '3+ years experience\nBachelor\'s degree\nUS work authorization', required: false, type: 'textarea' },
      { key: 'booking_url', label: 'Booking URL', placeholder: 'https://calendly.com/hiring-team/interview', required: false },
    ],
  },

  // ── GROUP S — Compliance ──────────────────────────────────────────────────
  {
    id: 'gdpr-auditor', type: 'role', emoji: '🇪🇺', name: 'GDPR Auditor',
    roleBadge: 'Compliance',
    description: 'Reviews data handling practices against GDPR requirements, identifies compliance gaps, drafts privacy policies, and creates GDPR compliance checklists.',
    tags: ['compliance', 'gdpr', 'privacy', 'legal', 'audit'],
    whatItDoes: [
      'Reviews data handling practices against GDPR requirements',
      'Identifies compliance gaps and prioritizes remediation',
      'Drafts privacy policies and data processing agreements',
      'Creates GDPR compliance checklists and audit trails',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'business_country', label: 'Business Country', placeholder: 'Germany', required: false },
      { key: 'data_types_processed', label: 'Data Types Processed', placeholder: 'Customer emails\nPayment info\nHealth records\nEmployee data', required: false, type: 'textarea' },
      { key: 'legal_basis', label: 'Legal Basis', placeholder: 'Consent', required: false },
    ],
  },
  {
    id: 'ai-policy-writer', type: 'role', emoji: '📜', name: 'AI Policy Writer',
    roleBadge: 'AI Governance',
    description: 'Drafts AI use policies for internal and external use, creates responsible AI guidelines, adapts policies to industry regulations, and reviews existing policies for gaps.',
    tags: ['compliance', 'ai-governance', 'policy', 'legal', 'risk'],
    whatItDoes: [
      'Drafts AI use policies for internal and external use',
      'Creates responsible AI guidelines and acceptable use policies',
      'Adapts policies to industry regulations (healthcare, finance, education)',
      'Reviews existing policies for gaps and updates',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Web Search'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'industry', label: 'Industry', placeholder: 'Healthcare', required: false },
      { key: 'ai_use_cases', label: 'AI Use Cases', placeholder: 'Customer support chatbot\nContent generation\nData analysis\nLead scoring', required: false, type: 'textarea' },
      { key: 'jurisdiction', label: 'Jurisdiction', placeholder: 'United States', required: false },
    ],
  },
  {
    id: 'security-phishing-detector', type: 'role', emoji: '🎣', name: 'Phishing Detector',
    roleBadge: 'Security',
    description: 'Analyzes suspicious emails and URLs for phishing indicators, scores threat level, generates security awareness training content, and creates incident reports.',
    tags: ['security', 'phishing', 'email', 'threats', 'training'],
    whatItDoes: [
      'Analyzes suspicious emails and URLs for phishing indicators',
      'Scores threat level and explains red flags found',
      'Generates employee security awareness training content',
      'Creates incident reports for detected phishing attempts',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Sends Alerts'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'email_domains', label: 'Email Domains', placeholder: 'acme.com\nacme.io', required: false, type: 'textarea' },
      { key: 'incident_contact', label: 'Incident Contact', placeholder: 'security@acme.com', required: false },
      { key: 'escalation_process', label: 'Escalation Process', placeholder: 'Flag → Security team reviews → Block sender → Notify affected users', required: false },
    ],
  },

  // ── GROUP T — Finance ─────────────────────────────────────────────────────
  {
    id: 'financial-forecaster', type: 'role', emoji: '📉', name: 'Financial Forecaster',
    roleBadge: 'Financial Planning',
    description: 'Projects revenue and expenses from historical data, models growth scenarios, identifies cash flow risks 30-60-90 days out, and delivers monthly financial health reports.',
    tags: ['finance', 'forecasting', 'planning', 'cash-flow', 'reports'],
    whatItDoes: [
      'Projects revenue and expenses from historical data',
      'Models different growth scenarios (conservative, base, optimistic)',
      'Identifies cash flow risks 30-60-90 days out',
      'Monthly financial health report with variance analysis',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'historical_period', label: 'Historical Period', placeholder: '12 months', required: false },
      { key: 'growth_assumptions', label: 'Growth Assumptions', placeholder: 'Conservative: 5% MoM\nBase: 10% MoM\nOptimistic: 20% MoM', required: false, type: 'textarea' },
      { key: 'key_cost_drivers', label: 'Key Cost Drivers', placeholder: 'Payroll\nAd spend\nInfrastructure\nSoftware subscriptions', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'tax-preparer', type: 'role', emoji: '🏛️', name: 'Tax Prep Assistant',
    roleBadge: 'Tax & Accounting',
    description: 'Organizes receipts and expenses by tax category, identifies potential deductions, creates pre-tax season checklists for your accountant, and tracks tax deadlines.',
    tags: ['finance', 'tax', 'accounting', 'deductions', 'compliance'],
    whatItDoes: [
      'Organizes receipts and expenses by tax category',
      'Identifies potential deductions based on business type',
      'Creates pre-tax season checklists for your accountant',
      'Tracks tax deadlines and required filings',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Sends Alerts'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'business_type', label: 'Business Type', placeholder: 'LLC', required: false },
      { key: 'jurisdiction', label: 'Jurisdiction', placeholder: 'California, USA', required: false },
      { key: 'accountant_contact', label: 'Accountant Contact', placeholder: 'jane@accounting.com', required: false },
    ],
  },
  {
    id: 'accounts-payable', type: 'role', emoji: '🏦', name: 'Accounts Payable',
    roleBadge: 'AP Automation',
    description: 'Tracks vendor invoices and payment due dates, routes invoices for approval, sends payment reminders, and generates AP aging reports and cash flow projections.',
    tags: ['finance', 'accounts-payable', 'invoices', 'payments', 'operations'],
    whatItDoes: [
      'Tracks vendor invoices and payment due dates',
      'Routes invoices for approval based on amount thresholds',
      'Sends payment reminders to internal stakeholders',
      'Generates AP aging reports and cash flow projections',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Sends Alerts', 'Tags Contacts'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'approval_thresholds', label: 'Approval Thresholds', placeholder: 'Under $500 → auto-approve\n$500-$5k → manager\nOver $5k → CFO', required: false, type: 'textarea' },
      { key: 'payment_terms', label: 'Payment Terms', placeholder: 'Net 30', required: false },
      { key: 'key_vendors', label: 'Key Vendors', placeholder: 'AWS\nGoogle Workspace\nSlack\nHubSpot', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'fraud-detector-basic', type: 'role', emoji: '🚨', name: 'Fraud Monitor',
    roleBadge: 'Financial Security',
    description: 'Flags unusual transaction patterns for human review, monitors for duplicate payments and unauthorized charges, creates fraud risk reports, and builds detection rules.',
    tags: ['finance', 'fraud', 'security', 'monitoring', 'risk'],
    whatItDoes: [
      'Flags unusual transaction patterns for human review',
      'Monitors for duplicate payments and unauthorized charges',
      'Creates fraud risk reports by category and vendor',
      'Builds fraud detection rules from historical patterns',
    ],
    channels: ['sms', 'voice', 'chat', 'telegram'],
    tools: ['Creates Reports', 'Sends Alerts', 'Escalates to Human'],
    useCase: 'internal',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'transaction_types', label: 'Transaction Types', placeholder: 'Credit card\nACH\nWire transfer\nPayPal', required: false, type: 'textarea' },
      { key: 'alert_threshold', label: 'Alert Threshold', placeholder: '$1,000', required: false },
      { key: 'escalation_contact', label: 'Escalation Contact', placeholder: 'finance@acme.com', required: false },
    ],
  },
  {
    id: 'it-operations-specialist',
    type: 'role',
    emoji: '🔗',
    name: 'IT Operations Specialist',
    roleBadge: 'Business Integration',
    description: 'Connects and manages your entire business stack — Microsoft 365, Google Workspace, Fathom meeting intelligence, GitHub, and web research. One AI worker that operates across all your tools.',
    tags: ['integration', 'microsoft-365', 'google-workspace', 'fathom', 'github', 'automation', 'enterprise'],
    whatItDoes: [
      'Manages Outlook email — reads inbox, drafts replies, sends, organizes folders',
      'Handles OneDrive files — uploads, downloads, shares, creates folders',
      'Posts and reads Microsoft Teams messages across channels and chats',
      'Manages Gmail — reads, composes, sends, labels, and searches email',
      'Works with Google Drive — uploads, organizes, shares documents',
      'Reads Google Calendar — checks availability, lists events',
      'Pulls Fathom meeting transcripts, summaries, and action items',
      'Manages GitHub repos — creates branches, commits, PRs, triggers deployments',
      'Performs live web research using Brave Search',
      'Sends updates and receives commands via Telegram',
      'Creates daily email digests and posts summaries to Teams/Telegram',
      'Cross-tool workflows — reads email, finds file, pulls meeting notes, posts update — all in one step',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: [
      'Outlook Email (Read/Write/Send)',
      'OneDrive (Upload/Download/Share)',
      'Teams (Read/Post/Reply)',
      'Gmail (Read/Write/Send/Label)',
      'Google Drive (Upload/Organize/Share)',
      'Google Calendar (Read/Check Availability)',
      'Fathom (Transcripts/Summaries/Action Items)',
      'GitHub (Branches/Commits/PRs/Deployments)',
      'Web Search (Brave API)',
      'Escalates to Human',
    ],
    useCase: 'internal',
    visibility: 'private',
    allowedAgencies: ['18e6e562-ec29-4652-a38b-58f6be2e533f'],
    requiredClawHubSkills: [
      'himalaya-1-0-0',       // Email via IMAP/SMTP (correct v1.x commands)
      'google-workspace-mcp', // Gmail, Calendar, Drive — no Cloud Console needed
      'fathom-meetings',      // Meeting transcripts, summaries, action items
      'github-cli',           // GitHub PRs, branches, commits, deployments
    ],
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Your company name', required: true },
      { key: 'email_digest_time', label: 'Daily Email Digest Time', placeholder: '17:00 (leave blank to skip)', required: false },
      { key: 'priority_senders', label: 'Priority Email Senders', placeholder: 'boss@company.com (one per line)', required: false, type: 'textarea' },
    ],
    soulMd: `# IT Operations Specialist — Trusted Networx

You are the AI Operations Specialist for {{business_name}}. You manage the entire business technology stack through natural language commands.

## Your Capabilities

### Microsoft 365
- **Outlook:** Read inbox, draft replies for approval, send emails, organize folders, create daily digests
- **OneDrive:** Upload, download, share files, create folder structures, find documents
- **Teams:** Read channel messages, post updates, reply in threads, monitor @mentions

### Google Workspace
- **Gmail:** Read, compose, send, label, search, and organize emails
- **Google Drive:** Upload, organize, share documents and folders
- **Google Calendar:** Check availability, list upcoming events

### Fathom Meeting Intelligence
- Pull transcripts from recent meetings
- Extract summaries and action items
- Post meeting notes to Teams or Telegram automatically

### GitHub
- Create branches, make commits, open PRs
- Trigger GitHub Actions for deployments
- Monitor repo activity and notify on failures

### Web Research
- Search the web for any topic using Brave Search
- Retrieve and summarize web page content
- Research competitors, industry trends, or technical topics

### Telegram
- Receive commands from the team
- Send daily email digests and meeting summaries
- Alert on urgent items (failed deployments, important emails)

## Behavior Rules
1. Always confirm before sending emails or making commits
2. Categorize emails: Urgent → Action Needed → Informational → Spam
3. Draft replies for "Action Needed" emails — present for approval before sending
4. Post daily digest to Telegram at {{email_digest_time}} every business day
5. Monitor {{priority_senders}} emails — flag immediately
6. Never expose API keys, tokens, or credentials in messages
7. When uncertain, ask for clarification — don't guess on business-critical actions

## Cross-Tool Workflows
When asked to "prepare for a meeting," you should:
1. Pull the meeting transcript from Fathom
2. Find related files on OneDrive/Google Drive
3. Check the latest email thread with that contact
4. Compile a brief and post it to Teams or Telegram
`,
  },
  {
    id: 'ai-marketing-worker',
    type: 'role',
    emoji: '📈',
    name: 'AI Marketing Worker',
    roleBadge: 'Full-Stack Marketing',
    description: 'Your complete AI marketing team — SEO research, content creation, competitor monitoring, social media drafting, lead identification, and performance analytics. 6 modes in one intelligent worker.',
    tags: ['marketing', 'seo', 'content', 'social-media', 'linkedin', 'competitor', 'analytics', 'lead-gen'],
    whatItDoes: [
      'Researches keywords, tracks rankings, finds content gaps and quick-win opportunities',
      'Drafts LinkedIn posts, Twitter threads, blog articles, newsletters, and video scripts in your brand voice',
      'Monitors competitor websites daily — detects new content, analyzes threats, finds keyword overlap',
      'Drafts thoughtful comments for target accounts on LinkedIn (you approve and post)',
      'Identifies leads from conversations and web signals — flags buying intent with context',
      'Generates weekly performance reports with rankings, traffic, and ROI calculations',
      'Maintains brand voice consistency across all content using your Knowledge Base',
      'Runs daily automated routines: morning research, content drafts, competitor scans, evening summaries',
      'All outputs sent to Telegram for your review and approval before anything goes live',
    ],
    channels: ['sms', 'chat', 'telegram'],
    tools: [
      'Web Search (keyword research, trend tracking)',
      'Web Scraper (competitor monitoring, SERP analysis)',
      'Knowledge Base (brand voice, past content)',
      'CRM (lead logging, contact enrichment)',
      'Summarize (content research, URL analysis)',
      'Blog Monitor (RSS feeds, industry news)',
      'PDF Analysis (document research)',
      'Escalates to Human',
    ],
    useCase: 'internal',
    visibility: 'public',
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Your company name', required: true },
      { key: 'industry', label: 'Industry', placeholder: 'Digital marketing, SaaS, Healthcare...', required: true },
      { key: 'target_audience', label: 'Target Audience', placeholder: 'Agency owners with 5-50 clients', required: false },
      { key: 'competitors', label: 'Top Competitors (URLs)', placeholder: 'competitor1.com\ncompetitor2.com\ncompetitor3.com', required: false, type: 'textarea' },
      { key: 'linkedin_targets', label: 'LinkedIn Target Accounts', placeholder: 'Names or URLs of people to engage with', required: false, type: 'textarea' },
      { key: 'brand_tone', label: 'Brand Voice / Tone', placeholder: 'Professional but approachable, data-driven, no jargon', required: false },
      { key: 'content_pillars', label: 'Content Pillars (topics)', placeholder: 'AI automation\nAgency growth\nClient results\nIndustry trends', required: false, type: 'textarea' },
    ],
  },
];
