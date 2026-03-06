'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight, ArrowLeft, Check, Loader2, Search, MapPin,
  Stethoscope, Globe, Sparkles,
} from 'lucide-react';

interface SEOSetupWizardProps {
  clientId: string;
  clientName: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface SetupData {
  clinic_name: string;
  address: string;
  phone: string;
  website: string;
  gbp_url: string;
  vet_name: string;
  city: string;
  services: string[];
  target_keywords: string;
  content_tone: string;
}

const SERVICE_OPTIONS = [
  { value: 'wellness', label: 'Wellness & Preventive Care' },
  { value: 'dental', label: 'Pet Dental Care' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'emergency', label: 'Emergency & Critical Care' },
  { value: 'exotic', label: 'Exotic Pets' },
  { value: 'boarding', label: 'Boarding & Grooming' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'oncology', label: 'Oncology' },
  { value: 'rehabilitation', label: 'Rehabilitation & Physical Therapy' },
  { value: 'nutrition', label: 'Nutrition & Weight Management' },
];

const STEPS = [
  { id: 1, title: 'Clinic Info', icon: Stethoscope },
  { id: 2, title: 'Location', icon: MapPin },
  { id: 3, title: 'Services', icon: Search },
  { id: 4, title: 'SEO Settings', icon: Globe },
  { id: 5, title: 'Confirm', icon: Sparkles },
];

export function SEOSetupWizard({ clientId, clientName, onComplete, onCancel }: SEOSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SetupData>({
    clinic_name: clientName,
    address: '',
    phone: '',
    website: '',
    gbp_url: '',
    vet_name: '',
    city: '',
    services: [],
    target_keywords: '',
    content_tone: 'friendly',
  });

  const updateField = (field: keyof SetupData, value: string | string[]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleService = (service: string) => {
    setData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!(data.clinic_name && data.vet_name && data.phone);
      case 2: return !!(data.address && data.city && data.website);
      case 3: return data.services.length > 0;
      case 4: return !!data.content_tone;
      default: return true;
    }
  };

  const handleActivate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/premium-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 'vet-seo-worker', clientId, setupData: data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Activation failed');
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else if (result.redirectUrl) {
        // Redirect directly to the client's SEO tab
        window.location.href = result.redirectUrl;
      } else {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
              step > s.id ? 'bg-emerald-500 text-white' :
              step === s.id ? 'bg-blue-600 text-white' :
              'bg-gray-100 text-gray-400'
            }`}>
              {step > s.id ? <Check className="w-4 h-4" /> : s.id}
            </div>
            <span className={`ml-2 text-xs hidden sm:inline ${
              step === s.id ? 'text-gray-900 font-medium' : 'text-gray-400'
            }`}>{s.title}</span>
            {i < STEPS.length - 1 && (
              <div className={`w-6 sm:w-12 h-0.5 mx-2 ${
                step > s.id ? 'bg-emerald-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-indigo-600" />
                Clinic Information
              </h3>
              <div>
                <label className={labelClass}>Clinic Name *</label>
                <input className={inputClass} value={data.clinic_name} onChange={(e) => updateField('clinic_name', e.target.value)} placeholder="Goodrich Veterinary Clinic" />
              </div>
              <div>
                <label className={labelClass}>Lead Veterinarian *</label>
                <input className={inputClass} value={data.vet_name} onChange={(e) => updateField('vet_name', e.target.value)} placeholder="Dr. Sarah Johnson" />
              </div>
              <div>
                <label className={labelClass}>Phone Number *</label>
                <input className={inputClass} value={data.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="(402) 555-0123" />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Location & Web Presence
              </h3>
              <div>
                <label className={labelClass}>Full Address *</label>
                <input className={inputClass} value={data.address} onChange={(e) => updateField('address', e.target.value)} placeholder="1234 Main St, Omaha, NE 68102" />
              </div>
              <div>
                <label className={labelClass}>City / Metro Area *</label>
                <input className={inputClass} value={data.city} onChange={(e) => updateField('city', e.target.value)} placeholder="Omaha" />
              </div>
              <div>
                <label className={labelClass}>Website URL *</label>
                <input className={inputClass} value={data.website} onChange={(e) => updateField('website', e.target.value)} placeholder="https://goodrichvet.com" />
              </div>
              <div>
                <label className={labelClass}>Google Business Profile URL</label>
                <input className={inputClass} value={data.gbp_url} onChange={(e) => updateField('gbp_url', e.target.value)} placeholder="https://maps.google.com/..." />
                <p className="text-xs text-gray-400 mt-1">Optional — the Google Maps link to the listing</p>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Services Offered
              </h3>
              <p className="text-sm text-gray-500">Select all services this clinic provides. These drive keyword targeting and content creation.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SERVICE_OPTIONS.map((service) => (
                  <button
                    key={service.value}
                    onClick={() => toggleService(service.value)}
                    className={`px-3 py-2 rounded-md text-sm text-left transition-colors border ${
                      data.services.includes(service.value)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {data.services.includes(service.value) && <Check className="w-3 h-3 inline mr-1" />}
                    {service.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">{data.services.length} service{data.services.length !== 1 ? 's' : ''} selected</p>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" />
                SEO Settings
              </h3>
              <div>
                <label className={labelClass}>Content Tone *</label>
                <select className={inputClass} value={data.content_tone} onChange={(e) => updateField('content_tone', e.target.value)}>
                  <option value="professional">Professional & Clinical</option>
                  <option value="friendly">Warm & Friendly</option>
                  <option value="community">Community-Focused</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Target Keywords</label>
                <textarea
                  className={`${inputClass} h-24 resize-none`}
                  value={data.target_keywords}
                  onChange={(e) => updateField('target_keywords', e.target.value)}
                  placeholder="best vet omaha, emergency vet omaha, pet dental omaha"
                />
                <p className="text-xs text-gray-400 mt-1">Comma-separated. Leave blank to auto-generate.</p>
              </div>
            </div>
          )}

          {/* Step 5 */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Ready to Activate
              </h3>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                {[
                  ['Clinic', data.clinic_name],
                  ['Veterinarian', data.vet_name],
                  ['City', data.city],
                  ['Services', `${data.services.length} selected`],
                  ['Content Tone', data.content_tone],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-gray-900 font-medium capitalize">{value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900">🐾 Veterinary SEO Worker — $79/mo</p>
                <p className="text-xs text-blue-700 mt-1">
                  Includes all LLM tokens, Firecrawl, Perplexity, and infrastructure. GEO testing, NAP auditing, content creation, multi-platform publishing, Reddit monitoring, outreach scouting, weekly reports.
                </p>
              </div>

              <div className="space-y-1">
                {[
                  'First GEO visibility test runs immediately after activation',
                  'NAP audit runs on the next Wednesday',
                  'Content creation begins Tuesday',
                  'All content goes through your review queue before publishing',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-5">
        <div>
          {step > 1
            ? <Button variant="outline" onClick={() => setStep(step - 1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            : <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          }
        </div>
        <div>
          {step < 5
            ? <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            : <Button onClick={handleActivate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Activating...</>
                  : <><Sparkles className="w-4 h-4 mr-1" /> Activate SEO Worker — $79/mo</>
                }
              </Button>
          }
        </div>
      </div>
    </div>
  );
}
