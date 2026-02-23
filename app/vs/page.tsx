import Link from 'next/link';
import { Check, X, Zap, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kyra vs. Basic Chatbots & GHL Automations — What\'s the Difference?',
  description: 'Why AI employees are different from chatbots, canned response bots, and basic GHL automation workflows. Side-by-side comparison.',
  keywords: ['GHL AI employee vs chatbot', 'stammer.ai alternative', 'AI employee for GHL', 'GoHighLevel chatbot vs AI'],
};

const rows = [
  {
    feature: 'Responds to any message (not just pre-programmed ones)',
    kyra: true, chatbot: false, ghlAutomation: false,
  },
  {
    feature: 'Reads GHL CRM context before replying (tags, stage, notes)',
    kyra: true, chatbot: false, ghlAutomation: false,
  },
  {
    feature: 'Remembers conversation history',
    kyra: true, chatbot: false, ghlAutomation: false,
  },
  {
    feature: 'Books appointments with natural language ("Tuesday works")',
    kyra: true, chatbot: false, ghlAutomation: false,
  },
  {
    feature: 'Auto-tags GHL contacts from conversation outcomes',
    kyra: true, chatbot: false, ghlAutomation: 'partial',
  },
  {
    feature: 'Detects frustrated customers and escalates to humans',
    kyra: true, chatbot: false, ghlAutomation: false,
  },
  {
    feature: 'Proactively greets new contacts (no trigger needed)',
    kyra: true, chatbot: false, ghlAutomation: 'partial',
  },
  {
    feature: 'Responds in any of 15 languages (Spanish, Portuguese, etc.)',
    kyra: true, chatbot: false, ghlAutomation: false,
  },
  {
    feature: 'Works across GHL SMS, WhatsApp, Instagram, Facebook, Live Chat, Email',
    kyra: true, chatbot: false, ghlAutomation: 'partial',
  },
  {
    feature: 'Per-client personality (separate AI for each business)',
    kyra: true, chatbot: false, ghlAutomation: false,
  },
  {
    feature: 'Web chat widget (no GHL required for website chat)',
    kyra: true, chatbot: 'partial', ghlAutomation: false,
  },
  {
    feature: 'White-label for agencies (your brand, your client\'s AI)',
    kyra: true, chatbot: false, ghlAutomation: false,
  },
  {
    feature: '✨ Auto-generates AI personality from just a business name',
    kyra: true, chatbot: false, ghlAutomation: false,
  },
  {
    feature: 'Agency dashboard (manage all clients from one place)',
    kyra: true, chatbot: false, ghlAutomation: false,
  },
  {
    feature: 'Real-time escalation webhook (Slack/Discord/Zapier)',
    kyra: true, chatbot: false, ghlAutomation: false,
  },
  {
    feature: 'Free to start',
    kyra: true, chatbot: 'partial', ghlAutomation: 'partial',
  },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-5 w-5 text-green-500 mx-auto" />;
  if (value === false) return <X className="h-5 w-5 text-red-400 mx-auto" />;
  return <span className="text-xs text-amber-500 font-medium mx-auto block text-center">Limited</span>;
}

export default function VsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="border-b border-white/10 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-xl">
            <Zap className="h-5 w-5 text-indigo-400" /> Kyra
          </Link>
          <Link href="/signup/agency" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold transition text-sm">
            Get Started Free
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            AI Employee vs. Everything Else
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4">
            Why an AI employee beats a chatbot.<br />
            <span className="text-indigo-400">Every time.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Chatbots respond to keywords. GHL automations follow scripts. An AI employee understands context, adapts to each conversation, and operates like a real team member — without the salary.
          </p>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto mb-12">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-4 text-sm font-semibold text-slate-400 w-1/2">Capability</th>
                <th className="p-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="bg-indigo-600 rounded-lg px-3 py-1 text-sm font-black">Kyra AI</div>
                    <span className="text-xs text-slate-500">AI Employee</span>
                  </div>
                </th>
                <th className="p-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="bg-white/10 border border-white/10 rounded-lg px-3 py-1 text-sm font-semibold">Chatbot</div>
                    <span className="text-xs text-slate-500">Rule-based bot</span>
                  </div>
                </th>
                <th className="p-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="bg-white/10 border border-white/10 rounded-lg px-3 py-1 text-sm font-semibold">GHL Workflows</div>
                    <span className="text-xs text-slate-500">Automation sequences</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? 'bg-white/2' : ''}>
                  <td className="p-4 text-sm text-slate-300 border-t border-white/5">{row.feature}</td>
                  <td className="p-4 text-center border-t border-white/5"><Cell value={row.kyra} /></td>
                  <td className="p-4 text-center border-t border-white/5"><Cell value={row.chatbot} /></td>
                  <td className="p-4 text-center border-t border-white/5"><Cell value={row.ghlAutomation} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* The key difference */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            {
              title: 'Chatbots answer questions.',
              subtitle: 'AI employees have conversations.',
              desc: 'A chatbot matches keywords to canned responses. When a customer asks something unexpected, it breaks. An AI employee understands context, remembers what was said, and adapts — just like a real person would.',
              bad: 'Customer: "What if I have questions after?" → Chatbot: "I don\'t understand your question."',
              good: 'Same message → Kyra AI: "Great question — you can text us anytime and I\'ll follow up. Should I note that you prefer text over calls?"',
            },
            {
              title: 'Automations run scripts.',
              subtitle: 'AI employees think.',
              desc: 'GHL workflows are powerful, but they follow fixed paths. If a contact takes an unexpected action, they fall off the map. The AI adapts to what the customer actually says — not just what you anticipated.',
              bad: 'Automation: "Reply YES to confirm." → Customer: "sounds good" → Automation: breaks.',
              good: 'Same message → Kyra AI: "✅ Confirmed! See you Tuesday at 2pm. Let me know if anything changes."',
            },
            {
              title: 'Tools need configuration.',
              subtitle: 'AI employees need personality.',
              desc: 'Setting up most chatbots takes days of mapping flows. Kyra uses a natural language personality that you write once (or generate with AI in seconds). The AI figures out how to apply it.',
              bad: 'Hours of building conversation trees, testing edge cases, updating flows.',
              good: '10 minutes: add client → pick template → generate personality → go live.',
            },
          ].map(card => (
            <div key={card.title} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-0.5">{card.title}</h3>
              <p className="text-indigo-400 text-sm font-semibold mb-3">{card.subtitle}</p>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{card.desc}</p>
              <div className="space-y-2">
                <div className="bg-red-950/50 border border-red-500/20 rounded-lg p-3 text-xs text-red-300">
                  ❌ {card.bad}
                </div>
                <div className="bg-green-950/50 border border-green-500/20 rounded-lg p-3 text-xs text-green-300">
                  ✅ {card.good}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-indigo-950/50 border border-indigo-500/20 p-8 text-center">
          <h2 className="text-2xl font-black mb-2">See the difference in 60 seconds</h2>
          <p className="text-slate-400 mb-6 text-sm">
            Try a live AI employee conversation. Type anything a real customer would say.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/try/dental" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2">
              💬 Try Dental AI <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/try/realestate" className="bg-white/10 hover:bg-white/15 border border-white/10 text-white px-6 py-3 rounded-xl transition text-sm">
              🏡 Try Real Estate AI
            </Link>
            <Link href="/signup/agency" className="bg-white/10 hover:bg-white/15 border border-white/10 text-white px-6 py-3 rounded-xl transition text-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
