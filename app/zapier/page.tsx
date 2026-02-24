import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kyra + Zapier Integration | Connect Any CRM to AI in 2 Minutes',
  description: 'Connect Kyra AI to HubSpot, Salesforce, Typeform, Google Sheets, and 5,000+ apps via Zapier. New lead → AI responds in 60 seconds. No code.',
};

const INTEGRATIONS = [
  { name: 'HubSpot', emoji: '🧡', use: 'New contact → AI qualifies and responds' },
  { name: 'Salesforce', emoji: '☁️', use: 'New lead → AI sends personalized follow-up' },
  { name: 'Typeform', emoji: '📝', use: 'Form submission → AI replies in 60 seconds' },
  { name: 'Google Sheets', emoji: '📊', use: 'New row → AI responds to the contact' },
  { name: 'Pipedrive', emoji: '📊', use: 'New deal → AI warms up the lead' },
  { name: 'ActiveCampaign', emoji: '📣', use: 'New subscriber → AI sends first touch' },
  { name: 'Airtable', emoji: '🗄️', use: 'New record → AI follows up immediately' },
  { name: 'Calendly', emoji: '📅', use: 'New booking → AI sends confirmation + prep' },
  { name: 'Facebook Lead Ads', emoji: '📘', use: 'New lead → AI responds in under 60s' },
  { name: 'Google Ads', emoji: '🔍', use: 'Lead form → AI qualifies the prospect' },
  { name: 'Slack', emoji: '💬', use: 'Alert on escalation → team notified' },
  { name: 'Gmail', emoji: '📧', use: 'New inbound email → AI drafts a reply' },
];

export default function ZapierPage() {
  return (
    <div className="bg-white min-h-screen text-gray-900">
      <nav className="border-b border-gray-100 px-4 py-4 sticky top-0 bg-white z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-black text-xl flex items-center gap-2">
            <span className="text-indigo-600">⚡</span> Kyra
          </Link>
          <Link href="/signup/agency" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition">
            Start Free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-500 to-orange-600 text-white px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-6 py-3 mb-8">
            <span className="text-3xl">⚡</span>
            <span className="text-2xl">+</span>
            <span className="text-3xl">🔗</span>
            <span className="font-bold text-lg">Kyra + Zapier</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-5 leading-tight">
            Connect any app to AI<br />
            <span className="text-orange-200">in under 2 minutes.</span>
          </h1>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            New lead in HubSpot? Form submission in Typeform? Row added in Google Sheets?
            Kyra responds to every one — in 60 seconds — through Zapier, Make, or any webhook.
            No GoHighLevel required.
          </p>
          <Link href="/signup/agency" className="inline-block bg-white text-orange-700 font-black text-lg px-8 py-4 rounded-xl hover:bg-orange-50 transition">
            Start Free — No Code Required →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Set up your trigger', desc: 'Choose any Zapier trigger — new lead, form submission, CRM contact, whatever you use.' },
              { step: '2', title: 'POST to Kyra webhook', desc: 'Add a Webhooks by Zapier action. Paste your Kyra webhook URL. Map your lead\'s name, phone, email, message.' },
              { step: '3', title: 'AI responds + you act', desc: 'Kyra returns the AI response in the Zap output. Use it to send an SMS, email, or CRM note in the next step.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 font-black text-2xl flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compatible apps */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Works with everything you already use</h2>
          <p className="text-center text-gray-500 mb-12">5,000+ apps via Zapier. Also works directly with Make, n8n, or any HTTP POST.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INTEGRATIONS.map(app => (
              <div key={app.name} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-3">
                <span className="text-2xl shrink-0">{app.emoji}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{app.name}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{app.use}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-8">...and 5,000+ more via Zapier</p>
        </div>
      </section>

      {/* Example Zap */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Example: HubSpot → AI Response → SMS</h2>
          <div className="space-y-4">
            {[
              { step: 'Trigger', label: 'HubSpot: New Contact', icon: '🧡', detail: 'Fires when a new lead fills your HubSpot form' },
              { step: 'Action 1', label: 'Webhooks by Zapier: POST', icon: '🔗', detail: 'POST to https://kyra.conversionsystem.com/api/inbound/webhook?clientId=YOUR_ID\n→ Output: {ai_response, sms_response, sender_phone}' },
              { step: 'Action 2', label: 'Twilio / GHL: Send SMS', icon: '📱', detail: 'Send {{ai_response}} to {{sender_phone}} — Kyra\'s reply goes out in under 60 seconds' },
              { step: 'Action 3', label: 'HubSpot: Create Note', icon: '📝', detail: 'Log the AI response as a contact note — CRM stays updated automatically' },
            ].map(step => (
              <div key={step.step} className="flex gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl">{step.icon}</span>
                  <span className="text-[10px] text-gray-400 font-semibold">{step.step}</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{step.label}</p>
                  <pre className="text-xs text-gray-500 mt-1 whitespace-pre-wrap leading-relaxed">{step.detail}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-orange-600 text-white py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black mb-4">Start free. First response in 10 minutes.</h2>
          <p className="text-orange-200 mb-8">Get your webhook URL, paste it in Zapier, and your AI starts responding to leads immediately.</p>
          <Link href="/signup/agency" className="inline-block bg-white text-orange-700 font-black text-lg px-10 py-4 rounded-xl hover:bg-orange-50 transition">
            Get Started Free →
          </Link>
          <p className="text-orange-400 text-sm mt-4">No credit card · No GoHighLevel required · Works with any app</p>
        </div>
      </section>
    </div>
  );
}
