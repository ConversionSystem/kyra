'use client';

import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2, ArrowRight, ArrowLeft, Check, Bot, Sparkles, Zap,
  Building2, Globe, Phone, Clock, Calendar, MessageSquare,
  Shield, ChevronDown, Rocket, Target, Users, BookOpen,
  Brain, Headphones, Mail, BarChart3, CheckCircle2, Copy,
  Share2, X,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WizardData {
  // Step 1: About your business
  businessName: string;
  industry: string;
  customIndustry: string;
  websiteUrl: string;

  // Step 2: What should the AI do?
  useCases: string[];
  customUseCase: string;
  primaryGoal: string;

  // Step 3: Business details
  businessPhone: string;
  businessAddress: string;
  businessHours: string;
  services: string;
  bookingUrl: string;

  // Step 4: AI personality
  aiName: string;
  tone: string;
  greeting: string;

  // Step 5: Account
  email: string;
  fullName: string;
  password: string;
}

const INDUSTRIES = [
  { value: 'dental', label: 'Dental', emoji: '🦷' },
  { value: 'cannabis', label: 'Cannabis', emoji: '🌿' },
  { value: 'restaurant', label: 'Restaurant', emoji: '🍕' },
  { value: 'real-estate', label: 'Real Estate', emoji: '🏠' },
  { value: 'legal', label: 'Legal', emoji: '⚖️' },
  { value: 'plumbing', label: 'Plumbing/HVAC', emoji: '🔧' },
  { value: 'medspa', label: 'Med Spa/Beauty', emoji: '💆' },
  { value: 'fitness', label: 'Fitness/Gym', emoji: '💪' },
  { value: 'auto', label: 'Auto Services', emoji: '🚗' },
  { value: 'veterinary', label: 'Veterinary', emoji: '🐾' },
  { value: 'ecommerce', label: 'E-commerce', emoji: '🛒' },
  { value: 'consulting', label: 'Consulting', emoji: '📊' },
  { value: 'other', label: 'Other', emoji: '✨' },
];

const USE_CASES = [
  { id: 'answer-questions', label: 'Answer customer questions 24/7', emoji: '💬', desc: 'AI handles FAQs, pricing, hours — instant responses' },
  { id: 'book-appointments', label: 'Book appointments automatically', emoji: '📅', desc: 'Qualify leads and schedule meetings without staff' },
  { id: 'qualify-leads', label: 'Qualify and score leads', emoji: '🎯', desc: 'Ask the right questions, route hot leads to your team' },
  { id: 'customer-support', label: 'Handle customer support', emoji: '🎧', desc: 'Resolve issues, process requests, escalate when needed' },
  { id: 'follow-up', label: 'Follow up with leads', emoji: '📱', desc: 'Automated nurture sequences via text and chat' },
  { id: 'intake', label: 'Collect client information', emoji: '📋', desc: 'Intake forms, onboarding, data collection' },
  { id: 'voice-calls', label: 'Answer phone calls with AI', emoji: '📞', desc: 'AI receptionist that handles inbound calls' },
  { id: 'other', label: 'Something else', emoji: '🤖', desc: 'Tell us what you need' },
];

const TONES = [
  { value: 'friendly', label: 'Friendly & Warm', desc: 'Approachable, casual, like talking to a friend' },
  { value: 'professional', label: 'Professional & Polished', desc: 'Business-like, trustworthy, confidence-inspiring' },
  { value: 'casual', label: 'Casual & Fun', desc: 'Relaxed, uses humor, laid-back vibe' },
  { value: 'empathetic', label: 'Empathetic & Caring', desc: 'Gentle, understanding, patient — great for healthcare' },
  { value: 'direct', label: 'Direct & Efficient', desc: 'Straight to the point, no fluff, fast' },
];

const GOALS = [
  { value: 'more-bookings', label: 'Get more bookings/appointments' },
  { value: 'save-time', label: 'Save staff time on repetitive questions' },
  { value: 'capture-leads', label: 'Capture and qualify more leads' },
  { value: 'better-support', label: 'Provide better customer support' },
  { value: '24-7', label: 'Be available 24/7 (even outside hours)' },
  { value: 'reduce-costs', label: 'Reduce staffing costs' },
];

// ── Wizard Page ───────────────────────────────────────────────────────────────

function BuildPageInner() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const referralId = searchParams.get('ref') || (typeof document !== 'undefined'
    ? document.cookie.split('; ').find(r => r.startsWith('kyra_ref='))?.split('=')[1]
    : undefined) || undefined;

  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 5;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupComplete, setSignupComplete] = useState(false);
  const [agencyId, setAgencyId] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const [data, setData] = useState<WizardData>({
    businessName: '',
    industry: '',
    customIndustry: '',
    websiteUrl: '',
    useCases: [],
    customUseCase: '',
    primaryGoal: '',
    businessPhone: '',
    businessAddress: '',
    businessHours: '',
    services: '',
    bookingUrl: '',
    aiName: '',
    tone: 'friendly',
    greeting: '',
    email: '',
    fullName: '',
    password: '',
  });

  const update = (patch: Partial<WizardData>) => setData(prev => ({ ...prev, ...patch }));

  const toggleUseCase = (id: string) => {
    setData(prev => ({
      ...prev,
      useCases: prev.useCases.includes(id)
        ? prev.useCases.filter(u => u !== id)
        : [...prev.useCases, id],
    }));
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const canAdvance = (): boolean => {
    switch (step) {
      case 1: return data.businessName.trim().length > 0 && (data.industry !== '' || data.customIndustry.trim().length > 0);
      case 2: return data.useCases.length > 0;
      case 3: return true; // all optional
      case 4: return true; // defaults work
      case 5: return data.email.trim().length > 0 && data.password.length >= 8;
      default: return false;
    }
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS && canAdvance()) {
      // Auto-generate AI name and greeting together if not set
      if (step === 3) {
        const names: Record<string, string> = {
          dental: 'Sarah', cannabis: 'Sage', restaurant: 'Chef', 'real-estate': 'Alex',
          legal: 'Jordan', plumbing: 'Mike', medspa: 'Luna', fitness: 'Coach',
          auto: 'Max', veterinary: 'Dr. Paws', ecommerce: 'Kai', consulting: 'Sam',
        };
        const resolvedName = data.aiName || names[data.industry] || 'Kyra';
        const resolvedGreeting = data.greeting || `Hi! I'm ${resolvedName} from ${data.businessName}. How can I help you today?`;
        update({
          ...(!data.aiName ? { aiName: resolvedName } : {}),
          ...(!data.greeting ? { greeting: resolvedGreeting } : {}),
        });
      }
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Build the persona from wizard data
      const industry = data.industry === 'other' ? data.customIndustry : (INDUSTRIES.find(i => i.value === data.industry)?.label || data.industry);
      const toneLabel = TONES.find(t => t.value === data.tone)?.label || data.tone;
      const useCaseLabels = data.useCases.map(id => USE_CASES.find(u => u.id === id)?.label || id);

      const persona = [
        `You are ${data.aiName || 'Kyra'}, an AI assistant for ${data.businessName}.`,
        industry ? `Industry: ${industry}.` : '',
        `Tone: ${toneLabel}. Always be helpful and represent ${data.businessName} professionally.`,
        useCaseLabels.length > 0 ? `Your main jobs: ${useCaseLabels.join(', ')}.` : '',
        data.services ? `Services: ${data.services}` : '',
        data.businessHours ? `Business hours: ${data.businessHours}` : '',
        data.businessPhone ? `Phone: ${data.businessPhone}` : '',
        data.businessAddress ? `Address: ${data.businessAddress}` : '',
        data.bookingUrl ? `When someone wants to book, direct them to: ${data.bookingUrl}` : '',
      ].filter(Boolean).join(' ');

      // Step 1: Create account via solo-signup
      const res = await fetch('/api/auth/solo-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: data.businessName,
          fullName: data.fullName || data.businessName,
          email: data.email,
          password: data.password,
          websiteUrl: data.websiteUrl || undefined,
          referralId,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Something went wrong. Please try again.');
        return;
      }

      // Step 2: Sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        setError('Account created but sign-in failed. Please go to the login page.');
        return;
      }

      // Step 3: Apply the wizard configuration to the client
      // Small delay ensures the Supabase session cookie is set in the browser before
      // making authenticated requests — without this the PATCH returns 401
      await new Promise(resolve => setTimeout(resolve, 300));

      if (result.clientId) {
        try {
          await fetch(`/api/agency/clients/${result.clientId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              container_config: {
                persona,
                // widget_greeting = first message visitors see in the chat widget
                widget_greeting: data.greeting || `Hi! I'm ${data.aiName || 'Kyra'} from ${data.businessName}. How can I help you today?`,
                // widget_title = header text in the chat panel
                widget_title: `Chat with ${data.businessName}`,
                // widget_color uses indigo default — can be customised later
                business_name: data.businessName,
                business_phone: data.businessPhone || undefined,
                business_address: data.businessAddress || undefined,
                business_hours: data.businessHours || undefined,
                services: data.services || undefined,
                calendar_url: data.bookingUrl || undefined,
                industry: industry,
                ai_name: data.aiName || 'Kyra',
                tone: data.tone,
                use_cases: data.useCases,
                website_url: data.websiteUrl || undefined,
              },
            }),
          });
        } catch {
          // Non-blocking — config saves even if this fails
        }

        // Step 4: Auto-train from website if provided
        if (data.websiteUrl) {
          try {
            await fetch('/api/agency/knowledge/auto-train', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientId: result.clientId, websiteUrl: data.websiteUrl }),
            });
          } catch {
            // Non-blocking — auto-train runs async
          }
        }
      }

      setAgencyId(result.agencyId || '');
      setStep(6); // success step
      setSignupComplete(true);

      setTimeout(() => {
        router.push(`/signup/success?agencyId=${result.agencyId || ''}&next=/agency`);
        router.refresh();
      }, 6000);

    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const shareText = `I just built a free AI agent for my business with Kyra! 🤖 Try it → kyra.conversionsystem.com/get-started`;

  // ── Progress Bar ──────────────────────────────────────────────────────────
  const ProgressBar = () => (
    <div className="w-full max-w-lg mx-auto mb-8">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const s = i + 1;
          const done = s < step;
          const active = s === step;
          return (
            <div key={s} className="flex items-center gap-0 flex-1 last:flex-initial">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done ? 'bg-indigo-600 text-white' :
                active ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20' :
                'bg-white/10 text-slate-500'
              }`}>
                {done ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < TOTAL_STEPS && (
                <div className={`flex-1 h-0.5 mx-1 transition-all ${
                  done ? 'bg-indigo-600' : 'bg-white/10'
                }`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
        <span>Business</span>
        <span>Use Case</span>
        <span>Details</span>
        <span>Personality</span>
        <span>Account</span>
      </div>
    </div>
  );

  // ── Step renderers (inline JSX, NOT component functions — avoids unmount/remount on keystroke)
  const step1Content = (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white">Tell us about your business</h2>
        <p className="text-slate-400 mt-1">We&apos;ll use this to customize your AI agent.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Business name *</label>
          <input
            type="text"
            value={data.businessName}
            onChange={e => update({ businessName: e.target.value })}
            placeholder="e.g., Smile Dental Clinic"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Industry *</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {INDUSTRIES.map(ind => (
              <button
                key={ind.value}
                onClick={() => update({ industry: ind.value })}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-sm transition-all ${
                  data.industry === ind.value
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <span className="text-lg">{ind.emoji}</span>
                <span className="text-xs font-medium">{ind.label}</span>
              </button>
            ))}
          </div>
          {data.industry === 'other' && (
            <input
              type="text"
              value={data.customIndustry}
              onChange={e => update({ customIndustry: e.target.value })}
              placeholder="What industry?"
              className="w-full mt-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Website URL <span className="text-slate-500">(optional — we&apos;ll train your AI from it)</span>
          </label>
          <input
            type="url"
            value={data.websiteUrl}
            onChange={e => update({ websiteUrl: e.target.value })}
            placeholder="https://yourwebsite.com"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );

  // ── Step 2: What Should the AI Do? ────────────────────────────────────────
  const step2Content = (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white">What should your AI do?</h2>
        <p className="text-slate-400 mt-1">Select all that apply. We&apos;ll configure the perfect agent for you.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {USE_CASES.map(uc => {
          const selected = data.useCases.includes(uc.id);
          return (
            <button
              key={uc.id}
              onClick={() => toggleUseCase(uc.id)}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                selected
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <span className="text-2xl shrink-0 mt-0.5">{uc.emoji}</span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-300'}`}>{uc.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{uc.desc}</p>
              </div>
              {selected && <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5 ml-auto" />}
            </button>
          );
        })}
      </div>

      {data.useCases.includes('other') && (
        <input
          type="text"
          value={data.customUseCase}
          onChange={e => update({ customUseCase: e.target.value })}
          placeholder="Describe what you need the AI to do..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">What&apos;s your #1 goal?</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => update({ primaryGoal: g.value })}
              className={`px-4 py-2.5 rounded-xl border text-sm text-left transition-all ${
                data.primaryGoal === g.value
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step 3: Business Details ──────────────────────────────────────────────
  const step3Content = (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white">Business details</h2>
        <p className="text-slate-400 mt-1">Help your AI answer accurately. All fields are optional — fill what you can.</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              <Phone className="inline h-3.5 w-3.5 mr-1" /> Phone
            </label>
            <input
              type="tel"
              value={data.businessPhone}
              onChange={e => update({ businessPhone: e.target.value })}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              <Clock className="inline h-3.5 w-3.5 mr-1" /> Hours
            </label>
            <input
              type="text"
              value={data.businessHours}
              onChange={e => update({ businessHours: e.target.value })}
              placeholder="Mon-Fri 9am-5pm"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            <Building2 className="inline h-3.5 w-3.5 mr-1" /> Address
          </label>
          <input
            type="text"
            value={data.businessAddress}
            onChange={e => update({ businessAddress: e.target.value })}
            placeholder="123 Main St, Springfield, IL"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            <Sparkles className="inline h-3.5 w-3.5 mr-1" /> Services you offer
          </label>
          <textarea
            value={data.services}
            onChange={e => update({ services: e.target.value })}
            placeholder={'e.g.,\nTeeth Cleaning — $150\nWhitening — $300\nCrowns — $800-1200\nEmergency Visit — $200'}
            rows={4}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            <Calendar className="inline h-3.5 w-3.5 mr-1" /> Booking/Calendar URL
          </label>
          <input
            type="url"
            value={data.bookingUrl}
            onChange={e => update({ bookingUrl: e.target.value })}
            placeholder="https://calendly.com/your-link"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );

  // ── Step 4: AI Personality ────────────────────────────────────────────────
  const step4Content = (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white">Give your AI a personality</h2>
        <p className="text-slate-400 mt-1">Make it feel like YOUR business, not a generic chatbot.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">AI Name</label>
          <input
            type="text"
            value={data.aiName}
            onChange={e => update({ aiName: e.target.value })}
            placeholder="e.g., Sarah, Alex, Dr. Paws"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
          <p className="text-xs text-slate-500 mt-1">This is what your AI introduces itself as to customers.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Tone & Style</label>
          <div className="grid grid-cols-1 gap-2">
            {TONES.map(t => (
              <button
                key={t.value}
                onClick={() => update({ tone: t.value })}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  data.tone === t.value
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  data.tone === t.value ? 'bg-indigo-500' : 'bg-white/20'
                }`} />
                <div>
                  <p className={`text-sm font-semibold ${data.tone === t.value ? 'text-white' : 'text-slate-300'}`}>{t.label}</p>
                  <p className="text-xs text-slate-500">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">First message to customers</label>
          <textarea
            value={data.greeting}
            onChange={e => update({ greeting: e.target.value })}
            placeholder={`Hi! I'm ${data.aiName || 'your AI assistant'} from ${data.businessName || 'your business'}. How can I help you today?`}
            rows={2}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-y"
          />
        </div>
      </div>
    </div>
  );

  // ── Step 5: Create Account ────────────────────────────────────────────────
  const step5Content = (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-white">Last step — create your account</h2>
        <p className="text-slate-400 mt-1">Your AI agent will be live in seconds.</p>
      </div>

      {/* Summary card */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Your AI Agent</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">{data.aiName || 'Kyra'} — {data.businessName}</p>
            <p className="text-xs text-slate-400">
              {data.useCases.length} use case{data.useCases.length !== 1 ? 's' : ''} · {TONES.find(t => t.value === data.tone)?.label || data.tone}
              {data.websiteUrl && ' · Trained from website'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Your name</label>
          <input
            type="text"
            value={data.fullName}
            onChange={e => update({ fullName: e.target.value })}
            placeholder="John Smith"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
          <input
            type="email"
            value={data.email}
            onChange={e => update({ email: e.target.value })}
            placeholder="you@yourbusiness.com"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Password * <span className="text-slate-500">(min 8 characters)</span></label>
          <input
            type="password"
            value={data.password}
            onChange={e => update({ password: e.target.value })}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <X className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <div className="text-xs text-slate-500 text-center">
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </div>
    </div>
  );

  // ── Step 6: Success ───────────────────────────────────────────────────────
  const step6Content = (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-green-400" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white">Your AI agent is live! 🎉</h2>
        <p className="text-slate-400 mt-2">
          <strong className="text-white">{data.aiName || 'Kyra'}</strong> is now ready to work for <strong className="text-white">{data.businessName}</strong>.
          {data.websiteUrl && ' Training from your website is happening in the background.'}
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2">
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">What happens next</p>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" /> AI agent deployed and learning your business</li>
          <li className="flex items-start gap-2"><Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" /> 50 free credits to get started</li>
          <li className="flex items-start gap-2"><ArrowRight className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" /> Dashboard opens in a few seconds...</li>
        </ul>
      </div>

      {/* Share */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-300">Share with a friend — you both get bonus credits!</p>
        <div className="flex justify-center gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm text-white font-medium transition flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" /> Tweet
          </a>
          <button
            onClick={() => { navigator.clipboard.writeText('https://kyra.conversionsystem.com/get-started'); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-sm text-white font-medium transition flex items-center gap-2"
          >
            {linkCopied ? <><Check className="h-4 w-4 text-green-400" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Link</>}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Kyra</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition">
            Already have an account? <span className="text-indigo-400 font-medium">Log in</span>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg">
          {step <= TOTAL_STEPS && (
            <>
              {/* Hero badge */}
              {step === 1 && (
                <div className="text-center mb-6">
                  <span className="inline-flex items-center gap-1.5 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-1.5 text-sm font-medium text-green-300 mb-4">
                    <Zap className="h-3.5 w-3.5" /> 100% Free — No credit card required
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                    We&apos;ll build your AI agent
                    <span className="text-indigo-400"> in 2 minutes</span>
                  </h1>
                  <p className="text-slate-400 mt-2 text-base">
                    Answer a few questions and we&apos;ll create a custom AI worker trained for your business — powered by OpenClaw.
                  </p>
                </div>
              )}

              <ProgressBar />

              {/* Steps */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8">
                {step === 1 && step1Content}
                {step === 2 && step2Content}
                {step === 3 && step3Content}
                {step === 4 && step4Content}
                {step === 5 && step5Content}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
                  {step > 1 ? (
                    <button
                      onClick={prevStep}
                      className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition"
                    >
                      <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < TOTAL_STEPS ? (
                    <button
                      onClick={nextStep}
                      disabled={!canAdvance()}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
                    >
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={!canAdvance() || isLoading}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
                    >
                      {isLoading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Building your AI...</>
                      ) : (
                        <><Rocket className="h-4 w-4" /> Build My AI Agent — Free</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Trust signals */}
              {step === 1 && (
                <div className="mt-8 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-6 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> No credit card</span>
                    <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Live in 2 minutes</span>
                    <span className="flex items-center gap-1"><Bot className="h-3.5 w-3.5" /> Powered by OpenClaw</span>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 6 && step6Content}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4">
        <div className="max-w-3xl mx-auto px-4 text-center text-xs text-slate-600">
          Powered by <a href="https://openclaw.ai" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">OpenClaw</a> · Built by <a href="https://conversionsystem.com" className="text-indigo-400 hover:text-indigo-300" target="_blank" rel="noopener noreferrer">Conversion System</a>
        </div>
      </footer>
    </div>
  );
}

export default function BuildPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    }>
      <BuildPageInner />
    </Suspense>
  );
}
