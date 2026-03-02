/**
 * Setup Guides — Step-by-step integration walkthroughs
 * Public pages shareable with prospects and customers.
 */

export interface GuideStep {
  step: number;
  title: string;
  description: string;
  details: string[];       // Bullet points with specific instructions
  tip?: string;            // Pro tip callout
  image?: string;          // Placeholder for future screenshots
}

export interface SetupGuide {
  id: string;
  title: string;
  emoji: string;
  subtitle: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  timeEstimate: string;
  tags: string[];
  prerequisites: string[];
  steps: GuideStep[];
  faq: Array<{ q: string; a: string }>;
  ctaText: string;
}

export const SETUP_GUIDES: SetupGuide[] = [
  // ── 1. Facebook Ads → GHL → AI ────────────────────────────────────
  {
    id: 'facebook-ghl-ai',
    title: 'Facebook Ads → GHL → AI Worker',
    emoji: '📘',
    subtitle: 'Respond to Facebook leads instantly with AI',
    description: 'Connect your Facebook Lead Ads to GoHighLevel, then let your AI worker qualify, nurture, and book every lead — automatically, 24/7.',
    difficulty: 'Easy',
    timeEstimate: '10 minutes',
    tags: ['Facebook', 'GHL', 'Lead Ads', 'SMS', 'Speed-to-Lead'],
    prerequisites: [
      'Active Facebook Ads account with Lead Ads running',
      'GoHighLevel account with a sub-account',
      'Kyra account with AI worker set up',
    ],
    steps: [
      {
        step: 1,
        title: 'Connect Facebook to GHL',
        description: 'Link your Facebook page to GoHighLevel so leads flow in automatically.',
        details: [
          'In GHL, go to **Settings → Integrations → Facebook**',
          'Click **Connect** and log in with the Facebook account that manages your ads',
          'Select the **Facebook Page** connected to your lead ads',
          'Grant all permissions when prompted',
          'You should see "Connected" with a green checkmark',
        ],
        tip: 'If you manage multiple pages, make sure you select the right one. Each GHL sub-account connects to one Facebook page.',
      },
      {
        step: 2,
        title: 'Map your Facebook Lead Form fields',
        description: 'Tell GHL which form fields match which contact fields.',
        details: [
          'In GHL, go to **Settings → Integrations → Facebook → Form Mapping**',
          'Select your active Lead Ad form',
          'Map **Full Name** → Contact Name',
          'Map **Email** → Contact Email',
          'Map **Phone Number** → Contact Phone',
          'Map any custom fields (service type, budget, etc.) to GHL custom fields',
          'Click **Save Mapping**',
        ],
        tip: 'Always include Phone Number in your lead form — SMS has a 98% open rate vs 20% for email.',
      },
      {
        step: 3,
        title: 'Create a GHL Workflow for new leads',
        description: 'Set up a workflow that triggers when a new Facebook lead arrives.',
        details: [
          'Go to **Automations → Workflows → Create Workflow**',
          'Name it "Facebook Lead → AI Worker"',
          'Set trigger: **Contact Created** with source filter = "Facebook"',
          'Add action: **Webhook** → paste your Kyra AI worker webhook URL',
          'Your webhook URL is at: **Kyra Dashboard → Channels → GHL webhook URL**',
          'Method: POST, send all contact fields',
          'Save and **Publish** the workflow',
        ],
        tip: 'Test with a real lead form submission (use yourself as a test lead) to make sure the webhook fires.',
      },
      {
        step: 4,
        title: 'Configure your AI worker response',
        description: 'Set what your AI says when a Facebook lead comes in.',
        details: [
          'In Kyra Dashboard, go to **Templates** → pick your industry template',
          'Or go to **Setup Wizard** for a guided configuration',
          'Your AI will automatically introduce itself and start qualifying the lead',
          'It pulls the lead\'s name from GHL and personalizes every message',
          'Enable **Autopilot** to auto-follow-up if the lead doesn\'t reply',
        ],
      },
      {
        step: 5,
        title: 'Test the full flow',
        description: 'Submit a test lead and watch your AI respond in real-time.',
        details: [
          'Go to your Facebook Lead Ad → click **Preview Form**',
          'Submit with your own phone number',
          'Within 60 seconds, you should receive an SMS from your AI worker',
          'Check GHL: the contact should appear with source "Facebook"',
          'Check Kyra Dashboard → **Conversations**: you should see the exchange',
        ],
        tip: 'The magic moment: lead submits a form on Facebook, gets a personalized text within seconds. That\'s how you win every deal.',
      },
    ],
    faq: [
      { q: 'How fast does the AI respond?', a: 'Under 60 seconds from form submission. Usually within 10-15 seconds.' },
      { q: 'Does it work with Facebook Messenger ads too?', a: 'Yes! If your Messenger conversations sync to GHL, the AI worker can handle those too via the GHL webhook.' },
      { q: 'Can the AI book appointments directly?', a: 'Yes — the AI has access to your GHL calendar and can book appointments during the conversation.' },
      { q: 'What if the lead responds at 3am?', a: 'Your AI works 24/7. It\'ll respond instantly, qualify the lead, and book them for your next available slot.' },
      { q: 'Do I need to change my Facebook ads?', a: 'No changes needed. Your ads and lead forms stay exactly the same. We just plug in on the GHL side.' },
    ],
    ctaText: 'Start capturing Facebook leads with AI',
  },

  // ── 2. Google Ads → GHL → AI ──────────────────────────────────────
  {
    id: 'google-ghl-ai',
    title: 'Google Ads → GHL → AI Worker',
    emoji: '🔍',
    subtitle: 'Convert Google search leads the moment they inquire',
    description: 'Connect Google Ads lead forms or landing pages to GoHighLevel, then let your AI worker handle every inquiry instantly.',
    difficulty: 'Easy',
    timeEstimate: '15 minutes',
    tags: ['Google Ads', 'GHL', 'PPC', 'Landing Pages', 'Search'],
    prerequisites: [
      'Google Ads account with active campaigns',
      'GoHighLevel account',
      'Kyra account with AI worker set up',
    ],
    steps: [
      {
        step: 1,
        title: 'Connect your landing page to GHL',
        description: 'Use a GHL landing page or connect your existing one.',
        details: [
          '**Option A — GHL Landing Page:** Build your landing page in GHL → Sites → Funnels. Form submissions auto-create contacts.',
          '**Option B — External Landing Page:** Add a GHL form embed or use the GHL API webhook on your existing page.',
          '**Option C — Google Lead Form Extensions:** Set up in Google Ads → Extensions → Lead Form, then connect to GHL via Zapier.',
          'For Option A/B: form submission → contact created in GHL automatically',
          'For Option C: Google Ads → Zapier → GHL Create Contact',
        ],
        tip: 'GHL landing pages give you the fastest setup — the form is already connected. No Zapier needed.',
      },
      {
        step: 2,
        title: 'Create a workflow for Google leads',
        description: 'Trigger your AI worker when a Google lead arrives.',
        details: [
          'Go to **Automations → Workflows → Create Workflow**',
          'Name it "Google Lead → AI Worker"',
          'Set trigger: **Contact Created** or **Form Submitted**',
          'Add a tag filter if needed: source = "Google" or form = your specific form',
          'Add action: **Webhook** → paste your Kyra AI worker webhook URL',
          'Save and **Publish**',
        ],
      },
      {
        step: 3,
        title: 'Customize AI for high-intent leads',
        description: 'Google leads are actively searching — your AI should match that urgency.',
        details: [
          'These leads are HOT — they just searched for your service',
          'In your AI personality, emphasize: immediate availability, quick quotes, same-day service',
          'Enable the **Sales Agent** in AI Agents for pricing and booking focus',
          'Set up **Autopilot** follow-ups: if no reply in 1 hour, text again',
          'Consider a special offer for instant bookers',
        ],
        tip: 'Google leads convert 2-3x better than social leads because they have intent. Speed matters even more here.',
      },
      {
        step: 4,
        title: 'Test with a form submission',
        description: 'Submit your landing page form and verify the AI responds.',
        details: [
          'Fill out your own landing page form with your phone number',
          'Check GHL: contact should appear within seconds',
          'Check your phone: AI should text you within 60 seconds',
          'Verify the conversation appears in Kyra Dashboard → Conversations',
        ],
      },
    ],
    faq: [
      { q: 'Does it work with Google Local Service Ads?', a: 'Google LSAs have their own messaging. If those leads sync to GHL (via Zapier or API), then yes.' },
      { q: 'Can the AI mention the specific service they searched for?', a: 'If your form captures the service type or you pass it via GHL custom fields, the AI will reference it.' },
    ],
    ctaText: 'Start converting Google leads with AI',
  },

  // ── 3. Website Chat Widget ─────────────────────────────────────────
  {
    id: 'website-chat',
    title: 'Website Chat Widget',
    emoji: '💬',
    subtitle: 'Turn website visitors into booked appointments',
    description: 'Add a chat widget to your website in 30 seconds. Your AI worker answers questions, qualifies leads, and books appointments — right from your site.',
    difficulty: 'Easy',
    timeEstimate: '2 minutes',
    tags: ['Website', 'Chat', 'Widget', 'Embed', 'Lead Capture'],
    prerequisites: [
      'Kyra account with AI worker set up',
      'Access to your website (WordPress, Wix, Squarespace, or any HTML site)',
    ],
    steps: [
      {
        step: 1,
        title: 'Get your embed code',
        description: 'Copy the one-line script from your Kyra dashboard.',
        details: [
          'Go to your **Kyra Dashboard → Overview**',
          'Find the "Add Chat to Your Website" section',
          'Click **Copy to clipboard**',
          'Your embed code looks like: `<script src="https://kyra.conversionsystem.com/embed/YOUR-ID.js" async></script>`',
        ],
      },
      {
        step: 2,
        title: 'Add to your website',
        description: 'Paste the embed code into your website.',
        details: [
          '**WordPress:** Appearance → Theme Editor → footer.php, paste before `</body>`. Or use "Insert Headers & Footers" plugin.',
          '**Wix:** Settings → Custom Code → Add Code → paste in Body (end). Apply to All Pages.',
          '**Squarespace:** Settings → Advanced → Code Injection → paste in Footer.',
          '**Shopify:** Online Store → Themes → Edit Code → theme.liquid → paste before `</body>`.',
          '**Any HTML site:** Paste the script tag before `</body>` in your HTML.',
        ],
        tip: 'The widget loads asynchronously — it won\'t slow down your website at all.',
      },
      {
        step: 3,
        title: 'Customize appearance (optional)',
        description: 'Adjust the chat widget colors and greeting.',
        details: [
          'Go to **Dashboard → Chat Widget** to customize',
          'Set your brand color to match your website',
          'Write a custom greeting message: "Hi! How can I help you today?"',
          'Choose widget position: bottom-right (default) or bottom-left',
        ],
      },
      {
        step: 4,
        title: 'Test it',
        description: 'Visit your website and start a chat.',
        details: [
          'Open your website in a new tab (or phone)',
          'You should see the chat bubble in the bottom-right corner',
          'Click it and type a message',
          'Your AI should respond within seconds',
          'Check **Dashboard → Conversations** to see it logged',
        ],
      },
    ],
    faq: [
      { q: 'Will it slow down my website?', a: 'No. The script loads asynchronously and is under 50KB. It won\'t affect your page speed score.' },
      { q: 'Can I customize the colors?', a: 'Yes — match your brand colors in Dashboard → Chat Widget settings.' },
      { q: 'Does it work on mobile?', a: 'Yes, the widget is fully responsive and works great on mobile browsers.' },
      { q: 'Can I see all chat conversations?', a: 'Yes, every conversation appears in Dashboard → Conversations with full history.' },
    ],
    ctaText: 'Add AI chat to your website in 2 minutes',
  },

  // ── 4. Instagram → GHL → AI ───────────────────────────────────────
  {
    id: 'instagram-ghl-ai',
    title: 'Instagram DMs → GHL → AI Worker',
    emoji: '📸',
    subtitle: 'AI answers your Instagram DMs instantly',
    description: 'Connect Instagram to GoHighLevel so your AI worker responds to every DM, comment, and story reply — even when you\'re asleep.',
    difficulty: 'Medium',
    timeEstimate: '15 minutes',
    tags: ['Instagram', 'GHL', 'DMs', 'Social Media', 'Comments'],
    prerequisites: [
      'Instagram Business or Creator account',
      'Facebook Page linked to your Instagram',
      'GoHighLevel account',
      'Kyra account with AI worker set up',
    ],
    steps: [
      {
        step: 1,
        title: 'Connect Instagram to GHL',
        description: 'Link your Instagram Business account via Facebook.',
        details: [
          'In GHL, go to **Settings → Integrations → Facebook**',
          'If not already connected, connect your Facebook account',
          'After connecting, you\'ll see an option to **Connect Instagram**',
          'Select your Instagram Business account',
          'Grant messaging permissions when prompted',
          'You should see "Instagram Connected" with a green checkmark',
        ],
        tip: 'Instagram must be a Business or Creator account (not Personal). Switch in Instagram Settings → Account → Account Type.',
      },
      {
        step: 2,
        title: 'Enable Instagram DM conversations in GHL',
        description: 'Make sure Instagram messages show up in your GHL conversations.',
        details: [
          'Go to **Conversations** in GHL',
          'Filter by channel → you should see "Instagram" as an option',
          'Send yourself a test DM on Instagram',
          'It should appear in GHL Conversations within seconds',
        ],
      },
      {
        step: 3,
        title: 'Create a workflow for Instagram leads',
        description: 'Trigger your AI worker when someone DMs you.',
        details: [
          'Go to **Automations → Workflows → Create Workflow**',
          'Name it "Instagram DM → AI Worker"',
          'Set trigger: **Customer Replied** with channel filter = "Instagram"',
          'Add action: **Webhook** → paste your Kyra AI worker webhook URL',
          'Save and **Publish**',
        ],
      },
      {
        step: 4,
        title: 'Test with a DM',
        description: 'Send your business a DM from another account.',
        details: [
          'From a personal account, DM your business: "Hi, do you have availability this week?"',
          'Your AI should respond in the Instagram DM within 60 seconds',
          'The conversation should also appear in Kyra Dashboard',
        ],
        tip: 'Great for "Comment YES for details" campaigns — the AI automatically DMs anyone who comments.',
      },
    ],
    faq: [
      { q: 'Does it reply to comments too?', a: 'If you set up a "Comment Trigger" workflow in GHL that creates a contact and triggers the webhook, yes!' },
      { q: 'Will people know it\'s AI?', a: 'Only if you want them to. Most businesses have the AI introduce itself by name (like "Hi, I\'m Alex from Mike\'s Plumbing").' },
      { q: 'Can the AI send images or links in DMs?', a: 'Yes, the AI can share your booking link, website, and pricing in the conversation.' },
    ],
    ctaText: 'Start automating Instagram DMs',
  },

  // ── 5. Manual/CSV Import → AI ──────────────────────────────────────
  {
    id: 'csv-import-ai',
    title: 'Import Existing Leads → AI Follow-Up',
    emoji: '📥',
    subtitle: 'Breathe life into your old lead lists',
    description: 'Import your existing contacts from a spreadsheet and let your AI worker follow up with every single one — reactivating dead leads automatically.',
    difficulty: 'Easy',
    timeEstimate: '5 minutes',
    tags: ['CSV', 'Import', 'Reactivation', 'Lead List', 'Follow-Up'],
    prerequisites: [
      'CSV or Excel file with leads (name, phone, and/or email)',
      'Kyra account with AI worker set up',
    ],
    steps: [
      {
        step: 1,
        title: 'Prepare your CSV file',
        description: 'Make sure your spreadsheet has the right columns.',
        details: [
          'Required columns: **Name** (or First Name + Last Name), **Phone** or **Email**',
          'Optional columns: Service Interested In, Last Contact Date, Notes, Source',
          'Save as .CSV (comma-separated values)',
          'Remove any duplicate phone numbers',
          'Clean up formatting: phone numbers should be 10+ digits',
        ],
        tip: 'The more info you include (service interest, notes), the more personalized your AI\'s outreach will be.',
      },
      {
        step: 2,
        title: 'Import into Kyra CRM',
        description: 'Upload your CSV file to create contacts.',
        details: [
          'Go to **Dashboard → CRM → Import**',
          'Click **Upload CSV**',
          'Map your columns: Name → Contact Name, Phone → Phone, etc.',
          'Preview the import to verify data looks correct',
          'Click **Import** — contacts will be created immediately',
        ],
      },
      {
        step: 3,
        title: 'Launch AI reactivation campaign',
        description: 'Let your AI reach out to every imported contact.',
        details: [
          'Enable **Autopilot** in your dashboard',
          'The Monday "Hot Lead Follow-Up" action will automatically text imported leads',
          'Or create a custom automation: trigger = "Contact Imported", action = "AI reaches out"',
          'Your AI will introduce itself and re-engage each lead personally',
          'Leads who respond enter a live AI conversation automatically',
        ],
      },
      {
        step: 4,
        title: 'Monitor results',
        description: 'Track which leads re-engage and book.',
        details: [
          'Go to **Dashboard → Conversations** to see AI exchanges',
          'Check **CRM → Contacts** for updated lead statuses',
          'Review **Performance** for response rates and bookings',
          'Typical reactivation rate: 5-15% of old leads re-engage',
        ],
        tip: 'A list of 500 old leads at 10% reactivation = 50 new conversations. At a 20% close rate = 10 new jobs. That\'s pure profit.',
      },
    ],
    faq: [
      { q: 'How many leads can I import?', a: 'There\'s no limit on imports. The AI will work through them based on your Autopilot schedule.' },
      { q: 'Will it spam my contacts?', a: 'No. The AI sends one personalized message and waits for a response. It follows up once more if no reply. That\'s it.' },
      { q: 'Can I import from GHL directly?', a: 'If your leads are already in GHL, just set up the webhook workflow — no import needed.' },
    ],
    ctaText: 'Reactivate your lead list with AI',
  },

  // ── 6. Google Business Profile → AI ────────────────────────────────
  {
    id: 'google-business-ai',
    title: 'Google Business Profile → AI Worker',
    emoji: '📍',
    subtitle: 'AI answers Google Business messages and calls',
    description: 'When customers find you on Google Maps and send a message or call, your AI worker responds instantly — booking appointments while you\'re on the job.',
    difficulty: 'Medium',
    timeEstimate: '10 minutes',
    tags: ['Google Business', 'Maps', 'Local SEO', 'Messages', 'Calls'],
    prerequisites: [
      'Verified Google Business Profile',
      'GoHighLevel account',
      'Kyra account with AI worker set up',
    ],
    steps: [
      {
        step: 1,
        title: 'Enable Google Business messaging',
        description: 'Turn on the chat feature in your Google Business Profile.',
        details: [
          'Go to **business.google.com** → select your business',
          'Click **Messages** in the left sidebar',
          'Toggle **Turn on messaging**',
          'Set up welcome message: "Thanks for reaching out! Our AI assistant will be right with you."',
        ],
      },
      {
        step: 2,
        title: 'Connect Google Business to GHL',
        description: 'Route Google Business messages through GHL.',
        details: [
          'In GHL, go to **Settings → Integrations → Google Business**',
          'Click **Connect** and authorize your Google account',
          'Select your business location',
          'Google Business messages will now appear in GHL Conversations',
        ],
      },
      {
        step: 3,
        title: 'Create the AI workflow',
        description: 'Trigger your AI worker for Google Business inquiries.',
        details: [
          'Go to **Automations → Workflows → Create Workflow**',
          'Name it "Google Business → AI Worker"',
          'Set trigger: **Customer Replied** with channel = "GMB" (Google My Business)',
          'Add action: **Webhook** → paste your Kyra AI worker webhook URL',
          'Save and **Publish**',
        ],
        tip: 'Google Business leads are ultra-local and high-intent. They\'re literally looking at your listing on the map. Speed wins here.',
      },
      {
        step: 4,
        title: 'Test from Google Maps',
        description: 'Find your business on Google and send a message.',
        details: [
          'Search for your business on Google Maps (use a different account)',
          'Click **Message** on your listing',
          'Send: "Do you have availability this week?"',
          'Your AI should respond in the Google Business chat within 60 seconds',
        ],
      },
    ],
    faq: [
      { q: 'Does this help my Google ranking?', a: 'Yes! Google rewards businesses that respond quickly to messages. Fast response times can improve your local ranking.' },
      { q: 'Can the AI ask for Google reviews?', a: 'Yes — after a completed appointment, the Review Generation feature automatically asks happy customers for a Google review.' },
    ],
    ctaText: 'Start capturing Google Business leads',
  },

  // ── 7. Zapier/Make.com → AI ────────────────────────────────────────
  {
    id: 'zapier-ai',
    title: 'Zapier / Make.com → AI Worker',
    emoji: '🔗',
    subtitle: 'Connect any app to your AI worker',
    description: 'Use Zapier or Make.com to connect 5,000+ apps to your AI worker. Typeform, Calendly, Jotform, HubSpot — if it has a Zapier integration, your AI can handle it.',
    difficulty: 'Medium',
    timeEstimate: '15 minutes',
    tags: ['Zapier', 'Make.com', 'Integrations', 'Automation', 'API'],
    prerequisites: [
      'Zapier or Make.com account (free tier works)',
      'GoHighLevel account',
      'Kyra account with AI worker set up',
    ],
    steps: [
      {
        step: 1,
        title: 'Choose your trigger app',
        description: 'Decide which app sends leads to your AI.',
        details: [
          'Common triggers: Typeform submission, Calendly booking, Jotform entry, HubSpot contact, Stripe payment',
          'In Zapier: click **Create Zap** → search for your trigger app',
          'In Make.com: create a new Scenario → add your trigger module',
          'Set up the trigger and test it',
        ],
      },
      {
        step: 2,
        title: 'Add GHL as the action',
        description: 'Send the lead data to GoHighLevel.',
        details: [
          'Add action: **GoHighLevel → Create/Update Contact**',
          'Connect your GHL account (API key from GHL Settings → API Keys)',
          'Map fields: Name, Email, Phone from your trigger app',
          'Add a tag like "zapier-lead" to identify the source',
          'Test the step — verify contact appears in GHL',
        ],
      },
      {
        step: 3,
        title: 'GHL workflow triggers AI',
        description: 'The standard GHL → AI workflow handles the rest.',
        details: [
          'If you already have a GHL → Kyra webhook workflow, it will automatically pick up these leads',
          'If not, create one: trigger = Contact Created, tag = "zapier-lead", action = Webhook to Kyra',
          'Your AI worker will text/email the new lead immediately',
        ],
        tip: 'This pattern works for ANY app: [Any App] → Zapier → GHL → Kyra AI. You only set up the GHL→Kyra part once.',
      },
      {
        step: 4,
        title: 'Test end-to-end',
        description: 'Trigger from your source app and verify the full flow.',
        details: [
          'Submit a test entry in your source app (Typeform, etc.)',
          'Verify: Zapier/Make.com runs → GHL contact created → AI texts the lead',
          'Full flow should complete in under 2 minutes',
        ],
      },
    ],
    faq: [
      { q: 'Is this free?', a: 'Zapier has a free tier (100 tasks/month). Make.com has a free tier too. That\'s enough for most small businesses starting out.' },
      { q: 'Can I skip GHL and go straight to Kyra?', a: 'Currently the AI worker integrates through GHL. The GHL→Kyra webhook is the bridge.' },
    ],
    ctaText: 'Connect any app to your AI worker',
  },

  // ── 8. WhatsApp Business → AI ──────────────────────────────────────
  {
    id: 'whatsapp-ai',
    title: 'WhatsApp Business → AI Worker',
    emoji: '📲',
    subtitle: 'AI handles your WhatsApp customer conversations',
    description: 'Connect WhatsApp Business to your AI worker. Perfect for international businesses or markets where WhatsApp is the primary communication channel.',
    difficulty: 'Medium',
    timeEstimate: '20 minutes',
    tags: ['WhatsApp', 'International', 'Messaging', 'Commerce'],
    prerequisites: [
      'WhatsApp Business account',
      'GoHighLevel account with WhatsApp integration enabled',
      'Kyra account with AI worker set up',
    ],
    steps: [
      {
        step: 1,
        title: 'Set up WhatsApp in GHL',
        description: 'Connect your WhatsApp Business number to GoHighLevel.',
        details: [
          'In GHL, go to **Settings → Integrations → WhatsApp**',
          'Follow the setup wizard to connect your WhatsApp Business number',
          'Verify your business phone number',
          'WhatsApp messages will now appear in GHL Conversations',
        ],
        tip: 'WhatsApp has 2 billion users. In Latin America, Europe, and Asia, it\'s the #1 way customers contact businesses.',
      },
      {
        step: 2,
        title: 'Create the AI workflow',
        description: 'Route WhatsApp messages to your AI worker.',
        details: [
          'Go to **Automations → Workflows → Create Workflow**',
          'Name it "WhatsApp → AI Worker"',
          'Set trigger: **Customer Replied** with channel = "WhatsApp"',
          'Add action: **Webhook** → paste your Kyra AI worker webhook URL',
          'Save and **Publish**',
        ],
      },
      {
        step: 3,
        title: 'Enable WhatsApp Commerce (optional)',
        description: 'Let your AI share product catalogs and take orders.',
        details: [
          'In Kyra Dashboard, the **WhatsApp Commerce** feature is already built in',
          'Your AI can: list products, create orders, send payment links',
          'Add your product catalog in your AI worker\'s knowledge base',
          'Customers can browse, ask questions, and purchase — all in WhatsApp',
        ],
      },
      {
        step: 4,
        title: 'Test via WhatsApp',
        description: 'Send a WhatsApp message to your business number.',
        details: [
          'From a personal WhatsApp, message your business number',
          'Your AI should respond within seconds',
          'Try asking about services, pricing, or booking an appointment',
          'Verify the conversation appears in Kyra Dashboard',
        ],
      },
    ],
    faq: [
      { q: 'Does it support WhatsApp catalog?', a: 'Yes! The AI can present products from your catalog, with pricing and descriptions.' },
      { q: 'Can I use my existing WhatsApp number?', a: 'Yes, through GHL\'s WhatsApp integration. Your personal messages stay separate.' },
      { q: 'Is there a per-message cost?', a: 'WhatsApp Business API has per-conversation pricing (varies by country, typically $0.01-0.05 per conversation). Check Meta\'s pricing.' },
    ],
    ctaText: 'Start automating WhatsApp with AI',
  },
];

export function getGuide(id: string): SetupGuide | undefined {
  return SETUP_GUIDES.find(g => g.id === id);
}
// deployed 202603020907
