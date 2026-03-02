'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, ArrowRight, ArrowLeft, Rocket, Copy, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const INDUSTRIES = [
  { id: 'plumbing', label: 'Plumbing', emoji: '🔧' },
  { id: 'hvac', label: 'HVAC', emoji: '❄️' },
  { id: 'electrical', label: 'Electrical', emoji: '⚡' },
  { id: 'cleaning', label: 'Cleaning', emoji: '🧹' },
  { id: 'landscaping', label: 'Landscaping', emoji: '🌿' },
  { id: 'roofing', label: 'Roofing', emoji: '🏠' },
  { id: 'dental', label: 'Dental', emoji: '🦷' },
  { id: 'real-estate', label: 'Real Estate', emoji: '🏡' },
  { id: 'medspa', label: 'Med Spa', emoji: '💆' },
  { id: 'law-firm', label: 'Law Firm', emoji: '⚖️' },
  { id: 'auto-repair', label: 'Auto Repair', emoji: '🚗' },
  { id: 'gym', label: 'Gym & Fitness', emoji: '🏋️' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍕' },
  { id: 'photography', label: 'Photography', emoji: '📸' },
  { id: 'other', label: 'Other', emoji: '🏢' },
];

const TONES = [
  { id: 'professional', label: 'Professional', emoji: '👔', desc: 'Formal and trustworthy' },
  { id: 'friendly', label: 'Friendly', emoji: '😊', desc: 'Warm and approachable' },
  { id: 'casual', label: 'Casual', emoji: '🤙', desc: 'Relaxed and conversational' },
  { id: 'luxury', label: 'Luxury', emoji: '✨', desc: 'Elegant and premium' },
];

interface Props { agencyId: string; existingName: string; }

export function SetupWizardClient({ agencyId, existingName }: Props) {
  const [step, setStep] = useState(1);
  const [industry, setIndustry] = useState('');
  const [businessName, setBusinessName] = useState(existingName || '');
  const [ownerName, setOwnerName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [services, setServices] = useState('');
  const [hours, setHours] = useState('');
  const [specialOffer, setSpecialOffer] = useState('');
  const [aiName, setAiName] = useState('Alex');
  const [tone, setTone] = useState('friendly');
  const [reviewLink, setReviewLink] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<{
    deployed: { personality: boolean; agents: number; autopilot: number; reviewEngine: boolean; paymentCollection: boolean; customerMemory: boolean; webChat: boolean };
    embedCode: string;
    soulPreview: string;
    nextSteps: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const totalSteps = 5;
  const progress = Math.min((step / totalSteps) * 100, 100);

  const canProceed = () => {
    if (step === 1) return !!industry;
    if (step === 2) return !!businessName && !!ownerName;
    if (step === 3) return !!services;
    if (step === 4) return !!aiName && !!tone;
    return true;
  };

  const deploy = async () => {
    setDeploying(true);
    try {
      const res = await fetch('/api/business-box', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, businessName, ownerName, city, phone, website, services, businessHours: hours, specialOffer, aiName, tone, reviewLink, bookingUrl }),
      });
      const data = await res.json();
      if (data.success) { setResult(data); setStep(5); }
    } catch { /* ignore */ }
    setDeploying(false);
  };

  const copyEmbed = () => {
    if (result?.embedCode) {
      navigator.clipboard.writeText(result.embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500">{step < 5 ? `Step ${step} of 4` : '🎉 Complete!'}</p>
          <p className="text-sm text-gray-400">{Math.round(progress)}%</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Step 1: Industry */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">What kind of business do you run?</h1>
            <p className="text-gray-500 mt-1">We&apos;ll customize your AI worker for your industry.</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {INDUSTRIES.map(ind => (
              <button key={ind.id} onClick={() => setIndustry(ind.id)} className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                industry === ind.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300',
              )}>
                <span className="text-2xl">{ind.emoji}</span>
                <span className="text-xs text-gray-700 text-center">{ind.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Business Details */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tell us about your business</h1>
            <p className="text-gray-500 mt-1">Your AI worker will use this information in conversations.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Business Name <span className="text-red-500">*</span></label>
              <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Mike's Plumbing" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Your Name <span className="text-red-500">*</span></label>
              <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Mike Johnson" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">City / Area</label>
                <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Austin, TX" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Phone</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="555-123-4567" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Website</label>
              <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://mikesplumbing.com" />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Services */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">What do you offer?</h1>
            <p className="text-gray-500 mt-1">List your services and pricing. Your AI will quote these to customers.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Services & Pricing <span className="text-red-500">*</span></label>
              <textarea value={services} onChange={e => setServices(e.target.value)} placeholder={"Drain cleaning: $99-$175\nFaucet repair: $150-$300\nWater heater: $800-$2,500"} rows={5} className="w-full bg-white border border-gray-200 text-gray-900 rounded-md p-3 text-sm resize-y focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Business Hours</label>
              <Input value={hours} onChange={e => setHours(e.target.value)} placeholder="Mon-Fri 8am-6pm, Sat 9am-2pm" />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Current Special Offer (optional)</label>
              <Input value={specialOffer} onChange={e => setSpecialOffer(e.target.value)} placeholder="20% off first service" />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: AI Personality */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Design your AI worker</h1>
            <p className="text-gray-500 mt-1">Give it a name and personality. Customers will talk to this AI.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">AI Name <span className="text-red-500">*</span></label>
              <Input value={aiName} onChange={e => setAiName(e.target.value)} placeholder="Alex" />
              <p className="text-gray-400 text-xs mt-1">Customers will see: &quot;Hi! I&apos;m {aiName || 'Alex'}, the AI assistant for {businessName || 'your business'}&quot;</p>
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-2 block">Tone</label>
              <div className="grid grid-cols-2 gap-3">
                {TONES.map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)} className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    tone === t.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300',
                  )}>
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <p className="text-sm text-gray-900 font-medium">{t.label}</p>
                      <p className="text-xs text-gray-500">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Google Review Link</label>
                <Input value={reviewLink} onChange={e => setReviewLink(e.target.value)} placeholder="https://g.page/..." />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Booking URL</label>
                <Input value={bookingUrl} onChange={e => setBookingUrl(e.target.value)} placeholder="https://calendly.com/..." />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Deployed */}
      {step === 5 && result && (
        <div className="space-y-6">
          <div className="text-center py-4">
            <div className="text-6xl mb-4">🚀</div>
            <h1 className="text-3xl font-bold text-gray-900">Your AI Worker is Live!</h1>
            <p className="text-gray-500 mt-2">{aiName} is ready to handle customers for {businessName}.</p>
          </div>

          <Card>
            <CardContent className="py-4 space-y-2">
              {result.deployed.personality && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-gray-700 text-sm">AI Personality configured</span></div>}
              {result.deployed.agents > 0 && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-gray-700 text-sm">{result.deployed.agents} AI agents enabled</span></div>}
              {result.deployed.autopilot > 0 && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-gray-700 text-sm">{result.deployed.autopilot} autopilot actions scheduled</span></div>}
              {result.deployed.reviewEngine && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-gray-700 text-sm">Review generation ready</span></div>}
              {result.deployed.paymentCollection && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-gray-700 text-sm">Payment collection ready</span></div>}
              {result.deployed.customerMemory && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-gray-700 text-sm">Customer memory active</span></div>}
              {result.deployed.webChat && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-gray-700 text-sm">Web chat widget ready</span></div>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-gray-500 mb-2">Embed Code — add this to your website</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-blue-700 text-xs font-mono overflow-x-auto">{result.embedCode}</code>
                <Button size="sm" variant="outline" className="shrink-0" onClick={copyEmbed}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-gray-500 mb-3">Next Steps</p>
              <div className="space-y-2">
                {result.nextSteps.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Badge variant="outline" className="text-xs mt-0.5 shrink-0">{i + 1}</Badge>
                    <span className="text-gray-700 text-sm">{s}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => window.location.href = '/agency'} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg">
            Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      {step < 5 && (
        <div className="flex items-center justify-between mt-8">
          <Button variant="ghost" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="text-gray-500">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="bg-blue-600 hover:bg-blue-700 text-white">
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={deploy} disabled={!canProceed() || deploying} className="bg-green-600 hover:bg-green-700 text-white px-8">
              {deploying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deploying...</> : <><Rocket className="w-4 h-4 mr-2" /> Deploy AI Worker</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
