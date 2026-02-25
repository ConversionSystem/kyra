'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Calendar, MessageSquare, Zap, ChevronRight } from 'lucide-react';

interface DemoMessage { from: 'contact' | 'ai'; text: string; delay: number; }
interface Stat { label: string; value: string; }
interface ROI { monthlyLeads: number; closeRate: number; avgDeal: number; }

interface Props {
  demo: {
    title: string; subtitle: string; contactName: string; businessType: string;
    accentColor: string; emoji: string;
    conversation: DemoMessage[]; stats: Stat[]; roi: ROI;
  };
  industry: string;
  agencyId: string;
  agencyName: string;
  agencyLogo: string | null;
  calendarUrl: string | null;
}

// ── Animated chat ─────────────────────────────────────────────────────────────
function AnimatedChat({ conversation, contactName, accentColor }: {
  conversation: DemoMessage[]; contactName: string; accentColor: string;
}) {
  const [visible, setVisible] = useState<number[]>([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let totalDelay = 800;
    conversation.forEach((msg, i) => {
      const delay = totalDelay;
      totalDelay += msg.delay + 500;
      if (msg.from === 'ai') {
        setTimeout(() => setTyping(true), delay - 500);
      }
      setTimeout(() => {
        setTyping(false);
        setVisible(prev => [...prev, i]);
      }, delay);
    });
  }, [conversation]);

  return (
    <div className="bg-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-w-sm w-full">
      {/* SMS header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/10" style={{ background: accentColor + '22' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: accentColor }}>🤖</div>
        <div>
          <p className="text-white text-sm font-semibold">AI Worker</p>
          <p className="text-white/50 text-xs">SMS · Powered by Kyra AI</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-[10px]">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 min-h-[280px]">
        {conversation.map((msg, i) => (
          visible.includes(i) ? (
            <div key={i} className={`flex ${msg.from === 'contact' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.from === 'contact'
                    ? 'bg-white/10 text-white rounded-br-sm'
                    : 'text-white rounded-bl-sm'
                }`}
                style={msg.from === 'ai' ? { background: accentColor } : {}}
              >
                {msg.text}
              </div>
            </div>
          ) : null
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: accentColor + '66' }}>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
        <div className="flex-1 bg-white/5 rounded-full px-4 py-2 text-white/30 text-xs">Message...</div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: accentColor }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </div>
      </div>
    </div>
  );
}

// ── ROI Calculator ────────────────────────────────────────────────────────────
function ROISection({ roi, accentColor }: { roi: ROI; accentColor: string }) {
  const [leads, setLeads] = useState(roi.monthlyLeads);
  const responseRate = 0.85; // AI responds to 85% of leads
  const extraConversions = Math.round(leads * responseRate * roi.closeRate * 0.3);
  const extraRevenue = extraConversions * roi.avgDeal;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
      <div>
        <h3 className="text-white font-bold text-lg mb-1">💰 Your ROI Calculator</h3>
        <p className="text-white/50 text-sm">Drag to see your numbers</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-white/70 text-sm">Monthly inbound leads</label>
          <span className="text-white font-bold tabular-nums">{leads}</span>
        </div>
        <input
          type="range" min={10} max={1000} step={10} value={leads}
          onChange={e => setLeads(+e.target.value)}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Leads the AI handles', value: `${Math.round(leads * responseRate)}`, sub: '85% response rate' },
          { label: 'Extra sales per month', value: `+${extraConversions}`, sub: 'from faster follow-up' },
          { label: 'Extra revenue / month', value: `$${extraRevenue.toLocaleString()}`, sub: 'conservative estimate' },
          { label: 'AI cost / month', value: '$99', sub: 'Lite plan' },
        ].map(card => (
          <div key={card.label} className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white font-bold text-xl tabular-nums">{card.value}</p>
            <p className="text-white/70 text-xs mt-0.5">{card.label}</p>
            <p className="text-white/40 text-[10px] mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3 text-center" style={{ background: accentColor + '33', border: `1px solid ${accentColor}55` }}>
        <p className="text-white/70 text-xs">Monthly ROI</p>
        <p className="text-white font-black text-2xl" style={{ color: accentColor === '#4f46e5' ? '#a5b4fc' : 'white' }}>
          {extraRevenue > 0 ? `${Math.round((extraRevenue / 97) * 10) / 10}x` : '—'}
        </p>
        <p className="text-white/50 text-xs">return on investment</p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PitchContent({ demo, industry, agencyId, agencyName, agencyLogo, calendarUrl }: Props) {
  const signupUrl = `https://kyra.conversionsystem.com/signup/agency?ref=${agencyId}`;
  const bookUrl = calendarUrl || `mailto:info@${agencyName.toLowerCase().replace(/\s+/g, '')}.com?subject=AI%20Employee%20Demo%20Request`;

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(160deg, #0a0a14 0%, #0f0f1f 50%, #0a0a14 100%)' }}>
      {/* Agency header bar */}
      <div className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {agencyLogo
            ? <img src={agencyLogo} alt={agencyName} className="h-7 object-contain" />
            : <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ background: demo.accentColor }}>{agencyName[0]}</div>
          }
          <span className="text-white/80 text-sm font-medium">{agencyName}</span>
        </div>
        <a
          href={bookUrl}
          target="_blank" rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-full font-semibold text-white"
          style={{ background: demo.accentColor }}
        >
          Book a Demo
        </a>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-20">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold border border-white/20 text-white/60">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            Live AI demo for {demo.businessType}s
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight">
            {demo.emoji} {demo.title.split(' for ')[0]}
            <span className="block text-2xl sm:text-3xl font-semibold mt-2" style={{ color: demo.accentColor }}>
              for {demo.businessType}s
            </span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">{demo.subtitle}</p>
        </div>

        {/* Demo + ROI side by side */}
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="flex flex-col items-center gap-4">
            <p className="text-white/40 text-xs uppercase tracking-widest">Watch it work in real-time ↓</p>
            <AnimatedChat conversation={demo.conversation} contactName={demo.contactName} accentColor={demo.accentColor} />
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
              {demo.stats.map(s => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-white font-bold text-base">{s.value}</p>
                  <p className="text-white/50 text-[10px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <ROISection roi={demo.roi} accentColor={demo.accentColor} />
          </div>
        </div>

        {/* Feature grid */}
        <div>
          <h2 className="text-2xl font-bold text-center mb-8">What your AI worker does automatically</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '⚡', title: 'Responds in 60 seconds', desc: 'Every inbound SMS answered, day or night. No leads fall through the cracks.' },
              { icon: '🧠', title: 'Knows your business', desc: 'Trained on your services, pricing, and FAQs. Answers like a seasoned team member.' },
              { icon: '📅', title: 'Books appointments', desc: 'Sends your calendar link at the right moment. No back-and-forth phone calls.' },
              { icon: '🏷️', title: 'Updates your CRM', desc: 'Tags contacts, writes notes, and moves pipeline stages after every conversation.' },
              { icon: '🚨', title: 'Escalates to humans', desc: 'Detects frustrated customers and alerts you immediately. Never drops the ball.' },
              { icon: '📊', title: 'Reports every week', desc: 'Weekly performance email shows conversations, leads handled, and escalations.' },
            ].map(f => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2 hover:border-white/20 transition">
                <div className="text-2xl">{f.icon}</div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-white/50 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl p-8 text-center space-y-5 border border-white/10" style={{ background: `linear-gradient(135deg, ${demo.accentColor}22, ${demo.accentColor}11)` }}>
          <p className="text-3xl font-black">Ready to deploy your AI worker?</p>
          <p className="text-white/60 max-w-lg mx-auto">Works with GoHighLevel. Set up in under 10 minutes. Your AI starts handling leads immediately.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={bookUrl}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white transition hover:opacity-90"
              style={{ background: demo.accentColor }}
            >
              <Calendar className="h-4 w-4" />
              Book a Demo with {agencyName}
            </a>
            <a
              href={signupUrl}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-white/10 text-white border border-white/20 hover:bg-white/15 transition"
            >
              <Zap className="h-4 w-4" />
              Get Started Free
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="text-white/30 text-xs">No credit card required · Free plan available · Powered by GoHighLevel</p>
        </div>

        <footer className="text-center text-white/20 text-xs pb-4">
          Presented by <strong className="text-white/40">{agencyName}</strong> · Powered by <a href="https://kyra.conversionsystem.com" className="underline">Kyra AI</a>
        </footer>
      </div>
    </div>
  );
}
