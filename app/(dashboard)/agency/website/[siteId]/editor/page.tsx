'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Globe,
  ExternalLink,
  RefreshCw,
  Loader2,
  FileText,
  Check,
  X,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Home,
  Briefcase,
  MapPin,
  MessageSquare,
  HelpCircle,
  Star,
  Phone,
  Edit3,
  Eye,
  EyeOff,
  RotateCcw,
  TrendingUp,
  Settings,
  BookOpen,
  Building2,
  Mail,
  Clock,
  Link2,
  Navigation,
  Image as ImageIcon,
  Upload,
  Trash2,
  Plus,
  GripVertical,
  ArrowUp,
  ArrowDown,
  MousePointerClick,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SitePage {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  page_type: string;
  hero_h1: string | null;
  hero_subtitle: string | null;
  hero_cta_text: string | null;
  hero_cta_link: string | null;
  meta_title: string | null;
  meta_description: string | null;
  content_sections: ContentSection[] | null;
  faq: FAQItem[] | null;
  edited: boolean;
  edited_at: string | null;
  hidden: boolean;
}

interface ContentSection {
  heading: string;
  body: string;
  bullets?: string[];
  cta_text?: string;
  cta_link?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface NavLink {
  label: string;
  href: string;
}

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  yelp?: string;
}

interface SitePhoto {
  url: string;
  alt?: string;
  placement?: string;
  storage_path?: string;
}

interface SiteData {
  id: string;
  business_name: string;
  industry: string;
  status: string;
  site_domain: string | null;
  site_subdomain: string | null;
  page_count: number;
  phone: string | null;
  email: string | null;
  address: { street?: string; city?: string; state?: string; zip?: string } | null;
  hours: Record<string, string> | null;
  booking_url: string | null;
  google_review_url: string | null;
  tagline: string | null;
  nav_links: NavLink[] | null;
  footer_tagline: string | null;
  social_links: SocialLinks | null;
  photos: SitePhoto[] | null;
}

// ── Page Type Icons ───────────────────────────────────────────────────────────

const PAGE_ICONS: Record<string, React.ReactNode> = {
  homepage: <Home className="h-4 w-4" />,
  services: <Briefcase className="h-4 w-4" />,
  service: <Briefcase className="h-4 w-4" />,
  city: <MapPin className="h-4 w-4" />,
  city_service: <MapPin className="h-4 w-4" />,
  about: <FileText className="h-4 w-4" />,
  contact: <Phone className="h-4 w-4" />,
  faq: <HelpCircle className="h-4 w-4" />,
  reviews: <Star className="h-4 w-4" />,
  blog: <BookOpen className="h-4 w-4" />,
  utility: <FileText className="h-4 w-4" />,
};

function getPageIcon(page: SitePage) {
  if (page.slug === '/') return PAGE_ICONS.homepage;
  if (page.slug === '/about') return PAGE_ICONS.about;
  if (page.slug === '/contact') return PAGE_ICONS.contact;
  if (page.slug === '/faq') return PAGE_ICONS.faq;
  if (page.slug === '/reviews') return PAGE_ICONS.reviews;
  return PAGE_ICONS[page.page_type] || PAGE_ICONS.utility;
}

function getPageLabel(page: SitePage): string {
  if (page.slug === '/') return 'Homepage';
  return page.title || page.slug.replace(/^\//, '').replace(/-/g, ' ');
}

// ── Collapsible Card ──────────────────────────────────────────────────────────

function CollapsibleCard({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-indigo-500">{icon}</span>
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {badge && (
            <span className="text-[10px] font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  );
}

// ── Section Editor Modal ──────────────────────────────────────────────────────

function SectionEditModal({
  section,
  sectionIndex,
  onSave,
  onClose,
  saving,
}: {
  section: ContentSection;
  sectionIndex: number;
  onSave: (index: number, updated: ContentSection) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [heading, setHeading] = useState(section.heading);
  const [body, setBody] = useState(section.body);
  const [bullets, setBullets] = useState(section.bullets?.join('\n') || '');
  const [ctaText, setCtaText] = useState(section.cta_text || '');
  const [ctaLink, setCtaLink] = useState(section.cta_link || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Edit Section</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heading</label>
            <input
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y font-mono"
            />
          </div>

          {(section.bullets?.length ?? 0) > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bullet Points <span className="text-gray-400 font-normal">(one per line)</span>
              </label>
              <textarea
                value={bullets}
                onChange={(e) => setBullets(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
              />
            </div>
          )}

          {/* P1: CTA Button per section */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5 text-indigo-500" />
              CTA Button <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Button Text</label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="e.g. Learn More"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Button Link</label>
                <input
                  type="text"
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                  placeholder="e.g. /contact or https://..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave(sectionIndex, {
                heading,
                body,
                bullets: bullets.trim() ? bullets.split('\n').map((b) => b.trim()).filter(Boolean) : undefined,
                cta_text: ctaText.trim() || undefined,
                cta_link: ctaLink.trim() || undefined,
              })
            }
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Hero Editor ───────────────────────────────────────────────────────────────

function HeroEditor({
  page,
  photos,
  onSave,
  saving,
}: {
  page: SitePage;
  photos: SitePhoto[];
  onSave: (updates: Partial<SitePage>) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [heroH1, setHeroH1] = useState(page.hero_h1 || '');
  const [heroSubtitle, setHeroSubtitle] = useState(page.hero_subtitle || '');
  const [metaTitle, setMetaTitle] = useState(page.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(page.meta_description || '');
  const [ctaText, setCtaText] = useState(page.hero_cta_text || '');
  const [ctaLink, setCtaLink] = useState(page.hero_cta_link || '');

  useEffect(() => {
    setHeroH1(page.hero_h1 || '');
    setHeroSubtitle(page.hero_subtitle || '');
    setMetaTitle(page.meta_title || '');
    setMetaDescription(page.meta_description || '');
    setCtaText(page.hero_cta_text || '');
    setCtaLink(page.hero_cta_link || '');
  }, [page]);

  if (!editing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="h-4 w-4 text-indigo-500" />
            Hero & SEO
          </h4>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            <Edit3 className="h-3 w-3" />
            Edit
          </button>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-bold text-gray-900">{page.hero_h1 || 'No headline set'}</p>
          <p className="text-sm text-gray-500">{page.hero_subtitle || 'No subtitle'}</p>
          {page.hero_cta_text && (
            <p className="text-xs text-indigo-600">CTA: {page.hero_cta_text} → {page.hero_cta_link || '#'}</p>
          )}
          <div className="pt-2 border-t border-gray-100 mt-3">
            <p className="text-xs text-gray-400">Meta: {page.meta_title || 'Auto-generated'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-indigo-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-indigo-500" />
          Edit Hero & SEO
        </h4>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Headline (H1)</label>
          <input
            type="text"
            value={heroH1}
            onChange={(e) => setHeroH1(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle</label>
          <input
            type="text"
            value={heroSubtitle}
            onChange={(e) => setHeroSubtitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CTA Button Text</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="e.g. Get Free Estimate"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CTA Button Link</label>
            <input
              type="text"
              value={ctaLink}
              onChange={(e) => setCtaLink(e.target.value)}
              placeholder="e.g. /contact"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Meta Title</label>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Meta Description</label>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => {
              onSave({
                hero_h1: heroH1,
                hero_subtitle: heroSubtitle,
                hero_cta_text: ctaText || null,
                hero_cta_link: ctaLink || null,
                meta_title: metaTitle,
                meta_description: metaDescription,
              });
              setEditing(false);
            }}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Business Details Editor ───────────────────────────────────────────────────

function BusinessDetailsEditor({
  site,
  onSave,
  saving,
}: {
  site: SiteData;
  onSave: (updates: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [phone, setPhone] = useState(site.phone || '');
  const [email, setEmail] = useState(site.email || '');
  const [street, setStreet] = useState(site.address?.street || '');
  const [city, setCity] = useState(site.address?.city || '');
  const [state, setState] = useState(site.address?.state || '');
  const [zip, setZip] = useState(site.address?.zip || '');
  const [bookingUrl, setBookingUrl] = useState(site.booking_url || '');
  const [googleReviewUrl, setGoogleReviewUrl] = useState(site.google_review_url || '');
  const [tagline, setTagline] = useState(site.tagline || '');
  const [hours, setHours] = useState(site.hours || {});
  const [dirty, setDirty] = useState(false);

  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayLabels: Record<string, string> = {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
    fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
  };

  return (
    <CollapsibleCard title="Business Details" icon={<Building2 className="h-4 w-4" />} defaultOpen={false}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Phone className="h-3 w-3" /> Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setDirty(true); }}
              placeholder="(555) 123-4567"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setDirty(true); }}
              placeholder="info@business.com"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
          <input
            type="text"
            value={street}
            onChange={(e) => { setStreet(e.target.value); setDirty(true); }}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            value={city}
            onChange={(e) => { setCity(e.target.value); setDirty(true); }}
            placeholder="City"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={state}
            onChange={(e) => { setState(e.target.value); setDirty(true); }}
            placeholder="State"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={zip}
            onChange={(e) => { setZip(e.target.value); setDirty(true); }}
            placeholder="ZIP"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => { setTagline(e.target.value); setDirty(true); }}
            placeholder="Your trusted local experts"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Booking URL
            </label>
            <input
              type="url"
              value={bookingUrl}
              onChange={(e) => { setBookingUrl(e.target.value); setDirty(true); }}
              placeholder="https://calendly.com/..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Star className="h-3 w-3" /> Google Review URL
            </label>
            <input
              type="url"
              value={googleReviewUrl}
              onChange={(e) => { setGoogleReviewUrl(e.target.value); setDirty(true); }}
              placeholder="https://g.page/..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Business hours */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Business Hours
          </label>
          <div className="space-y-1.5">
            {dayKeys.map((day) => (
              <div key={day} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20">{dayLabels[day]}</span>
                <input
                  type="text"
                  value={hours[day] || ''}
                  onChange={(e) => { setHours({ ...hours, [day]: e.target.value }); setDirty(true); }}
                  placeholder="8:00 AM - 6:00 PM"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            onSave({
              phone: phone || null,
              email: email || null,
              address: { street, city, state, zip, ...((site.address as Record<string, unknown>)?.lat ? { lat: (site.address as Record<string, unknown>).lat } : {}), ...((site.address as Record<string, unknown>)?.lng ? { lng: (site.address as Record<string, unknown>).lng } : {}) },
              booking_url: bookingUrl || null,
              google_review_url: googleReviewUrl || null,
              tagline: tagline || null,
              hours,
            });
            setDirty(false);
          }}
          disabled={saving || !dirty}
          className="w-full px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save Business Details
        </button>
      </div>
    </CollapsibleCard>
  );
}

// ── Nav Link Editor ───────────────────────────────────────────────────────────

function NavLinkEditor({
  site,
  onSave,
  saving,
}: {
  site: SiteData;
  onSave: (updates: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const defaultLinks: NavLink[] = [
    { label: 'Home', href: '#top' },
    { label: 'Services', href: '#services' },
    { label: 'About', href: '#about' },
    { label: 'Reviews', href: '#testimonials' },
    { label: 'Contact', href: '#contact' },
  ];
  const [links, setLinks] = useState<NavLink[]>(
    site.nav_links && site.nav_links.length > 0 ? site.nav_links : defaultLinks
  );
  const [dirty, setDirty] = useState(false);

  const addLink = () => {
    setLinks([...links, { label: '', href: '' }]);
    setDirty(true);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
    setDirty(true);
  };

  const moveLink = (index: number, direction: -1 | 1) => {
    const newLinks = [...links];
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    [newLinks[index], newLinks[target]] = [newLinks[target], newLinks[index]];
    setLinks(newLinks);
    setDirty(true);
  };

  const updateLink = (index: number, field: 'label' | 'href', value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setLinks(newLinks);
    setDirty(true);
  };

  return (
    <CollapsibleCard title="Navigation Links" icon={<Navigation className="h-4 w-4" />} badge={`${links.length} links`}>
      <div className="space-y-2">
        {links.map((link, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moveLink(i, -1)}
                disabled={i === 0}
                className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => moveLink(i, 1)}
                disabled={i === links.length - 1}
                className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
            <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
            <input
              type="text"
              value={link.label}
              onChange={(e) => updateLink(i, 'label', e.target.value)}
              placeholder="Label"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={link.href}
              onChange={(e) => updateLink(i, 'href', e.target.value)}
              placeholder="#section or /page"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => removeLink(i)}
              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={addLink}
            className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add Link
          </button>
          <button
            onClick={() => {
              onSave({ nav_links: links.filter(l => l.label && l.href) });
              setDirty(false);
            }}
            disabled={saving || !dirty}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
        </div>
      </div>
    </CollapsibleCard>
  );
}

// ── Footer Editor ─────────────────────────────────────────────────────────────

function FooterEditor({
  site,
  onSave,
  saving,
}: {
  site: SiteData;
  onSave: (updates: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [footerTagline, setFooterTagline] = useState(site.footer_tagline || '');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(site.social_links || {});
  const [dirty, setDirty] = useState(false);

  const socialPlatforms: { key: keyof SocialLinks; label: string }[] = [
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'twitter', label: 'Twitter / X' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'yelp', label: 'Yelp' },
  ];

  return (
    <CollapsibleCard title="Footer" icon={<FileText className="h-4 w-4" />}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Footer Tagline</label>
          <textarea
            value={footerTagline}
            onChange={(e) => { setFooterTagline(e.target.value); setDirty(true); }}
            rows={2}
            placeholder="Proudly serving our community with quality, integrity, and care on every job."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Social Media Links</label>
          <div className="space-y-2">
            {socialPlatforms.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-24">{label}</span>
                <input
                  type="url"
                  value={socialLinks[key] || ''}
                  onChange={(e) => {
                    setSocialLinks({ ...socialLinks, [key]: e.target.value });
                    setDirty(true);
                  }}
                  placeholder={`https://${key}.com/...`}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            const cleanedSocial = Object.fromEntries(
              Object.entries(socialLinks).filter(([, v]) => v)
            );
            onSave({
              footer_tagline: footerTagline || null,
              social_links: Object.keys(cleanedSocial).length > 0 ? cleanedSocial : null,
            });
            setDirty(false);
          }}
          disabled={saving || !dirty}
          className="w-full px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save Footer
        </button>
      </div>
    </CollapsibleCard>
  );
}

// ── Image Gallery / Upload ────────────────────────────────────────────────────

function ImageGallery({
  siteId,
  photos,
  onPhotosChanged,
}: {
  siteId: string;
  photos: SitePhoto[];
  onPhotosChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt', file.name.replace(/\.[^.]+$/, ''));

      const res = await fetch(`/api/agency/sites/${siteId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        onPhotosChanged();
      }
    } catch {
      // silent
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (url: string) => {
    setDeleting(url);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        onPhotosChanged();
      }
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  };

  return (
    <CollapsibleCard title="Photos" icon={<ImageIcon className="h-4 w-4" />} badge={`${photos.length} photos`}>
      <div className="space-y-3">
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden aspect-video bg-gray-100">
                <img
                  src={photo.url}
                  alt={photo.alt || ''}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleDelete(photo.url)}
                  disabled={deleting === photo.url}
                  className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  {deleting === photo.url ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Photo
            </>
          )}
        </button>
      </div>
    </CollapsibleCard>
  );
}

// ── Main Editor Page ──────────────────────────────────────────────────────────

export default function PageEditor() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  const [site, setSite] = useState<SiteData | null>(null);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [selectedPage, setSelectedPage] = useState<SitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSite, setSavingSite] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateInput, setShowRegenerateInput] = useState(false);
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const [rebuilding, setRebuilding] = useState(false);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const siteUrl = site?.site_subdomain
    ? `https://${site.site_subdomain}`
    : site?.site_domain
      ? `https://${site.site_domain}`
      : null;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch site and pages
  const fetchData = useCallback(async () => {
    try {
      const [siteRes, pagesRes] = await Promise.all([
        fetch(`/api/agency/sites/${siteId}`),
        fetch(`/api/agency/sites/${siteId}/pages`),
      ]);

      if (siteRes.ok) {
        const siteResult = await siteRes.json();
        setSite(siteResult.data);
      }

      if (pagesRes.ok) {
        const pagesResult = await pagesRes.json();
        if (Array.isArray(pagesResult.data)) {
          setPages(pagesResult.data);
          if (!selectedPage && pagesResult.data.length > 0) {
            setSelectedPage(pagesResult.data[0]);
          }
        }
      }
    } catch (err) {
      console.error('[editor] Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [siteId, selectedPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh selected page data
  const refreshPage = async (slug: string) => {
    try {
      const encodedSlug = encodeURIComponent(slug);
      const res = await fetch(`/api/agency/sites/${siteId}/pages/${encodedSlug}`);
      if (res.ok) {
        const result = await res.json();
        if (result.data) {
          setSelectedPage(result.data);
          setPages((prev) => prev.map((p) => (p.slug === slug ? result.data : p)));
        }
      }
    } catch {
      // silently ignore
    }
  };

  // Refresh site data
  const refreshSite = async () => {
    try {
      const res = await fetch(`/api/agency/sites/${siteId}`);
      if (res.ok) {
        const result = await res.json();
        setSite(result.data);
      }
    } catch {
      // silently ignore
    }
  };

  // Save page edits (hero, meta, hidden)
  const savePageEdits = async (updates: Partial<SitePage>) => {
    if (!selectedPage) return;
    setSaving(true);
    try {
      const encodedSlug = encodeURIComponent(selectedPage.slug);
      const res = await fetch(`/api/agency/sites/${siteId}/pages/${encodedSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        showToast('Changes saved');
        await refreshPage(selectedPage.slug);
      } else {
        showToast('Failed to save changes', 'error');
      }
    } catch {
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save site-level edits (business details, nav links, footer)
  const saveSiteEdits = async (updates: Record<string, unknown>) => {
    setSavingSite(true);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        showToast('Saved');
        await refreshSite();
      } else {
        showToast('Failed to save', 'error');
      }
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSavingSite(false);
    }
  };

  // Save section edit
  const saveSectionEdit = async (index: number, updated: ContentSection) => {
    if (!selectedPage || !selectedPage.content_sections) return;
    setSaving(true);
    try {
      const newSections = [...selectedPage.content_sections];
      newSections[index] = updated;
      const encodedSlug = encodeURIComponent(selectedPage.slug);
      const res = await fetch(`/api/agency/sites/${siteId}/pages/${encodedSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_sections: newSections }),
      });
      if (res.ok) {
        showToast('Section saved');
        setEditingSection(null);
        await refreshPage(selectedPage.slug);
      } else {
        showToast('Failed to save section', 'error');
      }
    } catch {
      showToast('Failed to save section', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle page visibility
  const togglePageVisibility = async (page: SitePage) => {
    setSaving(true);
    try {
      const encodedSlug = encodeURIComponent(page.slug);
      const res = await fetch(`/api/agency/sites/${siteId}/pages/${encodedSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !page.hidden }),
      });
      if (res.ok) {
        showToast(page.hidden ? 'Page visible' : 'Page hidden');
        // Refresh pages list and selected
        const pagesRes = await fetch(`/api/agency/sites/${siteId}/pages`);
        if (pagesRes.ok) {
          const pagesResult = await pagesRes.json();
          if (Array.isArray(pagesResult.data)) {
            setPages(pagesResult.data);
            if (selectedPage?.id === page.id) {
              const updatedPage = pagesResult.data.find((p: SitePage) => p.id === page.id);
              if (updatedPage) setSelectedPage(updatedPage);
            }
          }
        }
      } else {
        showToast('Failed to update visibility', 'error');
      }
    } catch {
      showToast('Failed to update visibility', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Regenerate page with AI
  const regeneratePage = async (feedback?: string) => {
    if (!selectedPage) return;
    setRegenerating(true);
    try {
      const encodedSlug = encodeURIComponent(selectedPage.slug);
      const res = await fetch(`/api/agency/sites/${siteId}/pages/${encodedSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate', feedback }),
      });
      if (res.ok) {
        showToast('Regenerating page... Check back in a moment.');
        setTimeout(() => refreshPage(selectedPage.slug), 5000);
        setTimeout(() => refreshPage(selectedPage.slug), 10000);
        setTimeout(() => refreshPage(selectedPage.slug), 20000);
      } else {
        showToast('Failed to regenerate page', 'error');
      }
    } catch {
      showToast('Failed to regenerate page', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  // Rebuild & deploy site
  const rebuildSite = async () => {
    setRebuilding(true);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}/build`, {
        method: 'POST',
      });
      if (res.ok) {
        showToast('Site rebuild started. Live in ~30 seconds.');
      } else {
        showToast('Failed to start rebuild', 'error');
      }
    } catch {
      showToast('Failed to start rebuild', 'error');
    } finally {
      setTimeout(() => setRebuilding(false), 5000);
    }
  };

  // Group pages by type
  const groupedPages: Record<string, SitePage[]> = {};
  for (const page of pages) {
    const type = page.page_type || 'utility';
    if (!groupedPages[type]) groupedPages[type] = [];
    groupedPages[type].push(page);
  }

  const GROUP_LABELS: Record<string, string> = {
    homepage: 'Home',
    service: 'Services',
    services: 'Services',
    city: 'City Pages',
    city_service: 'City Pages',
    blog: 'Blog',
    utility: 'Other Pages',
  };

  const GROUP_ORDER = ['homepage', 'service', 'services', 'city', 'city_service', 'blog', 'utility'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Section Edit Modal */}
      {editingSection !== null && selectedPage?.content_sections?.[editingSection] && (
        <SectionEditModal
          section={selectedPage.content_sections[editingSection]}
          sectionIndex={editingSection}
          onSave={saveSectionEdit}
          onClose={() => setEditingSection(null)}
          saving={saving}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/agency/website"
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-600" />
                {site?.business_name || 'Site Editor'}
              </h1>
              {siteUrl && (
                <p className="text-xs text-gray-400 font-mono">{siteUrl}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {siteUrl && (
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
              >
                <ExternalLink className="h-3 w-3" />
                View Live
              </a>
            )}
            <button
              onClick={rebuildSite}
              disabled={rebuilding}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {rebuilding ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Rebuild & Deploy
            </button>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex border-t border-gray-100 px-4">
          {[
            { href: `/agency/website/${siteId}/editor`, icon: <Edit3 className="h-3.5 w-3.5" />, label: 'Editor', active: true },
            { href: `/agency/website/${siteId}/growth`, icon: <TrendingUp className="h-3.5 w-3.5" />, label: 'Growth', active: false },
            { href: `/agency/website/${siteId}/settings`, icon: <Settings className="h-3.5 w-3.5" />, label: 'Settings', active: false },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab.active
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — Page List */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pages ({pages.length})</p>
          </div>

          <div className="py-2">
            {GROUP_ORDER.map((type) => {
              const typePages = groupedPages[type];
              if (!typePages || typePages.length === 0) return null;
              return (
                <div key={type} className="mb-2">
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    {GROUP_LABELS[type] || type}
                  </p>
                  {typePages.map((page) => {
                    const isSelected = selectedPage?.id === page.id;
                    return (
                      <div
                        key={page.id}
                        className={`flex items-center gap-1 pr-1 ${
                          page.hidden ? 'opacity-50' : ''
                        }`}
                      >
                        <button
                          onClick={() => setSelectedPage(page)}
                          className={`flex-1 flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className={isSelected ? 'text-indigo-500' : 'text-gray-400'}>
                            {getPageIcon(page)}
                          </span>
                          <span className="text-sm truncate">{getPageLabel(page)}</span>
                          {page.hidden && (
                            <span className="ml-auto shrink-0 text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                              Hidden
                            </span>
                          )}
                          {!page.hidden && page.edited && (
                            <span className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Edited" />
                          )}
                        </button>
                        {/* Visibility toggle */}
                        <button
                          onClick={() => togglePageVisibility(page)}
                          className="p-1 text-gray-300 hover:text-gray-500 transition-colors shrink-0"
                          title={page.hidden ? 'Show page' : 'Hide page'}
                        >
                          {page.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {selectedPage ? (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {/* Page header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{getPageIcon(selectedPage)}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {getPageLabel(selectedPage)}
                      {selectedPage.hidden && (
                        <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <EyeOff className="h-3 w-3" /> Hidden
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-gray-400 font-mono">{selectedPage.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {showRegenerateInput ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={regenerateFeedback}
                        onChange={(e) => setRegenerateFeedback(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            regeneratePage(regenerateFeedback || undefined);
                            setShowRegenerateInput(false);
                            setRegenerateFeedback('');
                          } else if (e.key === 'Escape') {
                            setShowRegenerateInput(false);
                            setRegenerateFeedback('');
                          }
                        }}
                        placeholder="e.g. more friendly, focus on emergency services"
                        className="w-64 px-2.5 py-1.5 text-xs border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          regeneratePage(regenerateFeedback || undefined);
                          setShowRegenerateInput(false);
                          setRegenerateFeedback('');
                        }}
                        disabled={regenerating}
                        className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Go
                      </button>
                      <button
                        onClick={() => { setShowRegenerateInput(false); setRegenerateFeedback(''); }}
                        className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowRegenerateInput(true)}
                      disabled={regenerating}
                      className="px-3 py-1.5 text-xs font-medium border border-amber-200 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Regenerate with AI
                    </button>
                  )}
                  {siteUrl && (
                    <a
                      href={`${siteUrl}${selectedPage.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                    >
                      <Eye className="h-3 w-3" />
                      Preview
                    </a>
                  )}
                </div>
              </div>

              {/* Site-level editors (show on homepage only to avoid repetition) */}
              {selectedPage.slug === '/' && site && (
                <div className="space-y-4">
                  <BusinessDetailsEditor site={site} onSave={saveSiteEdits} saving={savingSite} />
                  <NavLinkEditor site={site} onSave={saveSiteEdits} saving={savingSite} />
                  <FooterEditor site={site} onSave={saveSiteEdits} saving={savingSite} />
                  <ImageGallery
                    siteId={siteId}
                    photos={site.photos || []}
                    onPhotosChanged={refreshSite}
                  />
                </div>
              )}

              {/* Hero & SEO Editor */}
              <HeroEditor
                page={selectedPage}
                photos={site?.photos || []}
                onSave={savePageEdits}
                saving={saving}
              />

              {/* Content Sections */}
              {selectedPage.content_sections && selectedPage.content_sections.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-indigo-500" />
                    Content Sections ({selectedPage.content_sections.length})
                  </h4>

                  {selectedPage.content_sections.map((section, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-200 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 mb-1">{section.heading || `Section ${i + 1}`}</p>
                          <p className="text-sm text-gray-500 line-clamp-3">{section.body}</p>
                          <div className="flex items-center gap-3 mt-2">
                            {section.bullets && section.bullets.length > 0 && (
                              <div className="flex items-center gap-1">
                                <ChevronRight className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-400">
                                  {section.bullets.length} bullet{section.bullets.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                            {section.cta_text && (
                              <div className="flex items-center gap-1">
                                <MousePointerClick className="h-3 w-3 text-indigo-400" />
                                <span className="text-xs text-indigo-500">{section.cta_text}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setEditingSection(i)}
                          className="shrink-0 ml-3 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* FAQ Section */}
              {selectedPage.faq && selectedPage.faq.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-indigo-500" />
                    FAQ ({selectedPage.faq.length} items)
                  </h4>

                  {selectedPage.faq.map((item, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-sm font-medium text-gray-900 mb-1">Q: {item.question}</p>
                      <p className="text-sm text-gray-500 line-clamp-2">A: {item.answer}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Preview iframe */}
              {siteUrl && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      </div>
                      <span className="text-xs font-mono text-gray-400 ml-1 truncate">
                        {siteUrl}{selectedPage.slug}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const iframe = document.querySelector('#page-preview') as HTMLIFrameElement;
                        if (iframe) iframe.src = iframe.src;
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Refresh
                    </button>
                  </div>
                  <iframe
                    id="page-preview"
                    src={`${siteUrl}${selectedPage.slug}?t=${Date.now()}`}
                    className="w-full border-0"
                    style={{ height: '500px' }}
                    title={`Preview: ${getPageLabel(selectedPage)}`}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Select a page from the sidebar to edit</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
