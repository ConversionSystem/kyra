// Template gallery — 8 preset template combinations for the wizard UI

import type { SectionRecipe } from './recipes';

export interface TemplatePreview {
  id: string;
  name: string;
  description: string;
  industries: string[];
  recipe: SectionRecipe;
  previewColors: { primary: string; secondary: string };
  /** Short inline HTML snippet rendered in the wizard template picker as a visual preview */
  previewHtml?: string;
}

export const TEMPLATE_GALLERY: TemplatePreview[] = [
  {
    id: 'professional-dark',
    name: 'Professional Dark',
    description: 'Authority-forward dark layout with bold typography and strong CTAs',
    industries: ['hvac', 'electrical', 'auto', 'roofing', 'pest-control', 'locksmith', 'remodeling'],
    recipe: {
      hero: 'full-bleed',
      services: 'grid-3col',
      about: 'stats-bar',
      testimonials: 'grid-cards',
      cta: 'phone-banner',
      faq: 'accordion',
      footer: 'four-column',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#dc2626', secondary: '#111827' },
    previewHtml: '<div style="background:linear-gradient(135deg,#1a1a2e,#111827);padding:16px;font-family:system-ui;height:100%"><div style="background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.3);border-radius:6px;padding:12px 14px"><div style="color:#fff;font-size:14px;font-weight:800;margin-bottom:4px">Your Business Name</div><div style="color:rgba(255,255,255,0.7);font-size:10px;margin-bottom:10px">Professional services you can trust</div><div style="display:flex;gap:6px"><div style="background:#dc2626;color:#fff;padding:5px 10px;border-radius:4px;font-size:9px;font-weight:700">CALL NOW</div><div style="border:1px solid rgba(255,255,255,0.4);color:#fff;padding:5px 10px;border-radius:4px;font-size:9px">Learn More</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:8px"><div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:6px;text-align:center"><div style="color:#dc2626;font-size:11px;font-weight:800">500+</div><div style="color:rgba(255,255,255,0.5);font-size:8px">Jobs Done</div></div><div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:6px;text-align:center"><div style="color:#dc2626;font-size:11px;font-weight:800">5★</div><div style="color:rgba(255,255,255,0.5);font-size:8px">Rating</div></div><div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:6px;text-align:center"><div style="color:#dc2626;font-size:11px;font-weight:800">24/7</div><div style="color:rgba(255,255,255,0.5);font-size:8px">Service</div></div></div></div>',
  },
  {
    id: 'clean-clinical',
    name: 'Clean Clinical',
    description: 'White, clinical, trust-focused design for healthcare and professional services',
    industries: ['dental', 'medical', 'veterinary', 'accounting'],
    recipe: {
      hero: 'centered-badge',
      services: 'icon-list',
      about: 'team-grid',
      testimonials: 'single-spotlight',
      cta: 'form-embed',
      faq: 'two-column',
      footer: 'map-contact',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#0d9488', secondary: '#f0fdfa' },
    previewHtml: '<div style="background:#fff;padding:16px;font-family:system-ui;height:100%"><div style="text-align:center;padding:10px 0"><div style="display:inline-block;background:#f0fdfa;color:#0d9488;font-size:9px;font-weight:700;padding:3px 10px;border-radius:20px;margin-bottom:8px;border:1px solid #99f6e4">Trusted Since 1998</div><div style="color:#111827;font-size:14px;font-weight:700;margin-bottom:4px">Your Health, Our Priority</div><div style="color:#6b7280;font-size:10px;margin-bottom:10px">Compassionate care for the whole family</div><div style="background:#0d9488;color:#fff;display:inline-block;padding:6px 16px;border-radius:6px;font-size:9px;font-weight:600">Book Appointment</div></div><div style="border-top:1px solid #e5e7eb;padding-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px"><div style="display:flex;align-items:center;gap:6px"><div style="width:24px;height:24px;background:#f0fdfa;border-radius:50%;display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;background:#0d9488;border-radius:50%"></div></div><div style="color:#374151;font-size:9px;font-weight:500">General Care</div></div><div style="display:flex;align-items:center;gap:6px"><div style="width:24px;height:24px;background:#f0fdfa;border-radius:50%;display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;background:#0d9488;border-radius:50%"></div></div><div style="color:#374151;font-size:9px;font-weight:500">Emergency</div></div></div></div>',
  },
  {
    id: 'bold-emergency',
    name: 'Bold Emergency',
    description: 'Big phone CTA, emergency-first design for 24/7 service businesses',
    industries: ['plumbing', 'locksmith', 'hvac', 'electrical', 'pest-control'],
    recipe: {
      hero: 'gradient-overlay',
      services: 'tabs',
      about: 'timeline',
      testimonials: 'carousel',
      cta: 'phone-banner',
      faq: 'accordion',
      footer: 'four-column',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#ef4444', secondary: '#18181b' },
    previewHtml: '<div style="background:#18181b;padding:16px;font-family:system-ui;height:100%"><div style="background:#ef4444;border-radius:6px;padding:10px 12px;text-align:center;margin-bottom:8px"><div style="color:#fff;font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2px">⚡ 24/7 EMERGENCY SERVICE</div><div style="color:rgba(255,255,255,0.9);font-size:13px;font-weight:900;margin-bottom:6px">Fast Response. Call Now.</div><div style="background:#fff;color:#ef4444;padding:6px 14px;border-radius:4px;font-size:11px;font-weight:800;display:inline-block">(555) 000-0000</div></div><div style="display:flex;flex-direction:column;gap:4px"><div style="display:flex;align-items:center;gap:8px;padding:6px;background:rgba(255,255,255,0.05);border-radius:4px"><div style="color:#ef4444;font-size:12px">✓</div><div style="color:rgba(255,255,255,0.8);font-size:9px">Licensed &amp; Insured</div></div><div style="display:flex;align-items:center;gap:8px;padding:6px;background:rgba(255,255,255,0.05);border-radius:4px"><div style="color:#ef4444;font-size:12px">✓</div><div style="color:rgba(255,255,255,0.8);font-size:9px">Same Day Service</div></div><div style="display:flex;align-items:center;gap:8px;padding:6px;background:rgba(255,255,255,0.05);border-radius:4px"><div style="color:#ef4444;font-size:12px">✓</div><div style="color:rgba(255,255,255,0.8);font-size:9px">Upfront Pricing</div></div></div></div>',
  },
  {
    id: 'elegant-minimal',
    name: 'Elegant Minimal',
    description: 'Soft colors, lots of whitespace, understated elegance',
    industries: ['med-spa', 'salon', 'consulting', 'accounting'],
    recipe: {
      hero: 'gradient-overlay',
      services: 'alternating',
      about: 'photo-split',
      testimonials: 'single-spotlight',
      cta: 'split-offer',
      faq: 'two-column',
      footer: 'minimal',
      navbar: 'transparent-overlay',
    },
    previewColors: { primary: '#ec4899', secondary: '#fdf2f8' },
    previewHtml: '<div style="background:linear-gradient(160deg,#fdf2f8,#fff);padding:16px;font-family:Georgia,serif;height:100%"><div style="text-align:center;padding:8px 0 12px"><div style="color:#9ca3af;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:6px">Refined &amp; Elegant</div><div style="color:#111827;font-size:15px;font-weight:400;margin-bottom:4px;font-style:italic">Your Beautiful Space</div><div style="color:#6b7280;font-size:9px;margin-bottom:12px;line-height:1.5">Experience luxury. Feel the difference.</div><div style="border:1px solid #ec4899;color:#ec4899;padding:5px 14px;border-radius:2px;font-size:9px;display:inline-block;letter-spacing:0.1em;text-transform:uppercase">Book a Consultation</div></div><div style="border-top:1px solid #f3e8ff;padding-top:10px"><div style="color:#9ca3af;font-size:8px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px">Services</div><div style="color:#374151;font-size:10px;margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid #f9f0ff">— Facial Treatments</div><div style="color:#374151;font-size:10px;margin-bottom:4px;padding-bottom:4px;border-bottom:1px solid #f9f0ff">— Body Contouring</div><div style="color:#374151;font-size:10px">— Skincare Consultations</div></div></div>',
  },
  {
    id: 'photo-forward',
    name: 'Photo Forward',
    description: 'Large images, visual-first layout for portfolio-driven businesses',
    industries: ['landscaping', 'painting', 'flooring', 'remodeling', 'salon', 'restaurant'],
    recipe: {
      hero: 'split-screen',
      services: 'alternating',
      about: 'photo-split',
      testimonials: 'grid-cards',
      cta: 'split-offer',
      faq: 'accordion',
      footer: 'four-column',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#d97706', secondary: '#1c1917' },
    previewHtml: '<div style="background:#fff;font-family:system-ui;height:100%;display:flex;flex-direction:column"><div style="display:grid;grid-template-columns:1fr 1fr;height:72px"><div style="background:linear-gradient(135deg,#d97706,#92400e);display:flex;align-items:center;justify-content:center;padding:8px"><div style="color:rgba(255,255,255,0.9);font-size:8px;text-align:center;font-weight:300;line-height:1.4">Our work<br/>speaks for itself</div></div><div style="background:linear-gradient(135deg,#1c1917,#292524);display:flex;align-items:center;justify-content:center;padding:8px"><div style="color:#d97706;font-size:16px;font-weight:900;text-align:center">See<br/>Portfolio</div></div></div><div style="padding:10px;flex:1"><div style="color:#111827;font-size:11px;font-weight:700;margin-bottom:4px">Transforming Spaces</div><div style="color:#6b7280;font-size:9px;margin-bottom:8px;line-height:1.4">Quality craftsmanship in every project we take on.</div><div style="display:flex;gap:4px"><div style="background:#d97706;color:#fff;padding:4px 8px;border-radius:4px;font-size:8px;font-weight:600">View Work</div><div style="border:1px solid #e5e7eb;color:#374151;padding:4px 8px;border-radius:4px;font-size:8px">Get Quote</div></div></div></div>',
  },
  {
    id: 'local-trust',
    name: 'Local Trust',
    description: 'Map, reviews, and local emphasis for neighborhood service providers',
    industries: ['cleaning', 'lawn-care', 'moving', 'plumbing', 'painting'],
    recipe: {
      hero: 'split-screen',
      services: 'grid-3col',
      about: 'stats-bar',
      testimonials: 'carousel',
      cta: 'phone-banner',
      faq: 'accordion',
      footer: 'map-contact',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#2563eb', secondary: '#eff6ff' },
    previewHtml: '<div style="background:#eff6ff;padding:16px;font-family:system-ui;height:100%"><div style="background:#fff;border:1px solid #dbeafe;border-radius:8px;padding:12px;margin-bottom:8px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><div style="width:28px;height:28px;background:#2563eb;border-radius:50%;display:flex;align-items:center;justify-content:center"><div style="color:#fff;font-size:10px;font-weight:800">✓</div></div><div><div style="color:#111827;font-size:11px;font-weight:700">Trusted in Your Area</div><div style="color:#2563eb;font-size:8px">⭐⭐⭐⭐⭐ 4.9 · 200+ reviews</div></div></div><div style="color:#374151;font-size:9px;line-height:1.4;margin-bottom:8px">"Best service in the neighborhood! Showed up on time and did an amazing job."</div><div style="display:flex;gap-4"><div style="background:#2563eb;color:#fff;padding:5px 12px;border-radius:4px;font-size:8px;font-weight:600;display:inline-block">Get Free Estimate</div></div></div><div style="background:#fff;border:1px solid #dbeafe;border-radius:6px;padding:8px;display:flex;align-items:center;gap:6px"><div style="font-size:14px">📍</div><div style="color:#374151;font-size:9px">Serving your local area &amp; surrounding neighborhoods</div></div></div>',
  },
  {
    id: 'modern-gradient',
    name: 'Modern Gradient',
    description: 'Gradient hero, modern feel with contemporary design elements',
    industries: ['fitness', 'real-estate', 'consulting', 'med-spa'],
    recipe: {
      hero: 'gradient-overlay',
      services: 'grid-3col',
      about: 'timeline',
      testimonials: 'carousel',
      cta: 'form-embed',
      faq: 'accordion',
      footer: 'four-column',
      navbar: 'hamburger',
    },
    previewColors: { primary: '#7c3aed', secondary: '#1e1b4b' },
    previewHtml: '<div style="background:linear-gradient(135deg,#1e1b4b 0%,#4c1d95 40%,#7c3aed 100%);padding:16px;font-family:system-ui;height:100%"><div style="margin-bottom:12px"><div style="display:flex;gap:4px;margin-bottom:6px"><div style="height:2px;flex:1;background:rgba(167,139,250,0.4);border-radius:1px"></div><div style="height:2px;flex:2;background:#a78bfa;border-radius:1px"></div><div style="height:2px;flex:1;background:rgba(167,139,250,0.4);border-radius:1px"></div></div><div style="color:rgba(255,255,255,0.6);font-size:8px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:4px">Transform Your Future</div><div style="color:#fff;font-size:15px;font-weight:800;margin-bottom:4px;line-height:1.2">Achieve Your<br/>Goals Faster</div><div style="color:rgba(255,255,255,0.7);font-size:9px;margin-bottom:10px">Expert guidance, proven results.</div><div style="background:linear-gradient(90deg,#a78bfa,#7c3aed);color:#fff;padding:6px 14px;border-radius:6px;font-size:9px;font-weight:700;display:inline-block">Get Started Free →</div></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px"><div style="background:rgba(255,255,255,0.1);backdrop-filter:blur(4px);border-radius:4px;padding:6px;text-align:center"><div style="color:#a78bfa;font-size:10px;font-weight:800">98%</div><div style="color:rgba(255,255,255,0.5);font-size:7px">Success</div></div><div style="background:rgba(255,255,255,0.1);backdrop-filter:blur(4px);border-radius:4px;padding:6px;text-align:center"><div style="color:#a78bfa;font-size:10px;font-weight:800">1K+</div><div style="color:rgba(255,255,255,0.5);font-size:7px">Clients</div></div><div style="background:rgba(255,255,255,0.1);backdrop-filter:blur(4px);border-radius:4px;padding:6px;text-align:center"><div style="color:#a78bfa;font-size:10px;font-weight:800">5★</div><div style="color:rgba(255,255,255,0.5);font-size:7px">Rated</div></div></div></div>',
  },
  {
    id: 'conversion-focused',
    name: 'Conversion Focused',
    description: 'Form-heavy, multiple CTAs, optimized for lead generation',
    industries: ['legal', 'real-estate', 'dental', 'medical', 'consulting'],
    recipe: {
      hero: 'split-screen',
      services: 'grid-3col',
      about: 'team-grid',
      testimonials: 'carousel',
      cta: 'split-offer',
      faq: 'accordion',
      footer: 'four-column',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#4f46e5', secondary: '#eef2ff' },
    previewHtml: '<div style="background:#fff;padding:14px;font-family:system-ui;height:100%;display:flex;gap:10px"><div style="flex:1"><div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;padding:8px;margin-bottom:6px"><div style="color:#4f46e5;font-size:8px;font-weight:700;letter-spacing:0.1em;margin-bottom:3px">FREE CONSULTATION</div><div style="color:#111827;font-size:11px;font-weight:800;margin-bottom:3px;line-height:1.3">Get Expert Help Today</div><div style="color:#6b7280;font-size:8px">No obligation. Results guaranteed.</div></div><div style="display:flex;flex-direction:column;gap:3px"><div style="display:flex;align-items:center;gap:4px;font-size:8px;color:#374151"><span style="color:#4f46e5">✓</span>Free initial assessment</div><div style="display:flex;align-items:center;gap:4px;font-size:8px;color:#374151"><span style="color:#4f46e5">✓</span>Same-day response</div><div style="display:flex;align-items:center;gap:4px;font-size:8px;color:#374151"><span style="color:#4f46e5">✓</span>No hidden fees</div></div></div><div style="width:90px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px"><div style="color:#111827;font-size:8px;font-weight:700;margin-bottom:6px">Quick Contact</div><div style="background:#fff;border:1px solid #d1d5db;border-radius:3px;padding:4px 6px;font-size:7px;color:#9ca3af;margin-bottom:4px">Your Name</div><div style="background:#fff;border:1px solid #d1d5db;border-radius:3px;padding:4px 6px;font-size:7px;color:#9ca3af;margin-bottom:6px">Phone / Email</div><div style="background:#4f46e5;color:#fff;text-align:center;padding:5px;border-radius:3px;font-size:8px;font-weight:600">Send →</div></div></div>',
  },
  {
    id: 'glassmorphism-pro',
    name: 'Glassmorphism Pro',
    description: 'Premium dark design with frosted glass effects, glowing accents, and floating cards',
    industries: ['hvac', 'electrical', 'plumbing', 'auto', 'roofing', 'solar', 'garage-door'],
    recipe: {
      hero: 'video-hero',
      services: 'tabs',
      about: 'timeline',
      testimonials: 'carousel',
      cta: 'form-embed',
      faq: 'accordion',
      footer: 'map-contact',
      navbar: 'transparent-overlay',
    },
    previewColors: { primary: '#06b6d4', secondary: '#0f172a' },
    previewHtml: '<div style="background:linear-gradient(135deg,#0f172a 0%,#0c2340 50%,#0f172a 100%);padding:16px;font-family:system-ui;height:100%"><div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.25);border-radius:8px;padding:12px 14px;backdrop-filter:blur(8px);margin-bottom:8px"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><div style="width:6px;height:6px;background:#06b6d4;border-radius:50%;box-shadow:0 0 6px #06b6d4"></div><div style="color:rgba(6,182,212,0.8);font-size:8px;letter-spacing:0.12em;text-transform:uppercase">Premium Service</div></div><div style="color:#fff;font-size:14px;font-weight:800;margin-bottom:4px">Your Business Name</div><div style="color:rgba(255,255,255,0.6);font-size:9px;margin-bottom:10px">Experts you can trust, 24/7</div><div style="background:linear-gradient(90deg,#06b6d4,#0891b2);color:#fff;padding:5px 12px;border-radius:4px;font-size:9px;font-weight:700;display:inline-block;box-shadow:0 0 12px rgba(6,182,212,0.4)">Get Free Quote</div></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px"><div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.15);border-radius:4px;padding:6px;text-align:center"><div style="color:#06b6d4;font-size:11px;font-weight:800">500+</div><div style="color:rgba(255,255,255,0.4);font-size:7px">Jobs</div></div><div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.15);border-radius:4px;padding:6px;text-align:center"><div style="color:#06b6d4;font-size:11px;font-weight:800">5★</div><div style="color:rgba(255,255,255,0.4);font-size:7px">Rated</div></div><div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.15);border-radius:4px;padding:6px;text-align:center"><div style="color:#06b6d4;font-size:11px;font-weight:800">24/7</div><div style="color:rgba(255,255,255,0.4);font-size:7px">Available</div></div></div></div>',
  },
  {
    id: 'neon-authority',
    name: 'Neon Authority',
    description: 'Dark mode with neon accent borders, tech-forward feel for modern service companies',
    industries: ['it-services', 'security', 'electrical', 'solar', 'auto', 'cleaning'],
    recipe: {
      hero: 'gradient-overlay',
      services: 'grid-3col',
      about: 'stats-bar',
      testimonials: 'grid-cards',
      cta: 'phone-banner',
      faq: 'two-column',
      footer: 'four-column',
      navbar: 'hamburger',
    },
    previewColors: { primary: '#10b981', secondary: '#064e3b' },
    previewHtml: '<div style="background:#030712;padding:16px;font-family:system-ui;height:100%"><div style="border:1px solid rgba(16,185,129,0.4);border-radius:6px;padding:12px 14px;margin-bottom:8px;box-shadow:0 0 16px rgba(16,185,129,0.1)"><div style="color:rgba(16,185,129,0.7);font-size:8px;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:4px">// Next-Gen Service</div><div style="color:#fff;font-size:14px;font-weight:900;margin-bottom:4px;line-height:1.2">Precision.<br/>Performance.</div><div style="color:rgba(255,255,255,0.5);font-size:9px;margin-bottom:10px">Advanced solutions for modern needs</div><div style="border:1px solid #10b981;color:#10b981;padding:5px 12px;border-radius:3px;font-size:9px;font-weight:700;display:inline-block;letter-spacing:0.05em">ENGAGE →</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px"><div style="padding:6px;border-left:2px solid rgba(16,185,129,0.5)"><div style="color:#10b981;font-size:10px;font-weight:800">99.9%</div><div style="color:rgba(255,255,255,0.4);font-size:7px">Uptime SLA</div></div><div style="padding:6px;border-left:2px solid rgba(16,185,129,0.5)"><div style="color:#10b981;font-size:10px;font-weight:800">1hr</div><div style="color:rgba(255,255,255,0.4);font-size:7px">Response</div></div></div></div>',
  },
  {
    id: 'warm-artisan',
    name: 'Warm Artisan',
    description: 'Earthy tones, warm feel with craft-focused design for artisan and home service businesses',
    industries: ['landscaping', 'painting', 'flooring', 'remodeling', 'restaurant', 'bakery', 'furniture'],
    recipe: {
      hero: 'full-bleed',
      services: 'alternating',
      about: 'photo-split',
      testimonials: 'single-spotlight',
      cta: 'split-offer',
      faq: 'two-column',
      footer: 'map-contact',
      navbar: 'hamburger',
    },
    previewColors: { primary: '#b45309', secondary: '#fffbeb' },
    previewHtml: '<div style="background:#fffbeb;padding:16px;font-family:Georgia,serif;height:100%"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px"><div style="background:linear-gradient(135deg,#92400e,#b45309);border-radius:6px;padding:10px;display:flex;align-items:center;justify-content:center"><div style="color:rgba(255,255,255,0.9);font-size:9px;text-align:center;line-height:1.5;font-style:italic">"Crafted<br/>with care"</div></div><div style="padding:4px 0"><div style="color:#92400e;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px">Est. 2005</div><div style="color:#1c1917;font-size:12px;font-weight:700;line-height:1.3;margin-bottom:6px">Artisan<br/>Quality</div><div style="background:#b45309;color:#fff;padding:4px 10px;border-radius:2px;font-size:8px;font-weight:600;display:inline-block">Our Work</div></div></div><div style="border-top:1px solid #fde68a;padding-top:8px"><div style="color:#78350f;font-size:8px;font-weight:600;margin-bottom:4px">What We Do</div><div style="color:#44403c;font-size:9px;margin-bottom:3px;font-style:italic">— Custom Craftsmanship</div><div style="color:#44403c;font-size:9px;margin-bottom:3px;font-style:italic">— Free Consultations</div><div style="color:#44403c;font-size:9px;font-style:italic">— Satisfaction Guaranteed</div></div></div>',
  },
  {
    id: 'trust-shield',
    name: 'Trust Shield',
    description: 'Badge-heavy, credibility-first layout emphasizing licenses, certifications, and guarantees',
    industries: ['legal', 'insurance', 'financial', 'accounting', 'medical', 'dental', 'veterinary'],
    recipe: {
      hero: 'centered-badge',
      services: 'icon-list',
      about: 'team-grid',
      testimonials: 'grid-cards',
      cta: 'form-embed',
      faq: 'accordion',
      footer: 'four-column',
      navbar: 'sticky-white',
    },
    previewColors: { primary: '#1d4ed8', secondary: '#eff6ff' },
    previewHtml: '<div style="background:#eff6ff;padding:16px;font-family:system-ui;height:100%"><div style="background:#fff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;margin-bottom:6px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><div style="width:28px;height:28px;background:#1d4ed8;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0"><div style="color:#fff;font-size:11px;font-weight:800">✓</div></div><div><div style="color:#1e3a8a;font-size:11px;font-weight:700">Licensed &amp; Certified</div><div style="color:#3b82f6;font-size:8px">⭐⭐⭐⭐⭐ 4.9 · 300+ reviews</div></div></div><div style="color:#374151;font-size:9px;margin-bottom:8px;line-height:1.4">Trusted professionals protecting what matters most.</div><div style="background:#1d4ed8;color:#fff;display:inline-block;padding:5px 12px;border-radius:4px;font-size:9px;font-weight:600">Free Consultation</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px"><div style="background:#fff;border:1px solid #bfdbfe;border-radius:4px;padding:5px;text-align:center"><div style="color:#1d4ed8;font-size:9px;font-weight:800">BBB A+</div></div><div style="background:#fff;border:1px solid #bfdbfe;border-radius:4px;padding:5px;text-align:center"><div style="color:#1d4ed8;font-size:9px;font-weight:800">25 Yrs</div></div></div></div>',
  },
];

/** Get templates sorted by relevance to a given industry */
export function getTemplatesForIndustry(industry: string): TemplatePreview[] {
  const matches = TEMPLATE_GALLERY.filter(t => t.industries.includes(industry));
  const others = TEMPLATE_GALLERY.filter(t => !t.industries.includes(industry));
  return [...matches, ...others];
}

/** Get a single template by ID */
export function getTemplateById(id: string): TemplatePreview | undefined {
  return TEMPLATE_GALLERY.find(t => t.id === id);
}
