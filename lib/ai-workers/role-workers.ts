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
  variables?: TemplateVariable[];
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
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'appointment_types', label: 'Appointment Types', placeholder: 'Free consultation - 30min\nStrategy session - 60min\nQuick check-in - 15min', required: false, type: 'textarea' },
      { key: 'booking_url', label: 'Booking URL', placeholder: 'https://calendly.com/your-team', required: false },
      { key: 'reschedule_policy', label: 'Reschedule Policy', placeholder: 'Reschedule up to 2 hours before. No-shows get one follow-up.', required: false },
      { key: 'reminder_message', label: 'Reminder Message Template', placeholder: 'Just a friendly reminder about your upcoming appointment...', required: false, type: 'textarea' },
    ],
  },
  {
    id: 'intake-specialist', type: 'role', emoji: '📋', name: 'Intake Specialist',
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
    channels: ['chat'],
    tools: ['Web Search', 'Creates Reports'],
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
    channels: ['chat', 'telegram'],
    tools: ['Reads Analytics', 'Sends Reports'],
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'report_metrics', label: 'Metrics to Track', placeholder: 'New leads\nCalls made\nAppointments booked\nRevenue closed\nCustomer satisfaction', required: false, type: 'textarea' },
      { key: 'report_schedule', label: 'Report Schedule', placeholder: 'Weekly', required: false, type: 'select', options: ['Weekly', 'Bi-weekly', 'Monthly'] },
      { key: 'highlight_threshold', label: 'Highlight Threshold', placeholder: 'Flag changes over 20%', required: false },
    ],
  },
  {
    id: 'social-scout', type: 'role', emoji: '📱', name: 'Social Scout',
    roleBadge: 'Social Monitoring',
    description: 'Monitors social mentions, competitor activity, and trending topics across platforms. Surfaces engagement opportunities and flags anything that needs a human response.',
    tags: ['social', 'monitoring', 'competitors', 'trends'],
    whatItDoes: [
      'Monitors social mentions of your brand 24/7',
      'Tracks competitor activity across platforms',
      'Surfaces engagement opportunities before they\'re missed',
      'Flags anything requiring urgent human response',
    ],
    channels: ['chat'],
    tools: ['Web Search', 'Tags Contacts', 'Escalates to Human'],
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
    channels: ['chat'],
    tools: ['Reviews Content'],
    variables: [
      { key: 'business_name', label: 'Business Name', placeholder: 'Acme Corp', required: false },
      { key: 'brand_tone', label: 'Brand Tone', placeholder: 'Professional but approachable. Never use slang. Always use inclusive language.', required: false, type: 'textarea' },
      { key: 'forbidden_words', label: 'Forbidden Words/Phrases', placeholder: 'synergy\nleverage\ngame-changer\ndisrupt', required: false, type: 'textarea' },
      { key: 'messaging_pillars', label: 'Messaging Pillars', placeholder: 'Innovation\nTrust\nSimplicity', required: false, type: 'textarea' },
      { key: 'approved_vocabulary', label: 'Approved Vocabulary', placeholder: 'Use "team members" not "employees"\nUse "clients" not "customers"', required: false, type: 'textarea' },
    ],
  },
];
