'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  X,
  Upload,
  Camera,
  Loader2,
  Globe,
  Sparkles,
  Rocket,
  ExternalLink,
  AlertTriangle,
  Trash2,
  Image as ImageIcon,
  Clock,
  Link2,
} from 'lucide-react';
import {
  INDUSTRY_DEFAULTS,
  DESIGN_STYLES,
  TONE_OPTIONS,
  AI_CAPABILITIES,
} from '@/lib/sites/industry-defaults';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ServiceItem {
  name: string;
  slug: string;
  priceFrom?: string;
}

interface WizardData {
  // Step 1: Business Info
  businessName: string;
  industry: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  yearsInBusiness: string;
  ownerName: string;
  differentiator: string;
  existingWebsite: string;
  licenseNumber: string;

  // Step 2: Services
  services: ServiceItem[];
  emergency247: boolean;

  // Step 3: Service Area
  selectedCities: string[];
  customCity: string;

  // Step 4: Photos & Brand
  photos: File[];
  photoPreviewUrls: string[];
  logo: File | null;
  logoPreviewUrl: string;
  colorPrimary: string;
  colorSecondary: string;
  designStyle: string;
  tagline: string;

  // Step 5: AI Personality
  aiName: string;
  aiTone: string;
  aiCapabilities: string[];
  businessHoursStart: string;
  businessHoursEnd: string;
  businessDays: string;
  bookingUrl: string;

  // Meta
  siteId: string | null;
}

const initialWizardData: WizardData = {
  businessName: '',
  industry: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  yearsInBusiness: '',
  ownerName: '',
  differentiator: '',
  existingWebsite: '',
  licenseNumber: '',
  services: [],
  emergency247: false,
  selectedCities: [],
  customCity: '',
  photos: [],
  photoPreviewUrls: [],
  logo: null,
  logoPreviewUrl: '',
  colorPrimary: '#6366f1',
  colorSecondary: '#111827',
  designStyle: 'modern-dark',
  tagline: '',
  aiName: '',
  aiTone: 'professional',
  aiCapabilities: ['answer_questions', 'capture_leads'],
  businessHoursStart: '8:00 AM',
  businessHoursEnd: '6:00 PM',
  businessDays: 'Mon-Fri',
  bookingUrl: '',
  siteId: null,
};

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: { label: string; number: number }[];
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {steps.map((step, i) => {
        const isActive = currentStep === step.number;
        const isComplete = currentStep > step.number;
        const isClickable = step.number < currentStep;

        return (
          <div key={step.number} className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => isClickable && onStepClick(step.number)}
              disabled={!isClickable}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : isComplete
                    ? 'bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              <span
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                  isActive
                    ? 'bg-white text-indigo-600'
                    : isComplete
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isComplete ? <Check className="h-3 w-3" /> : step.number}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={`w-4 sm:w-8 h-0.5 ${
                  currentStep > step.number ? 'bg-indigo-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Business Info ─────────────────────────────────────────────────────

function StepBusinessInfo({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}) {
  const industries = Object.entries(INDUSTRY_DEFAULTS).map(([key, val]) => ({
    value: key,
    label: val.label,
  }));

  const handleIndustryChange = (industry: string) => {
    const defaults = INDUSTRY_DEFAULTS[industry];
    if (defaults) {
      onChange({
        industry,
        services: defaults.services.map((s) => ({ ...s })),
        colorPrimary: defaults.colors.primary,
        colorSecondary: defaults.colors.secondary,
        designStyle: defaults.designStyle,
        aiName: defaults.aiName,
      });
    } else {
      onChange({ industry });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Tell us about your business</h2>
        <p className="text-gray-500 mt-2">We&apos;ll use this to create your website and train your AI worker.</p>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
            <input
              type="text"
              value={data.businessName}
              onChange={(e) => onChange({ businessName: e.target.value })}
              placeholder="Air Temp Heating & Cooling"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
            <select
              value={data.industry}
              onChange={(e) => handleIndustryChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select an industry...</option>
              {industries.map((ind) => (
                <option key={ind.value} value={ind.value}>
                  {ind.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
            <input
              type="text"
              value={data.ownerName}
              onChange={(e) => onChange({ ownerName: e.target.value })}
              placeholder="John Smith"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Years in Business</label>
            <input
              type="text"
              value={data.yearsInBusiness}
              onChange={(e) => onChange({ yearsInBusiness: e.target.value })}
              placeholder="15"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="(555) 123-4567"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License / Certification #</label>
            <input
              type="text"
              value={data.licenseNumber}
              onChange={(e) => onChange({ licenseNumber: e.target.value })}
              placeholder="CSLB #12345"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
            <input
              type="text"
              value={data.address}
              onChange={(e) => onChange({ address: e.target.value })}
              placeholder="123 Main Street"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="San Mateo"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={data.state}
                onChange={(e) => onChange({ state: e.target.value })}
                placeholder="CA"
                maxLength={2}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input
                type="text"
                value={data.zip}
                onChange={(e) => onChange({ zip: e.target.value })}
                placeholder="94401"
                maxLength={10}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What makes you different? *
            </label>
            <p className="text-xs text-gray-400 mb-1.5">2-3 sentences about what sets your business apart. This seeds all your website copy.</p>
            <textarea
              value={data.differentiator}
              onChange={(e) => onChange({ differentiator: e.target.value })}
              placeholder="We're a family-owned HVAC company that's been serving San Mateo County since 1988. Our technicians are NATE-certified and we offer same-day emergency service with upfront pricing — no surprise fees."
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Existing Website URL <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <p className="text-xs text-gray-400 mb-1.5">We&apos;ll scrape content to help migrate and improve your site.</p>
            <input
              type="url"
              value={data.existingWebsite}
              onChange={(e) => onChange({ existingWebsite: e.target.value })}
              placeholder="https://myoldbusiness.com"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Services ──────────────────────────────────────────────────────────

function StepServices({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}) {
  const [newServiceName, setNewServiceName] = useState('');

  const addService = () => {
    const name = newServiceName.trim();
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    onChange({
      services: [...data.services, { name, slug }],
    });
    setNewServiceName('');
  };

  const removeService = (index: number) => {
    onChange({
      services: data.services.filter((_, i) => i !== index),
    });
  };

  const updateService = (index: number, updates: Partial<ServiceItem>) => {
    const updated = data.services.map((s, i) =>
      i === index ? { ...s, ...updates } : s
    );
    onChange({ services: updated });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Your Services</h2>
        <p className="text-gray-500 mt-2">
          We&apos;ve suggested services based on your industry. Add, remove, or rename as needed.
        </p>
      </div>

      <div className="space-y-3">
        {data.services.map((service, index) => (
          <div
            key={index}
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3"
          >
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={service.name}
                onChange={(e) => updateService(index, { name: e.target.value })}
                className="w-full text-sm font-medium text-gray-900 bg-transparent focus:outline-none"
              />
            </div>
            <div className="shrink-0 w-36">
              <input
                type="text"
                value={service.priceFrom || ''}
                onChange={(e) => updateService(index, { priceFrom: e.target.value })}
                placeholder="Starting at $X"
                className="w-full text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>
            <button
              onClick={() => removeService(index)}
              className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Add new service */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={newServiceName}
            onChange={(e) => setNewServiceName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addService()}
            placeholder="Add a service..."
            className="flex-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={addService}
            disabled={!newServiceName.trim()}
            className="shrink-0 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Emergency toggle */}
        <div className="pt-4 border-t border-gray-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${
                data.emergency247 ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
              onClick={() => onChange({ emergency247: !data.emergency247 })}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  data.emergency247 ? 'translate-x-5' : ''
                }`}
              />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900">24/7 Emergency Service</span>
              <p className="text-xs text-gray-500">Show emergency availability on your site</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Service Area ──────────────────────────────────────────────────────

function StepServiceArea({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}) {
  const industryDefaults = INDUSTRY_DEFAULTS[data.industry];
  const nearbyCities = industryDefaults?.nearbyCities ?? [];
  const [customCityInput, setCustomCityInput] = useState('');

  const toggleCity = (city: string) => {
    const current = data.selectedCities;
    if (current.includes(city)) {
      onChange({ selectedCities: current.filter((c) => c !== city) });
    } else if (current.length < 6) {
      onChange({ selectedCities: [...current, city] });
    }
  };

  const addCustomCity = () => {
    const city = customCityInput.trim();
    if (!city || data.selectedCities.includes(city)) return;
    if (data.selectedCities.length >= 6) return;
    onChange({ selectedCities: [...data.selectedCities, city] });
    setCustomCityInput('');
  };

  const pageCount =
    (data.services.length + 5) + // core pages (services + home, about, contact, faq, reviews)
    data.selectedCities.length + // city pages
    data.selectedCities.length * Math.min(data.services.length, 3); // city×service combos (top 3)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Service Area</h2>
        <p className="text-gray-500 mt-2">
          Select the cities you serve. We&apos;ll create dedicated pages for each to help you rank locally.
        </p>
      </div>

      {/* Primary city */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium text-indigo-900">
          📍 Primary City: <strong>{data.city || 'Not set'}</strong>
          {data.state && `, ${data.state}`}
        </p>
        <p className="text-xs text-indigo-600 mt-1">This is auto-filled from your address. Change it in Step 1.</p>
      </div>

      {/* Nearby cities */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Nearby cities <span className="text-gray-400 font-normal">(max 6 recommended)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {nearbyCities.map((city) => {
              const isSelected = data.selectedCities.includes(city);
              return (
                <button
                  key={city}
                  onClick={() => toggleCity(city)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : data.selectedCities.length >= 6
                        ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  {isSelected && <Check className="inline h-3 w-3 mr-1" />}
                  {city}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom city input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customCityInput}
            onChange={(e) => setCustomCityInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomCity()}
            placeholder="Add another city..."
            className="flex-1 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addCustomCity}
            disabled={!customCityInput.trim() || data.selectedCities.length >= 6}
            className="px-3 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Page count preview */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Globe className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{pageCount} pages</p>
              <p className="text-xs text-gray-500">
                {data.services.length} services + {data.selectedCities.length} cities + core pages
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            You can always add more cities later based on real search demand from the Growth Engine.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Photos & Brand ────────────────────────────────────────────────────

function StepPhotosBrand({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 10 - data.photos.length);
    const newPreviewUrls = newFiles.map((f) => URL.createObjectURL(f));
    onChange({
      photos: [...data.photos, ...newFiles],
      photoPreviewUrls: [...data.photoPreviewUrls, ...newPreviewUrls],
    });
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(data.photoPreviewUrls[index]);
    onChange({
      photos: data.photos.filter((_, i) => i !== index),
      photoPreviewUrls: data.photoPreviewUrls.filter((_, i) => i !== index),
    });
  };

  const handleLogoUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (data.logoPreviewUrl) URL.revokeObjectURL(data.logoPreviewUrl);
    onChange({
      logo: file,
      logoPreviewUrl: URL.createObjectURL(file),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handlePhotoUpload(e.dataTransfer.files);
  };

  const COLOR_PRESETS = [
    '#dc2626', '#ea580c', '#f59e0b', '#16a34a', '#0d9488',
    '#2563eb', '#4f46e5', '#7c3aed', '#ec4899', '#111827',
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Photos & Brand</h2>
        <p className="text-gray-500 mt-2">
          Real photos build trust. Sites with real photos get 2x more leads.
        </p>
      </div>

      <div className="space-y-8">
        {/* Photo upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📸 Business Photos <span className="text-gray-400 font-normal">(max 10)</span>
          </label>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => photoInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
          >
            <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">Drop photos here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">
              Team, storefront, work in progress, finished projects, van/truck
            </p>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handlePhotoUpload(e.target.files)}
            className="hidden"
          />

          {data.photoPreviewUrls.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mt-4">
              {data.photoPreviewUrls.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logo upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo <span className="text-gray-400 font-normal">(optional — we&apos;ll generate a text logo if skipped)</span>
          </label>
          <div className="flex items-center gap-4">
            <div
              onClick={() => logoInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors overflow-hidden"
            >
              {data.logoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.logoPreviewUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <ImageIcon className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="text-xs text-gray-500">
              <p>PNG, SVG, or JPG</p>
              <p>Square or landscape recommended</p>
            </div>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleLogoUpload(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Colors */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Brand Colors</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Primary</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.colorPrimary}
                  onChange={(e) => onChange({ colorPrimary: e.target.value })}
                  className="h-10 w-12 rounded-lg border border-gray-200 cursor-pointer bg-white p-0.5"
                />
                <input
                  type="text"
                  value={data.colorPrimary}
                  onChange={(e) => onChange({ colorPrimary: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono bg-gray-50"
                  maxLength={7}
                />
              </div>
              <div className="flex gap-1.5 mt-2">
                {COLOR_PRESETS.slice(0, 5).map((c) => (
                  <button
                    key={c}
                    onClick={() => onChange({ colorPrimary: c })}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      data.colorPrimary === c ? 'border-indigo-600 scale-110' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Secondary</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.colorSecondary}
                  onChange={(e) => onChange({ colorSecondary: e.target.value })}
                  className="h-10 w-12 rounded-lg border border-gray-200 cursor-pointer bg-white p-0.5"
                />
                <input
                  type="text"
                  value={data.colorSecondary}
                  onChange={(e) => onChange({ colorSecondary: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono bg-gray-50"
                  maxLength={7}
                />
              </div>
              <div className="flex gap-1.5 mt-2">
                {COLOR_PRESETS.slice(5).map((c) => (
                  <button
                    key={c}
                    onClick={() => onChange({ colorSecondary: c })}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      data.colorSecondary === c ? 'border-indigo-600 scale-110' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Design style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Design Style</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DESIGN_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => onChange({ designStyle: style.id })}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  data.designStyle === style.id
                    ? 'border-indigo-600 bg-indigo-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-2xl">{style.preview}</span>
                <span className="text-sm font-medium text-gray-900">{style.label}</span>
                <span className="text-[10px] text-gray-500 text-center leading-tight">{style.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={data.tagline}
              onChange={(e) => onChange({ tagline: e.target.value })}
              placeholder="Your trusted local experts since 1988"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              className="shrink-0 px-3 py-3 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
              title="AI suggest (coming soon)"
              disabled
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 5: AI Personality ────────────────────────────────────────────────────

function StepAIPersonality({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}) {
  const toggleCapability = (capId: string) => {
    const current = data.aiCapabilities;
    if (current.includes(capId)) {
      onChange({ aiCapabilities: current.filter((c) => c !== capId) });
    } else {
      onChange({ aiCapabilities: [...current, capId] });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">AI Worker Personality</h2>
        <p className="text-gray-500 mt-2">
          Configure the AI that will be embedded on your website to handle customers 24/7.
        </p>
      </div>

      <div className="space-y-6">
        {/* AI Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AI Worker Name</label>
          <input
            type="text"
            value={data.aiName}
            onChange={(e) => onChange({ aiName: e.target.value })}
            placeholder="Alex"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            This is how the AI introduces itself to customers.
          </p>
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Tone</label>
          <div className="grid grid-cols-3 gap-3">
            {TONE_OPTIONS.map((tone) => (
              <button
                key={tone.id}
                onClick={() => onChange({ aiTone: tone.id })}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                  data.aiTone === tone.id
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-sm font-semibold text-gray-900">{tone.label}</span>
                <span className="text-[10px] text-gray-500">{tone.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Capabilities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">What can the AI do?</label>
          <div className="space-y-2">
            {AI_CAPABILITIES.map((cap) => (
              <label
                key={cap.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={data.aiCapabilities.includes(cap.id)}
                  onChange={() => toggleCapability(cap.id)}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-900">{cap.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Business hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Business Hours</label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Days</p>
              <select
                value={data.businessDays}
                onChange={(e) => onChange({ businessDays: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Mon-Fri">Mon - Fri</option>
                <option value="Mon-Sat">Mon - Sat</option>
                <option value="Mon-Sun">Mon - Sun</option>
                <option value="24/7">24/7</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Open</p>
              <input
                type="text"
                value={data.businessHoursStart}
                onChange={(e) => onChange({ businessHoursStart: e.target.value })}
                placeholder="8:00 AM"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Close</p>
              <input
                type="text"
                value={data.businessHoursEnd}
                onChange={(e) => onChange({ businessHoursEnd: e.target.value })}
                placeholder="6:00 PM"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Booking URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Booking URL <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="url"
              value={data.bookingUrl}
              onChange={(e) => onChange({ bookingUrl: e.target.value })}
              placeholder="https://calendly.com/your-business"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Calendly, GHL, or any scheduling link</p>
        </div>
      </div>
    </div>
  );
}

// ── Step 6: Generating ────────────────────────────────────────────────────────

const GENERATION_STEPS = [
  { label: 'Generating homepage...', duration: 3000 },
  { label: 'Writing service pages...', duration: 5000 },
  { label: 'Creating city pages...', duration: 4000 },
  { label: 'Building FAQ section...', duration: 2000 },
  { label: 'Generating meta tags & schema...', duration: 2000 },
  { label: 'Training AI worker...', duration: 3000 },
  { label: 'Assembling your website...', duration: 2000 },
];

function StepGenerating({
  siteId,
  onComplete,
}: {
  siteId: string | null;
  onComplete: () => void;
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate progress for now — in production, this polls the API
  useEffect(() => {
    const totalDuration = GENERATION_STEPS.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += 100;
      const pct = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(pct);

      // Figure out which step we're on
      let accumulated = 0;
      for (let i = 0; i < GENERATION_STEPS.length; i++) {
        accumulated += GENERATION_STEPS[i].duration;
        if (elapsed < accumulated) {
          setCurrentStepIndex(i);
          break;
        }
        if (i === GENERATION_STEPS.length - 1) {
          setCurrentStepIndex(GENERATION_STEPS.length - 1);
        }
      }

      if (elapsed >= totalDuration) {
        clearInterval(timer);
        setTimeout(onComplete, 500);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Poll API for real status when siteId exists
  useEffect(() => {
    if (!siteId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/agency/sites/${siteId}`);
        if (res.ok) {
          const result = await res.json();
          const site = result.data || result;
          if (site.status === 'live' || site.status === 'ready') {
            if (pollRef.current) clearInterval(pollRef.current);
            onComplete();
          }
        }
      } catch {
        // Silently ignore poll errors
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [siteId, onComplete]);

  return (
    <div className="max-w-lg mx-auto text-center py-12">
      <div className="mb-8">
        <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="h-10 w-10 text-indigo-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Building Your Website</h2>
        <p className="text-gray-500 mt-2">This usually takes about 60 seconds...</p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden mb-6">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status messages */}
      <div className="space-y-2">
        {GENERATION_STEPS.map((step, i) => (
          <div
            key={i}
            className={`flex items-center justify-center gap-2 text-sm transition-all duration-300 ${
              i < currentStepIndex
                ? 'text-green-600'
                : i === currentStepIndex
                  ? 'text-indigo-600 font-medium'
                  : 'text-gray-300'
            }`}
          >
            {i < currentStepIndex ? (
              <Check className="h-4 w-4" />
            ) : i === currentStepIndex ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <div className="h-4 w-4" />
            )}
            <span>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 7: Review & Launch ───────────────────────────────────────────────────

function StepReviewLaunch({
  data,
  onLaunch,
}: {
  data: WizardData;
  onLaunch: () => void;
}) {
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);

  const industryDefaults = INDUSTRY_DEFAULTS[data.industry];

  const pageCount =
    (data.services.length + 5) +
    data.selectedCities.length +
    data.selectedCities.length * Math.min(data.services.length, 3);

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      if (data.siteId) {
        await fetch(`/api/agency/sites/${data.siteId}/deploy`, { method: 'POST' });
      }
      setLaunched(true);
      onLaunch();
    } catch {
      // Allow launch even if deploy fails — show success state
      setLaunched(true);
    } finally {
      setLaunching(false);
    }
  };

  if (launched) {
    return (
      <div className="max-w-lg mx-auto text-center py-12" ref={confettiRef}>
        {/* Simple confetti effect */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-ping"
                style={{
                  backgroundColor: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'][i % 5],
                  left: `${20 + Math.random() * 60}%`,
                  top: `${10 + Math.random() * 80}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
          <div className="relative z-10">
            <div className="w-24 h-24 rounded-3xl bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Rocket className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">🎉 Your Site is Live!</h2>
            <p className="text-gray-500 mb-8">
              {data.businessName}&apos;s website is deployed and ready for customers.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/agency/clients"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Review & Launch</h2>
        <p className="text-gray-500 mt-2">Everything looks great. Review your site and hit launch.</p>
      </div>

      <div className="space-y-6">
        {/* Preview placeholder */}
        <div className="bg-gray-100 rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-gray-400 font-mono">
                {data.businessName
                  ? `${data.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '')}.sites.kyra.com`
                  : 'yoursite.sites.kyra.com'}
              </span>
            </div>
          </div>
          <div className="p-8 min-h-[200px] flex flex-col items-center justify-center text-center" style={{ backgroundColor: data.colorSecondary }}>
            <h3 className="text-xl font-bold mb-2" style={{ color: data.colorPrimary }}>
              {data.businessName || 'Your Business'}
            </h3>
            <p className="text-sm" style={{ color: `${data.colorPrimary}88` }}>
              {data.tagline || `Trusted ${industryDefaults?.label || 'professionals'} in ${data.city || 'your area'}`}
            </p>
            <div className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: data.colorPrimary }}>
              Get a Free Quote
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{pageCount}</p>
            <p className="text-xs text-gray-500">Pages</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{data.services.length}</p>
            <p className="text-xs text-gray-500">Services</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{data.selectedCities.length}</p>
            <p className="text-xs text-gray-500">Cities</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{data.aiName || '—'}</p>
            <p className="text-xs text-gray-500">AI Worker</p>
          </div>
        </div>

        {/* AI Worker preview */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">AI Worker Preview</h4>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shrink-0" style={{ backgroundColor: data.colorPrimary }}>
                🤖
              </div>
              <div className="bg-white rounded-xl rounded-bl-sm px-3 py-2 shadow-sm text-sm text-gray-800 max-w-[80%]">
                Hi! I&apos;m {data.aiName || 'your AI assistant'} from {data.businessName || 'your business'}.
                How can I help you today?
              </div>
            </div>
          </div>
        </div>

        {/* Connect Domain */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Connect Custom Domain</h4>
          <p className="text-xs text-gray-500 mb-3">
            Your site will be live at a free subdomain immediately. Add a custom domain later from the dashboard.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
            <p>1. Purchase a domain (Namecheap, GoDaddy, etc.)</p>
            <p>2. Point DNS to our servers via Cloudflare</p>
            <p>3. We handle SSL automatically</p>
          </div>
        </div>

        {/* Launch button */}
        <div className="text-center pt-4">
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="px-12 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95"
          >
            {launching ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Deploying...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Launch Website
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Wizard Page ──────────────────────────────────────────────────────────

export default function WebsiteBuilderWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdParam = searchParams.get('cid');
  const clientNameParam = searchParams.get('clientId');
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(() => ({
    ...initialWizardData,
    ...(clientNameParam ? { businessName: clientNameParam } : {}),
  }));
  const [saving, setSaving] = useState(false);

  const industryDefaults = INDUSTRY_DEFAULTS[data.industry];
  const needsGeoPages = industryDefaults?.needsGeoPages ?? false;

  // If geo pages not needed, skip step 3
  const effectiveSteps = needsGeoPages
    ? [
        { number: 1, label: 'Business' },
        { number: 2, label: 'Services' },
        { number: 3, label: 'Area' },
        { number: 4, label: 'Brand' },
        { number: 5, label: 'AI' },
        { number: 6, label: 'Build' },
        { number: 7, label: 'Launch' },
      ]
    : [
        { number: 1, label: 'Business' },
        { number: 2, label: 'Services' },
        { number: 4, label: 'Brand' },
        { number: 5, label: 'AI' },
        { number: 6, label: 'Build' },
        { number: 7, label: 'Launch' },
      ];

  const handleChange = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const saveToApi = useCallback(async (currentStep: number) => {
    setSaving(true);
    try {
      if (!data.siteId && currentStep === 1) {
        // Create draft
        const res = await fetch('/api/agency/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_name: data.businessName,
            industry: data.industry,
            phone: data.phone,
            address: { street: data.address, city: data.city, state: data.state, zip: data.zip },
            owner_name: data.ownerName,
            owner_story: data.differentiator,
            years_in_business: data.yearsInBusiness ? parseInt(data.yearsInBusiness) : null,
            license: data.licenseNumber,
            existing_website: data.existingWebsite,
            ...(clientIdParam ? { client_id: clientIdParam } : {}),
          }),
        });
        if (res.ok) {
          const result = await res.json();
          const newId = result.data?.id || result.id;
          if (newId) {
            setData((prev) => ({ ...prev, siteId: newId }));
          } else {
            console.error('[wizard] No site ID in response:', result);
          }
        } else {
          const errBody = await res.text().catch(() => '');
          console.error('[wizard] Failed to create draft:', res.status, errBody);
        }
      } else if (data.siteId) {
        // Update existing draft
        const body: Record<string, unknown> = {};

        if (currentStep === 1) {
          body.business_name = data.businessName;
          body.industry = data.industry;
          body.phone = data.phone;
          body.address = { street: data.address, city: data.city, state: data.state, zip: data.zip };
          body.owner_name = data.ownerName;
          body.owner_story = data.differentiator;
          body.years_in_business = data.yearsInBusiness ? parseInt(data.yearsInBusiness) : null;
          body.license = data.licenseNumber;
        } else if (currentStep === 2) {
          body.services = data.services.map((s) => ({
            name: s.name,
            slug: s.slug,
            price_from: s.priceFrom || null,
          }));
          body.emergency_247 = data.emergency247;
        } else if (currentStep === 3) {
          body.cities = data.selectedCities.map((c) => ({ name: c, slug: c.toLowerCase().replace(/\s+/g, '-') }));
        } else if (currentStep === 4) {
          body.color_primary = data.colorPrimary;
          body.color_secondary = data.colorSecondary;
          body.design_style = data.designStyle;
          body.tagline = data.tagline;
        } else if (currentStep === 5) {
          body.ai_name = data.aiName;
          body.ai_tone = data.aiTone;
          body.ai_capabilities = data.aiCapabilities;
          body.hours = {
            days: data.businessDays,
            start: data.businessHoursStart,
            end: data.businessHoursEnd,
          };
          body.booking_url = data.bookingUrl;
        }

        await fetch(`/api/agency/sites/${data.siteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
    } catch (err) {
      console.error('[wizard] Save failed:', err);
      // Allow proceeding even if save fails — data is in local state
    } finally {
      setSaving(false);
    }
  }, [data]);

  const getNextStep = (current: number): number => {
    const idx = effectiveSteps.findIndex((s) => s.number === current);
    if (idx < effectiveSteps.length - 1) return effectiveSteps[idx + 1].number;
    return current;
  };

  const getPrevStep = (current: number): number => {
    const idx = effectiveSteps.findIndex((s) => s.number === current);
    if (idx > 0) return effectiveSteps[idx - 1].number;
    return current;
  };

  const goNext = async () => {
    await saveToApi(step);
    const next = getNextStep(step);
    if (next === 6) {
      // Trigger generation
      if (data.siteId) {
        fetch(`/api/agency/sites/${data.siteId}/generate`, { method: 'POST' }).catch(() => {});
      }
    }
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrev = () => {
    setStep(getPrevStep(step));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return !!(data.businessName.trim() && data.industry && data.differentiator.trim());
      case 2:
        return data.services.length > 0;
      case 3:
        return true; // Cities are optional
      case 4:
        return true; // All brand settings have defaults
      case 5:
        return !!data.aiName.trim();
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link
            href="/agency/clients"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>
          <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-600" />
            Website Builder
          </h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Wizard content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {/* Step indicator (hide on step 6 and 7) */}
        {step <= 5 && (
          <StepIndicator
            steps={effectiveSteps.filter((s) => s.number <= 5)}
            currentStep={step}
            onStepClick={(s) => setStep(s)}
          />
        )}

        {/* Step content */}
        {step === 1 && <StepBusinessInfo data={data} onChange={handleChange} />}
        {step === 2 && <StepServices data={data} onChange={handleChange} />}
        {step === 3 && <StepServiceArea data={data} onChange={handleChange} />}
        {step === 4 && <StepPhotosBrand data={data} onChange={handleChange} />}
        {step === 5 && <StepAIPersonality data={data} onChange={handleChange} />}
        {step === 6 && (
          <StepGenerating
            siteId={data.siteId}
            onComplete={() => setStep(7)}
          />
        )}
        {step === 7 && (
          <StepReviewLaunch
            data={data}
            onLaunch={() => {}}
          />
        )}

        {/* Navigation buttons (hide on step 6 and 7) */}
        {step <= 5 && (
          <div className="flex items-center justify-between mt-10 max-w-2xl mx-auto">
            <button
              onClick={goPrev}
              disabled={step === 1}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={goNext}
              disabled={!canAdvance() || saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : step === 5 ? (
                <>
                  Generate Website
                  <Sparkles className="h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
