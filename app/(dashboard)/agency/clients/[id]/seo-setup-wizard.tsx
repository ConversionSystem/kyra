'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
        body: JSON.stringify({
          templateId: 'vet-seo-worker',
          clientId,
          setupData: data,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Activation failed');

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm';
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
              step > s.id ? 'bg-green-600 text-white' :
              step === s.id ? 'bg-indigo-600 text-white' :
              'bg-gray-700 text-gray-400'
            }`}>
              {step > s.id ? <Check className="w-4 h-4" /> : s.id}
            </div>
            <span className={`ml-2 text-xs hidden sm:inline ${
              step === s.id ? 'text-white' : 'text-gray-500'
            }`}>{s.title}</span>
            {i < STEPS.length - 1 && (
              <div className={`w-8 sm:w-16 h-0.5 mx-2 ${
                step > s.id ? 'bg-green-600' : 'bg-gray-700'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        {/* Step 1: Clinic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-indigo-400" />
              Clinic Information
            </h3>
            <div>
              <label className={labelClass}>Clinic Name *</label>
              <input className={inputClass} value={data.clinic_name} onChange={(e) => updateField('clinic_name', e.target.value)} placeholder="Goodrich Veterinary Clinic" />
            </div>
            <div>
              <label className={labelClass}>Lead Veterinarian Name *</label>
              <input className={inputClass} value={data.vet_name} onChange={(e) => updateField('vet_name', e.target.value)} placeholder="Dr. Sarah Johnson" />
            </div>
            <div>
              <label className={labelClass}>Phone Number *</label>
              <input className={inputClass} value={data.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="(402) 555-0123" />
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-400" />
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
              <p className="text-xs text-gray-500 mt-1">Optional — the Google Maps link to the business listing</p>
            </div>
          </div>
        )}

        {/* Step 3: Services */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-400" />
              Services Offered
            </h3>
            <p className="text-sm text-gray-400">Select all services this clinic provides. These drive content creation and keyword targeting.</p>
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_OPTIONS.map((service) => (
                <button
                  key={service.value}
                  onClick={() => toggleService(service.value)}
                  className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    data.services.includes(service.value)
                      ? 'bg-indigo-600/30 border border-indigo-500 text-indigo-200'
                      : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {data.services.includes(service.value) ? '✓ ' : ''}{service.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">{data.services.length} selected</p>
          </div>
        )}

        {/* Step 4: SEO Settings */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-400" />
              SEO Settings
            </h3>
            <div>
              <label className={labelClass}>Content Tone *</label>
              <select
                className={inputClass}
                value={data.content_tone}
                onChange={(e) => updateField('content_tone', e.target.value)}
              >
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
              <p className="text-xs text-gray-500 mt-1">Comma-separated. Leave blank to auto-generate based on city and services.</p>
            </div>
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Ready to Activate
            </h3>

            <div className="bg-gray-900 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Clinic</span>
                <span className="text-white">{data.clinic_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Veterinarian</span>
                <span className="text-white">{data.vet_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">City</span>
                <span className="text-white">{data.city}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Services</span>
                <span className="text-white">{data.services.length} selected</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Content Tone</span>
                <span className="text-white capitalize">{data.content_tone}</span>
              </div>
            </div>

            <div className="bg-indigo-900/20 border border-indigo-700/50 rounded-lg p-4">
              <p className="text-sm text-indigo-200 font-medium">Veterinary SEO Worker — $79/mo</p>
              <p className="text-xs text-indigo-300/70 mt-1">
                Includes: GEO testing, NAP auditing, content creation, multi-platform publishing,
                Reddit monitoring, outreach scouting, weekly reports. All AI and API costs included.
              </p>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>✓ First GEO visibility test runs immediately after activation</p>
              <p>✓ NAP audit runs on the next Wednesday</p>
              <p>✓ Content creation begins Tuesday</p>
              <p>✓ All content goes through your review queue before publishing</p>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : (
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          )}
        </div>
        <div>
          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleActivate}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Activating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1" /> Activate SEO Worker — $79/mo</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
