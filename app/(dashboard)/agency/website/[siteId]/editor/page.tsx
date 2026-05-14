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
  CheckCircle2,
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
  Layers,
  ChevronUp,
  Palette,
  Copy,
  Menu,
  Search,
} from 'lucide-react';

import {
  SECTION_VARIANTS,
  REORDERABLE_SECTIONS,
  DEFAULT_SECTION_ORDER,
  formatVariantName,
} from '@/lib/sites/section-variants';
import { WidgetBuilderEmbedded } from '@/components/dashboard/widget-builder-embedded';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Sprint 5: a single configurable form field on a page's form-embed CTA. */
interface FormFieldDef {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'number';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

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
  // Sprint 5 additions
  cta_form_fields: FormFieldDef[] | null;
  form_webhook_url: string | null;
  publish_at: string | null;
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
  /** Optional dropdown children — when set, link renders as a hover menu group. */
  children?: { label: string; href: string }[];
}

/** Footer column entry for the custom Footer Builder. */
interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

/** Navbar template variants — must match `NAVBARS` keys in assembler.ts. */
type NavbarVariant = 'sticky-white' | 'transparent-overlay' | 'hamburger';
/** Footer template variants — must match `FOOTERS` keys in assembler.ts. */
type FooterVariant = 'map-contact' | 'four-column' | 'minimal';

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
  // Theme — colors + design style + font + radius. Sprint 2 added the last two.
  color_primary: string;
  color_secondary: string;
  design_style: 'modern-dark' | 'clean-light' | 'bold' | 'minimal';
  logo_url: string | null;
  nav_links: NavLink[] | null;
  navbar_variant: NavbarVariant | null;
  footer_tagline: string | null;
  footer_variant: FooterVariant | null;
  footer_columns: FooterColumn[] | null;
  social_links: SocialLinks | null;
  photos: SitePhoto[] | null;
  // P2: Visual Section Management
  section_order: string[] | null;
  section_overrides: Record<string, string> | null;
  template_id: string | null;
  client_id?: string | null;
  // Theme tokens (2026-05-14 Sprint 2). Site-level design overrides applied
  // as CSS custom properties during build. NULL = use design_style defaults.
  font_family: string | null;
  border_radius: string | null;
  // Custom code (Sprint 3). Raw HTML injected at build time before </head>
  // and </body>. Not sanitized — agency pastes their own analytics/pixels.
  head_code: string | null;
  body_code: string | null;
  // Staleness tracking — compare these to determine if the live site is
  // behind the latest edits and the "Unpublished changes" pill should show.
  updated_at: string | null;
  last_deployed_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Detect whether a SitePage row is the homepage. Production rows use
 * `page_type === 'homepage'` (preferred) or `slug === 'home'`. The legacy
 * `slug === '/'` form only appears in older fixtures, kept for backward
 * compat. Centralizing this avoided multiple bugs where Site Settings and
 * the homepage-only editors were gated on slug='/' and never appeared in
 * production (where slugs are stored as 'home').
 */
function isHomepageRow(page: { page_type?: string; slug?: string }): boolean {
  return page.page_type === 'homepage' || page.slug === 'home' || page.slug === '/';
}

/**
 * Are there edits in Supabase that haven't been pushed to the live site yet?
 *
 * Compares site.updated_at and any page.edited_at against last_deployed_at.
 * Returns true when ANY edit is newer than the most recent live build, so
 * the header can show an "Unpublished changes" pill nudging the customer
 * to hit Rebuild & Deploy. We deliberately don't auto-rebuild on save —
 * each rebuild is a multi-minute VPS job, so customers batch edits and
 * deploy once when they're ready.
 */
function hasUnpublishedChanges(
  site: { updated_at: string | null; last_deployed_at: string | null } | null,
  pages: Array<{ edited_at: string | null }>,
): boolean {
  if (!site) return false;
  // Site never deployed → nothing to compare against, treat as not-stale
  // so we don't spam a brand-new draft with the pill before first deploy.
  if (!site.last_deployed_at) return false;
  const deployedAt = new Date(site.last_deployed_at).getTime();
  if (Number.isNaN(deployedAt)) return false;

  if (site.updated_at) {
    const updatedAt = new Date(site.updated_at).getTime();
    // 5s tolerance for clock skew between DB write and deploy timestamp.
    if (!Number.isNaN(updatedAt) && updatedAt > deployedAt + 5_000) return true;
  }
  for (const p of pages) {
    if (!p.edited_at) continue;
    const editedAt = new Date(p.edited_at).getTime();
    if (!Number.isNaN(editedAt) && editedAt > deployedAt + 5_000) return true;
  }
  return false;
}

/**
 * Convert a UTC ISO string to the local `YYYY-MM-DDTHH:mm` format expected
 * by `<input type="datetime-local">`. The native control doesn't accept
 * timezone offsets, so we have to render in local time. Reverse direction
 * (input value → ISO) is handled at save time via `new Date(value).toISOString()`.
 *
 * Sprint 5 helper.
 */
function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Format a UTC ISO string into a relative time like "5 min ago", "2 h ago". */
function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Live Preview Panel ────────────────────────────────────────────────────────

/**
 * PreviewPanel — Sprint 6 (2026-05-14).
 *
 * Renders the current page's assembled HTML inside an iframe pointed at
 * `/api/agency/sites/[id]/preview/[slug]` (server-side assembled from
 * CURRENT DB state, no VPS roundtrip). Includes a device-width switcher
 * (mobile / tablet / desktop) and a manual refresh — though refreshes are
 * also triggered automatically when saves bump previewRefreshKey.
 */
function PreviewPanel({
  siteId,
  pageSlug,
  device,
  refreshKey,
  onDeviceChange,
  onRefresh,
  onClose,
}: {
  siteId: string;
  pageSlug: string;
  device: 'mobile' | 'tablet' | 'desktop';
  refreshKey: number;
  onDeviceChange: (d: 'mobile' | 'tablet' | 'desktop') => void;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const widths: Record<'mobile' | 'tablet' | 'desktop', string> = {
    mobile: '375px',
    tablet: '768px',
    desktop: '100%',
  };
  const encoded = encodeURIComponent(pageSlug);
  // Append refreshKey to the URL so each refresh forces a fresh fetch even
  // when the iframe's internal cache would otherwise short-circuit.
  const src = `/api/agency/sites/${siteId}/preview/${encoded}?_r=${refreshKey}`;

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['mobile', 'tablet', 'desktop'] as const).map((d) => (
            <button
              key={d}
              onClick={() => onDeviceChange(d)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors capitalize ${
                device === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            title="Refresh preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            title="Hide preview"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {/* Iframe — centered when narrower than the pane (mobile/tablet) */}
      <div className="flex-1 overflow-auto p-3 flex items-start justify-center">
        <div
          className="bg-white shadow-md transition-all"
          style={{
            width: widths[device],
            maxWidth: '100%',
            height: '100%',
            minHeight: '100%',
          }}
        >
          <iframe
            key={refreshKey}
            src={src}
            title="Live preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
      </div>
    </div>
  );
}

// ── Deploy History Button ─────────────────────────────────────────────────────

/**
 * Header dropdown that fetches the last 10 deploys from
 * `/api/agency/sites/[id]/deploys` and renders them as a popover list. Lets
 * customers verify that recent edits actually shipped, and surfaces failure
 * notes inline so they're not blocked waiting on us to investigate.
 *
 * Fetches lazily on open — the editor pulls this often enough that we don't
 * want to load 20 rows on every editor mount.
 */
function DeployHistoryButton({ siteId, siteUrl }: { siteId: string; siteUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deploys, setDeploys] = useState<Array<{
    id: string;
    status: string;
    pages_deployed: number;
    deployed_at: string;
    notes: string | null;
    triggered_by: string;
  }>>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click — keeps the popover from sticking around when
  // customers navigate to another control.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && deploys.length === 0) {
      setLoading(true);
      try {
        const res = await fetch(`/api/agency/sites/${siteId}/deploys`, { cache: 'no-store' });
        if (res.ok) {
          const result = await res.json();
          setDeploys((result.data || []).slice(0, 10));
        }
      } catch (err) {
        console.error('[editor] deploy history fetch', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={toggle}
        className="min-h-[44px] sm:min-h-0 px-2 sm:px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
        title="Deploy history"
      >
        <Clock className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
        <span className="hidden sm:inline">History</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-[28rem] overflow-y-auto"
        >
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Recent deploys</span>
            {siteUrl && (
              <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1">
                Visit live <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
          {loading && (
            <div className="px-3 py-6 flex items-center justify-center text-xs text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Loading…
            </div>
          )}
          {!loading && deploys.length === 0 && (
            <div className="px-3 py-6 text-xs text-gray-500 text-center">No deploys yet.</div>
          )}
          {!loading && deploys.map(d => {
            const success = d.status === 'success';
            return (
              <div key={d.id} className="px-3 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {success
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <X className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                    <span className={`text-xs font-medium ${success ? 'text-gray-800' : 'text-red-700'}`}>
                      {success ? `${d.pages_deployed} pages deployed` : 'Failed'}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{formatRelativeTime(d.deployed_at)}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 ml-5.5 pl-5">
                  via {d.triggered_by}
                </div>
                {!success && d.notes && (
                  <div className="mt-1.5 ml-5 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded p-1.5 font-mono whitespace-pre-wrap break-words max-h-20 overflow-y-auto">
                    {d.notes.length > 200 ? `${d.notes.slice(0, 200)}…` : d.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
  if (isHomepageRow(page)) return PAGE_ICONS.homepage;
  if (page.slug === '/about') return PAGE_ICONS.about;
  if (page.slug === '/contact') return PAGE_ICONS.contact;
  if (page.slug === '/faq') return PAGE_ICONS.faq;
  if (page.slug === '/reviews') return PAGE_ICONS.reviews;
  return PAGE_ICONS[page.page_type] || PAGE_ICONS.utility;
}

function getPageLabel(page: SitePage): string {
  if (isHomepageRow(page)) return 'Homepage';
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
    <div className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left hover:bg-gray-50/50 rounded-xl transition-colors min-h-[44px]"
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
      {open && <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100 pt-4">{children}</div>}
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Edit Section</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="h-5 w-5 sm:h-4 sm:w-4 text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
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

        <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-3 sm:py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors min-h-[44px]"
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
            className="px-5 py-3 sm:py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 min-h-[44px]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FAQ Editor ────────────────────────────────────────────────────────────────

function FaqEditor({
  page,
  onSave,
  saving,
}: {
  page: SitePage;
  onSave: (updates: Partial<SitePage>) => void;
  saving: boolean;
}) {
  const [items, setItems] = useState<FAQItem[]>(page.faq ? [...page.faq] : []);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setItems(page.faq ? [...page.faq] : []);
    setDirty(false);
  }, [page.faq]);

  const updateItem = (index: number, field: 'question' | 'answer', value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    setDirty(true);
  };

  const addItem = () => {
    setItems([...items, { question: '', answer: '' }]);
    setDirty(true);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setDirty(true);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newItems = [...items];
    const target = index + direction;
    if (target < 0 || target >= newItems.length) return;
    [newItems[index], newItems[target]] = [newItems[target], newItems[index]];
    setItems(newItems);
    setDirty(true);
  };

  const handleSave = () => {
    const cleanedItems = items.filter(item => item.question.trim() || item.answer.trim());
    onSave({ faq: cleanedItems.length > 0 ? cleanedItems : null });
    setDirty(false);
  };

  return (
    <div className="space-y-3">
      {dirty && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save FAQ
          </button>
        </div>
      )}

      {items.map((item, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Question</label>
                <input
                  type="text"
                  value={item.question}
                  onChange={(e) => updateItem(i, 'question', e.target.value)}
                  placeholder="e.g. What areas do you serve?"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Answer</label>
                <textarea
                  value={item.answer}
                  onChange={(e) => updateItem(i, 'answer', e.target.value)}
                  placeholder="Your answer..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0 pt-5">
              <button
                onClick={() => moveItem(i, -1)}
                disabled={i === 0}
                className="p-2 sm:p-1 text-gray-300 hover:text-indigo-500 disabled:opacity-30 transition-colors rounded min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
                title="Move up"
              >
                <ArrowUp className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </button>
              <button
                onClick={() => moveItem(i, 1)}
                disabled={i === items.length - 1}
                className="p-2 sm:p-1 text-gray-300 hover:text-indigo-500 disabled:opacity-30 transition-colors rounded min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
                title="Move down"
              >
                <ArrowDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </button>
              <button
                onClick={() => removeItem(i)}
                className="p-2 sm:p-1 text-gray-300 hover:text-red-500 transition-colors rounded mt-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
                title="Remove FAQ item"
              >
                <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addItem}
        className="w-full px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add FAQ Item
      </button>
    </div>
  );
}

// ── Page Settings Card ───────────────────────────────────────────────────────
//
// Edits the page's TITLE (drives the sidebar label + nav menu label + default
// for meta_title) and the URL SLUG. Both fields already exist in the
// `site_pages` table and are in the PATCH endpoint's allowlist — there just
// wasn't a UI control to edit them (customer report 2026-05-13).
//
// Slug changes carry a risk warning: existing inbound links to the old
// URL will 404. The save also normalizes the slug (lowercase, kebab-case,
// prefix `/`) and prevents collisions with the homepage slug `/`.
function PageSettingsCard({
  page,
  onSave,
  saving,
}: {
  page: SitePage;
  onSave: (updates: Partial<SitePage>) => Promise<void>;
  saving: boolean;
}) {
  const [title, setTitle] = useState(page.title || '');
  const [slug, setSlug] = useState(page.slug || '');
  // Sprint 5: schedule a draft page to auto-publish at a future moment. We
  // store ISO at the API and bind a `<input type="datetime-local">` here
  // which gives an OS-native picker without a heavyweight date-lib dep.
  const [publishAt, setPublishAt] = useState<string>(
    page.publish_at ? toLocalDateTimeInput(page.publish_at) : ''
  );
  const [dirty, setDirty] = useState(false);
  // Homepage detection via page_type (the canonical DB signal) — slug ===
  // '/' is unreliable because the DB convention is actually slug='home'
  // for the homepage row, not slug='/'. The editor's other branches check
  // slug === '/' which never matches in production; we use page_type here
  // to avoid the same trap.
  const isHome = page.page_type === 'homepage' || page.slug === 'home' || page.slug === '/';

  // Re-sync when the user switches between pages
  useEffect(() => {
    setTitle(page.title || '');
    setSlug(page.slug || '');
    setPublishAt(page.publish_at ? toLocalDateTimeInput(page.publish_at) : '');
    setDirty(false);
  }, [page.id, page.title, page.slug, page.publish_at]);

  function normalizeSlug(raw: string): string {
    // DB convention: slugs are stored WITHOUT a leading slash
    // (e.g. 'ip-pbx', not '/ip-pbx'). Homepage slug is 'home'.
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return '';
    return trimmed
      .replace(/^\/+|\/+$/g, '')
      .replace(/[^a-z0-9\-/]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function handleSave() {
    const cleanedSlug = normalizeSlug(slug);
    const updates: Partial<SitePage> = {};
    if (title.trim() && title !== page.title) updates.title = title.trim();
    if (!isHome && cleanedSlug && cleanedSlug !== page.slug) updates.slug = cleanedSlug;
    // Sprint 5: publish_at — datetime-local input → ISO UTC. Empty string
    // means "no schedule"; we send null so the DB column clears.
    const nextPublishIso = publishAt ? new Date(publishAt).toISOString() : null;
    const prevPublishIso = page.publish_at ?? null;
    if (nextPublishIso !== prevPublishIso) {
      (updates as Record<string, unknown>).publish_at = nextPublishIso;
    }
    if (Object.keys(updates).length === 0) {
      setDirty(false);
      return;
    }
    await onSave(updates);
    setDirty(false);
  }

  return (
    <CollapsibleCard
      title="Page Settings"
      icon={<Settings className="h-4 w-4" />}
      badge={dirty ? 'Unsaved' : undefined}
      defaultOpen={true}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700">
            Page title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
            placeholder="e.g. IP PBX Solutions"
            maxLength={120}
            className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
          <p className="text-[11px] text-gray-500">
            Shows in the editor sidebar, top-nav menu, and as the default browser tab text. Required.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700">
            URL slug {isHome && <span className="text-gray-400 font-normal">(homepage — fixed)</span>}
          </label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 font-mono whitespace-nowrap pl-1">yoursite.com/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setDirty(true); }}
              placeholder="ip-pbx-solutions"
              maxLength={120}
              disabled={isHome}
              className="flex-1 h-10 px-3 rounded-md border border-gray-200 bg-white text-sm font-mono disabled:bg-gray-50 disabled:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>
          <p className="text-[11px] text-gray-500">
            {isHome
              ? 'The homepage slot is reserved and its URL slug cannot be changed.'
              : 'Auto-normalized to kebab-case, no leading slash. ⚠️ Changing this will break inbound links to the old URL. Search engines may take days to reindex.'}
          </p>
        </div>

        {/* Sprint 5: Scheduled publish. Only meaningful for currently-hidden
            pages; we still show the control on live pages but explain it's
            ignored until the page is moved to Draft. */}
        <div className="space-y-1.5 pt-2 border-t border-gray-100">
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Publish at <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => { setPublishAt(e.target.value); setDirty(true); }}
              className="flex-1 h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
            {publishAt && (
              <button
                onClick={() => { setPublishAt(''); setDirty(true); }}
                className="px-2 py-1.5 text-[11px] text-gray-500 hover:text-red-500 inline-flex items-center gap-1"
                title="Clear schedule"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-500">
            {page.hidden
              ? 'This page is a draft. It will auto-publish at the chosen moment (a hourly cron flips it to live).'
              : 'This page is already live — a schedule has no effect. Move to Draft first if you want auto-publish.'}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <p className="text-[11px] text-gray-400">
            Page type: <span className="font-mono uppercase">{page.page_type || 'page'}</span>
          </p>
          <button
            onClick={handleSave}
            disabled={saving || !dirty || !title.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Page Settings'}
          </button>
        </div>
      </div>
    </CollapsibleCard>
  );
}

// ── Hero Editor ───────────────────────────────────────────────────────────────

/**
 * FormBuilderEditor — Sprint 5 (2026-05-14).
 *
 * Lets the agency define a custom field set for the page's form-embed CTA,
 * plus an optional webhook URL that the form-submit endpoint will POST raw
 * submissions to (Zapier / n8n / custom integrations).
 *
 * Empty fields[] means "use the legacy hardcoded Name/Phone/Email/Message"
 * so existing pages don't change appearance until an agency opts in.
 *
 * Submissions inbox is rendered via the SubmissionsInboxButton in the
 * page header — kept as a separate component to keep this card focused on
 * configuration vs. data review.
 */
function FormBuilderEditor({
  page,
  onSave,
  saving,
}: {
  page: SitePage;
  onSave: (updates: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [fields, setFields] = useState<FormFieldDef[]>(
    (page.cta_form_fields && page.cta_form_fields.length > 0)
      ? page.cta_form_fields
      : []
  );
  const [webhookUrl, setWebhookUrl] = useState(page.form_webhook_url || '');
  const [dirty, setDirty] = useState(false);

  const fieldTypes: { id: FormFieldDef['type']; label: string }[] = [
    { id: 'text',     label: 'Text' },
    { id: 'email',    label: 'Email' },
    { id: 'tel',      label: 'Phone' },
    { id: 'textarea', label: 'Long text' },
    { id: 'select',   label: 'Dropdown' },
    { id: 'number',   label: 'Number' },
  ];

  const addField = () => {
    const newId = `field_${Date.now().toString(36).slice(-5)}`;
    setFields([...fields, { id: newId, label: '', type: 'text', required: false }]);
    setDirty(true);
  };
  const updateField = (i: number, patch: Partial<FormFieldDef>) => {
    const next = [...fields];
    next[i] = { ...next[i], ...patch };
    setFields(next);
    setDirty(true);
  };
  const removeField = (i: number) => {
    setFields(fields.filter((_, x) => x !== i));
    setDirty(true);
  };
  const moveField = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[i], next[target]] = [next[target], next[i]];
    setFields(next);
    setDirty(true);
  };
  const useDefaults = () => {
    // Snap to a sensible default contact form.
    setFields([
      { id: 'name',    label: 'Full Name',    type: 'text',     required: true,  placeholder: 'Your full name' },
      { id: 'email',   label: 'Email',        type: 'email',    required: true,  placeholder: 'you@example.com' },
      { id: 'phone',   label: 'Phone',        type: 'tel',      required: false, placeholder: '(555) 123-4567' },
      { id: 'message', label: 'How Can We Help?', type: 'textarea', required: true, placeholder: 'Tell us about your project…' },
    ]);
    setDirty(true);
  };

  // Reserved keys: keep the projection columns (`name`/`email`/`phone`) safe
  // so the submissions inbox can sort by them. Show a hint when the agency
  // names a field something we extract into a column.
  const projectionKeys = new Set(['name', 'email', 'phone']);

  return (
    <CollapsibleCard
      title="Form Builder"
      icon={<Edit3 className="h-4 w-4" />}
      badge={fields.length > 0 ? `${fields.length} fields` : 'Using defaults'}
    >
      <div className="space-y-4">
        <p className="text-[11px] text-gray-500 leading-snug">
          Configure the contact form embedded on this page. With no fields below, the page
          uses the standard <strong>Name · Phone · Email · Message</strong> form. Add custom fields to
          replace it — submissions land in your CRM and the Submissions inbox.
        </p>

        {fields.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 mb-3">No custom fields configured. Pages use the default contact form.</p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={useDefaults}
                className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 inline-flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> Start from default
              </button>
              <button
                onClick={addField}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add empty field
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-2.5 bg-gray-50/50 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveField(i, -1)}
                      disabled={i === 0}
                      className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveField(i, 1)}
                      disabled={i === fields.length - 1}
                      className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={f.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder="Field label"
                    className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={f.type}
                    onChange={(e) => updateField(i, { type: e.target.value as FormFieldDef['type'] })}
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {fieldTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <button
                    onClick={() => removeField(i)}
                    className="p-1.5 text-gray-300 hover:text-red-500"
                    title="Remove field"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 pl-7">
                  <input
                    type="text"
                    value={f.placeholder || ''}
                    onChange={(e) => updateField(i, { placeholder: e.target.value })}
                    placeholder="Placeholder (optional)"
                    className="flex-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!f.required}
                      onChange={(e) => updateField(i, { required: e.target.checked })}
                      className="h-3.5 w-3.5"
                    />
                    Required
                  </label>
                </div>
                {/* Field key + reserved-key hint */}
                <div className="pl-7 flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="font-mono">key: {f.id}</span>
                  {projectionKeys.has(f.id) && (
                    <span className="text-indigo-500" title="This key is indexed in the submissions inbox for sorting/filtering">
                      · indexed
                    </span>
                  )}
                </div>
                {f.type === 'select' && (
                  <div className="pl-7">
                    <textarea
                      value={(f.options || []).join('\n')}
                      onChange={(e) => updateField(i, { options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                      rows={3}
                      placeholder="One option per line&#10;e.g. Residential&#10;Commercial&#10;Multi-family"
                      className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y bg-white"
                    />
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={addField}
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 inline-flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add Field
            </button>
          </div>
        )}

        {/* Webhook URL */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Webhook URL <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => { setWebhookUrl(e.target.value); setDirty(true); }}
            placeholder="https://hooks.zapier.com/..."
            className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            We&apos;ll POST each submission as JSON to this URL in addition to saving it in your CRM.
            Delivery status appears in the Submissions inbox.
          </p>
        </div>

        <button
          onClick={() => {
            // Drop blank labels — they'd render label-less inputs on the live site.
            const cleaned = fields
              .filter(f => f.label.trim())
              .map(f => ({
                ...f,
                label: f.label.trim(),
                placeholder: f.placeholder?.trim() || undefined,
                options: f.type === 'select' ? (f.options || []) : undefined,
              }));
            onSave({
              cta_form_fields: cleaned.length > 0 ? cleaned : null,
              form_webhook_url: webhookUrl.trim() || null,
            });
            setDirty(false);
          }}
          disabled={saving || !dirty}
          className="w-full px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save Form
        </button>
      </div>
    </CollapsibleCard>
  );
}

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
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="h-4 w-4 text-indigo-500" />
            Hero & SEO
          </h4>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 min-h-[44px] sm:min-h-0 px-2"
          >
            <Edit3 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
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
    <div className="bg-white rounded-xl border-2 border-indigo-200 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-indigo-500" />
          Hero &amp; SEO
        </h4>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hero Headline (H1)</label>
          <input
            type="text"
            value={heroH1}
            onChange={(e) => setHeroH1(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-3 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {/* Disambiguates from "Page title" in Page Settings. Customers
              consistently confused the two; this caption locks down the
              distinction without forcing a label rename. */}
          <p className="text-[11px] text-gray-500 mt-1">
            The big headline visible at the top of this page. Different from <strong>Page title</strong>
            above, which is the sidebar / browser tab label.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hero Subtitle</label>
          <input
            type="text"
            value={heroSubtitle}
            onChange={(e) => setHeroSubtitle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-3 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CTA Button Text</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="e.g. Get Free Estimate"
              className="w-full rounded-lg border border-gray-200 px-3 py-3 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CTA Button Link</label>
            <input
              type="text"
              value={ctaLink}
              onChange={(e) => setCtaLink(e.target.value)}
              placeholder="e.g. /contact"
              className="w-full rounded-lg border border-gray-200 px-3 py-3 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="px-4 py-3 sm:py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 min-h-[44px] sm:min-h-0"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-3 sm:py-2 text-xs font-medium text-gray-600 hover:text-gray-900 min-h-[44px] sm:min-h-0"
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
    <CollapsibleCard title="Business Details" icon={<Building2 className="h-4 w-4" />} defaultOpen={true}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Phone className="h-3 w-3" /> Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setDirty(true); }}
              placeholder="(555) 123-4567"
              className="w-full rounded-lg border border-gray-200 px-3 py-3 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full rounded-lg border border-gray-200 px-3 py-3 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <input
            type="text"
            value={city}
            onChange={(e) => { setCity(e.target.value); setDirty(true); }}
            placeholder="City"
            className="rounded-lg border border-gray-200 px-2 sm:px-3 py-3 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={state}
            onChange={(e) => { setState(e.target.value); setDirty(true); }}
            placeholder="State"
            className="rounded-lg border border-gray-200 px-2 sm:px-3 py-3 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={zip}
            onChange={(e) => { setZip(e.target.value); setDirty(true); }}
            placeholder="ZIP"
            className="rounded-lg border border-gray-200 px-2 sm:px-3 py-3 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Booking URL
            </label>
            <input
              type="url"
              value={bookingUrl}
              onChange={(e) => { setBookingUrl(e.target.value); setDirty(true); }}
              placeholder="https://calendly.com/..."
              className="w-full rounded-lg border border-gray-200 px-3 py-3 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full rounded-lg border border-gray-200 px-3 py-3 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          className="w-full px-4 py-3 sm:py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save Business Details
        </button>
      </div>
    </CollapsibleCard>
  );
}

// ── Nav Link Editor ───────────────────────────────────────────────────────────

/**
 * NavLinkEditor — the Header Builder.
 *
 * Lets agencies pick a navbar template variant, edit the flat nav link list,
 * and add dropdown menu groups (children) on any entry. Saved fields:
 *   - nav_links: NavLink[] (each item may have a `children` array for dropdowns)
 *   - navbar_variant: 'sticky-white' | 'transparent-overlay' | 'hamburger'
 *
 * Renamed conceptually from "Navigation Links" to "Header" to signal that
 * customers can also swap the navbar template here, not just edit link text.
 */
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
  const [variant, setVariant] = useState<NavbarVariant>(site.navbar_variant || 'sticky-white');
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

  // Child (dropdown) operations — children live under each parent link.
  const addChild = (i: number) => {
    const newLinks = [...links];
    const kids = newLinks[i].children || [];
    newLinks[i] = { ...newLinks[i], children: [...kids, { label: '', href: '' }] };
    setLinks(newLinks);
    setDirty(true);
  };
  const updateChild = (i: number, ci: number, field: 'label' | 'href', value: string) => {
    const newLinks = [...links];
    const kids = [...(newLinks[i].children || [])];
    kids[ci] = { ...kids[ci], [field]: value };
    newLinks[i] = { ...newLinks[i], children: kids };
    setLinks(newLinks);
    setDirty(true);
  };
  const removeChild = (i: number, ci: number) => {
    const newLinks = [...links];
    const kids = (newLinks[i].children || []).filter((_, x) => x !== ci);
    newLinks[i] = { ...newLinks[i], children: kids.length > 0 ? kids : undefined };
    setLinks(newLinks);
    setDirty(true);
  };

  const variantOptions: { id: NavbarVariant; label: string; desc: string }[] = [
    { id: 'sticky-white',        label: 'Sticky Light',      desc: 'White bar, sticks on scroll. Best for most.' },
    { id: 'transparent-overlay', label: 'Transparent',       desc: 'Overlays hero, turns solid on scroll.' },
    { id: 'hamburger',           label: 'Minimal Hamburger', desc: 'Compact icon-only menu.' },
  ];

  const totalLinks = links.length + links.reduce((n, l) => n + (l.children?.length || 0), 0);

  return (
    <CollapsibleCard title="Header & Navigation" icon={<Navigation className="h-4 w-4" />} badge={`${totalLinks} links`}>
      <div className="space-y-4">
        {/* Variant picker */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Header Style</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {variantOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { setVariant(opt.id); setDirty(true); }}
                className={`text-left p-2.5 rounded-lg border transition ${
                  variant === opt.id
                    ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300'
                    : 'border-gray-200 bg-white hover:border-indigo-200'
                }`}
              >
                <div className={`text-xs font-semibold ${variant === opt.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                  {opt.label}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Links list (with dropdown children) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Menu Items</label>
          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-2 bg-gray-50/50">
                <div className="flex items-center gap-2 group">
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
                    className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={link.href}
                    onChange={(e) => updateLink(i, 'href', e.target.value)}
                    placeholder="#section or /page"
                    className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => removeLink(i)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    title="Remove link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Dropdown children */}
                {link.children && link.children.length > 0 && (
                  <div className="mt-2 pl-7 space-y-1.5">
                    {link.children.map((c, ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <span className="text-gray-300 text-xs">↳</span>
                        <input
                          type="text"
                          value={c.label}
                          onChange={(e) => updateChild(i, ci, 'label', e.target.value)}
                          placeholder="Sub-item label"
                          className="flex-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={c.href}
                          onChange={(e) => updateChild(i, ci, 'href', e.target.value)}
                          placeholder="/page or https://..."
                          className="flex-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => removeChild(i, ci)}
                          className="p-1 text-gray-300 hover:text-red-500"
                          title="Remove sub-item"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => addChild(i)}
                  className="ml-7 mt-1.5 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                >
                  <Plus className="h-2.5 w-2.5" /> Add dropdown item
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={addLink}
            className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add Menu Item
          </button>
          <button
            onClick={() => {
              // Drop empty entries + empty children so the live nav stays clean.
              const cleaned = links
                .filter(l => l.label && l.href)
                .map(l => {
                  const kids = (l.children || []).filter(c => c.label && c.href);
                  return kids.length > 0 ? { ...l, children: kids } : { label: l.label, href: l.href };
                });
              onSave({ nav_links: cleaned, navbar_variant: variant });
              setDirty(false);
            }}
            disabled={saving || !dirty}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save Header
          </button>
        </div>
      </div>
    </CollapsibleCard>
  );
}

// ── Footer Editor ─────────────────────────────────────────────────────────────

/**
 * FooterEditor — the Footer Builder.
 *
 * Variant picker + tagline + social links + custom column editor. When the
 * agency adds any custom columns, they replace the default auto-fill from
 * `services[]` / `cities[]` in the four-column footer template. Keeping the
 * column array empty preserves the legacy behavior so existing sites don't
 * change appearance after this upgrade.
 */
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
  const [variant, setVariant] = useState<FooterVariant>(site.footer_variant || 'four-column');
  const [columns, setColumns] = useState<FooterColumn[]>(site.footer_columns || []);
  const [dirty, setDirty] = useState(false);

  const socialPlatforms: { key: keyof SocialLinks; label: string }[] = [
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'twitter', label: 'Twitter / X' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'yelp', label: 'Yelp' },
  ];

  const variantOptions: { id: FooterVariant; label: string; desc: string }[] = [
    { id: 'four-column', label: 'Four Column', desc: 'Logo · columns · contact. Best for most sites.' },
    { id: 'map-contact', label: 'Map + Contact', desc: 'Embedded map next to contact details.' },
    { id: 'minimal',     label: 'Minimal',      desc: 'Single-row brand + copyright.' },
  ];

  // Column ops
  const addColumn = () => {
    setColumns([...columns, { title: '', links: [{ label: '', href: '' }] }]);
    setDirty(true);
  };
  const removeColumn = (i: number) => {
    setColumns(columns.filter((_, x) => x !== i));
    setDirty(true);
  };
  const updateColumnTitle = (i: number, title: string) => {
    const next = [...columns];
    next[i] = { ...next[i], title };
    setColumns(next);
    setDirty(true);
  };
  const addColumnLink = (i: number) => {
    const next = [...columns];
    next[i] = { ...next[i], links: [...next[i].links, { label: '', href: '' }] };
    setColumns(next);
    setDirty(true);
  };
  const updateColumnLink = (i: number, li: number, field: 'label' | 'href', value: string) => {
    const next = [...columns];
    const links = [...next[i].links];
    links[li] = { ...links[li], [field]: value };
    next[i] = { ...next[i], links };
    setColumns(next);
    setDirty(true);
  };
  const removeColumnLink = (i: number, li: number) => {
    const next = [...columns];
    next[i] = { ...next[i], links: next[i].links.filter((_, x) => x !== li) };
    setColumns(next);
    setDirty(true);
  };

  return (
    <CollapsibleCard title="Footer" icon={<FileText className="h-4 w-4" />}>
      <div className="space-y-4">
        {/* Variant picker */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Footer Style</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {variantOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { setVariant(opt.id); setDirty(true); }}
                className={`text-left p-2.5 rounded-lg border transition ${
                  variant === opt.id
                    ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300'
                    : 'border-gray-200 bg-white hover:border-indigo-200'
                }`}
              >
                <div className={`text-xs font-semibold ${variant === opt.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                  {opt.label}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tagline */}
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

        {/* Custom columns — only meaningful on four-column variant */}
        {variant === 'four-column' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-600">
                Custom Columns
                <span className="ml-1 font-normal text-gray-400">
                  ({columns.length > 0 ? `${columns.length} custom` : 'using auto-fill'})
                </span>
              </label>
              <button
                onClick={addColumn}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add Column
              </button>
            </div>
            {columns.length === 0 ? (
              <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Leave empty to auto-generate columns from your Services and Cities. Add columns
                here to replace them with custom link groups (e.g. &ldquo;Solutions&rdquo;,
                &ldquo;Company&rdquo;, &ldquo;Legal&rdquo;).
              </p>
            ) : (
              <div className="space-y-3">
                {columns.map((col, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={col.title}
                        onChange={(e) => updateColumnTitle(i, e.target.value)}
                        placeholder="Column title (e.g. Solutions)"
                        className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => removeColumn(i)}
                        className="p-1.5 text-gray-300 hover:text-red-500"
                        title="Remove column"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {col.links.map((l, li) => (
                        <div key={li} className="flex items-center gap-2">
                          <span className="text-gray-300 text-xs">•</span>
                          <input
                            type="text"
                            value={l.label}
                            onChange={(e) => updateColumnLink(i, li, 'label', e.target.value)}
                            placeholder="Link label"
                            className="flex-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <input
                            type="text"
                            value={l.href}
                            onChange={(e) => updateColumnLink(i, li, 'href', e.target.value)}
                            placeholder="/page or https://..."
                            className="flex-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => removeColumnLink(i, li)}
                            className="p-1 text-gray-300 hover:text-red-500"
                            title="Remove link"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => addColumnLink(i)}
                      className="mt-2 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                    >
                      <Plus className="h-2.5 w-2.5" /> Add Link
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Social links */}
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
            // Drop blank rows so we don't ship empty list items to the live footer.
            const cleanedColumns = columns
              .filter(c => c.title.trim())
              .map(c => ({
                title: c.title.trim(),
                links: c.links.filter(l => l.label.trim() && l.href.trim()),
              }))
              .filter(c => c.links.length > 0);

            onSave({
              footer_tagline: footerTagline || null,
              footer_variant: variant,
              footer_columns: cleanedColumns.length > 0 ? cleanedColumns : null,
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

/**
 * CustomCodeEditor — raw HTML/JS injection slots for analytics, pixels, chat
 * widgets, custom CSS. Two textareas:
 *   - Head Code: injected just before </head> (GA4, GTM, Plausible, Meta Pixel)
 *   - Body Code: injected just before </body> (chat widgets, late-loading scripts)
 *
 * We deliberately do NOT sanitize — these are agency-defined snippets and
 * sanitization would break legitimate analytics. The card includes a strong
 * warning so customers understand they're shipping raw code.
 *
 * Sprint 3 (2026-05-14).
 */
function CustomCodeEditor({
  site,
  onSave,
  saving,
}: {
  site: SiteData;
  onSave: (updates: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [headCode, setHeadCode] = useState(site.head_code || '');
  const [bodyCode, setBodyCode] = useState(site.body_code || '');
  const [dirty, setDirty] = useState(false);

  const SIZE_LIMIT = 16 * 1024; // 16KB per snippet — generous but bounds DB row growth.

  return (
    <CollapsibleCard title="Custom Code" icon={<Edit3 className="h-4 w-4" />} badge="Advanced">
      <div className="space-y-4">
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug">
          <strong>Heads up:</strong> Code here is injected into every page exactly as
          written. Use it for analytics (GA4, GTM, Meta Pixel), chat widgets, or custom
          CSS. Malformed code can break your site — test after publishing.
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-600">
              Head Code <span className="font-normal text-gray-400">— before <code className="text-[10px] bg-gray-100 px-1 rounded">&lt;/head&gt;</code></span>
            </label>
            <span className={`text-[10px] ${headCode.length > SIZE_LIMIT ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
              {headCode.length.toLocaleString()} / {SIZE_LIMIT.toLocaleString()}
            </span>
          </div>
          <textarea
            value={headCode}
            onChange={(e) => { setHeadCode(e.target.value); setDirty(true); }}
            rows={6}
            spellCheck={false}
            placeholder={`<!-- Google Analytics 4 -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-XXXXXXX');\n</script>`}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-mono leading-snug focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y bg-gray-50"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Best for: page-load analytics, pixels, meta tags, custom CSS, third-party SDK init.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-gray-600">
              Body Code <span className="font-normal text-gray-400">— before <code className="text-[10px] bg-gray-100 px-1 rounded">&lt;/body&gt;</code></span>
            </label>
            <span className={`text-[10px] ${bodyCode.length > SIZE_LIMIT ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
              {bodyCode.length.toLocaleString()} / {SIZE_LIMIT.toLocaleString()}
            </span>
          </div>
          <textarea
            value={bodyCode}
            onChange={(e) => { setBodyCode(e.target.value); setDirty(true); }}
            rows={6}
            spellCheck={false}
            placeholder={`<!-- Intercom / Drift / Crisp -->\n<script>\n  // your chat widget snippet\n</script>`}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-mono leading-snug focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y bg-gray-50"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Best for: chat widgets, conversion tracking that should fire after page render.
          </p>
        </div>

        <button
          onClick={() => {
            if (headCode.length > SIZE_LIMIT || bodyCode.length > SIZE_LIMIT) return;
            onSave({
              head_code: headCode.trim() || null,
              body_code: bodyCode.trim() || null,
            });
            setDirty(false);
          }}
          disabled={saving || !dirty || headCode.length > SIZE_LIMIT || bodyCode.length > SIZE_LIMIT}
          className="w-full px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save Custom Code
        </button>
      </div>
    </CollapsibleCard>
  );
}

/**
 * ImageGallery — the Media Library card. Sprint 3 upgrade (2026-05-14):
 *
 *   - Multi-file upload (pick many at once)
 *   - Per-photo "Edit details" modal for alt text + placement label
 *   - Inline search filter across alt + placement
 *   - "Copy URL" action per photo (use inside Custom Code / hero links)
 *   - Photo count + filtered-count badge
 *
 * Metadata updates go via PATCH /sites/[id] sending the full mutated photos
 * array (photos is already in the allowlist). The /photos POST + DELETE
 * endpoints handle binary uploads / deletes; PATCH handles metadata-only.
 */
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
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [filter, setFilter] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    // Serialize uploads — Supabase Storage doesn't love many parallel
    // multipart bodies and our row-update happens per upload anyway.
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('alt', file.name.replace(/\.[^.]+$/, ''));
        await fetch(`/api/agency/sites/${siteId}/photos`, { method: 'POST', body: fd });
      } catch (err) {
        console.error('[media-library] upload failed', err);
      }
      setUploadProgress({ done: i + 1, total: files.length });
    }
    setUploading(false);
    setUploadProgress(null);
    onPhotosChanged();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (url: string) => {
    if (!window.confirm('Delete this photo? Pages that reference it will show a broken image until re-edited.')) return;
    setDeleting(url);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (res.ok) onPhotosChanged();
    } catch (err) {
      console.error('[media-library] delete failed', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveMeta = async (index: number, alt: string, placement: string) => {
    setSavingMeta(true);
    try {
      const next = photos.map((p, i) => (i === index ? { ...p, alt, placement } : p));
      const res = await fetch(`/api/agency/sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: next }),
      });
      if (res.ok) {
        onPhotosChanged();
        setEditingIndex(null);
      }
    } catch (err) {
      console.error('[media-library] save meta failed', err);
    } finally {
      setSavingMeta(false);
    }
  };

  const onCopyUrl = (url: string) => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiedUrl(url);
        setTimeout(() => setCopiedUrl((v) => (v === url ? null : v)), 1500);
      })
      .catch(() => {});
  };

  // Filter — case-insensitive substring match against alt + placement.
  const filterLower = filter.trim().toLowerCase();
  const filtered = filterLower
    ? photos
        .map((p, i) => ({ p, i }))
        .filter(({ p }) =>
          (p.alt || '').toLowerCase().includes(filterLower) ||
          (p.placement || '').toLowerCase().includes(filterLower),
        )
    : photos.map((p, i) => ({ p, i }));

  return (
    <>
      <CollapsibleCard
        title="Media Library"
        icon={<ImageIcon className="h-4 w-4" />}
        badge={filterLower ? `${filtered.length} / ${photos.length}` : `${photos.length} photos`}
      >
        <div className="space-y-3">
          {photos.length > 3 && (
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by alt text or placement…"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {photos.length > 0 && filtered.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-4">No photos match &ldquo;{filter}&rdquo;.</p>
          )}

          {filtered.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map(({ p: photo, i }) => (
                <div key={i} className="group rounded-lg border border-gray-200 overflow-hidden bg-white">
                  <div className="relative aspect-video bg-gray-100">
                    <img src={photo.url} alt={photo.alt || ''} className="w-full h-full object-cover" />
                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setEditingIndex(i)}
                        className="p-1.5 bg-white/95 text-gray-700 rounded-md hover:bg-white"
                        title="Edit details"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onCopyUrl(photo.url)}
                        className="p-1.5 bg-white/95 text-gray-700 rounded-md hover:bg-white"
                        title="Copy URL"
                      >
                        {copiedUrl === photo.url ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(photo.url)}
                        disabled={deleting === photo.url}
                        className="p-1.5 bg-white/95 text-red-600 rounded-md hover:bg-white"
                        title="Delete"
                      >
                        {deleting === photo.url ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  {/* Metadata strip */}
                  <div className="px-2 py-1.5">
                    <p className="text-[11px] text-gray-700 truncate font-medium" title={photo.alt || '(no alt)'}>
                      {photo.alt || <span className="text-gray-400 italic">no alt text</span>}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{photo.placement || 'unplaced'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
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
                {uploadProgress
                  ? `Uploading ${uploadProgress.done} / ${uploadProgress.total}…`
                  : 'Uploading…'}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload Photos (multiple OK)
              </>
            )}
          </button>
        </div>
      </CollapsibleCard>

      {/* Per-photo metadata modal — outside the card so the backdrop covers
          the whole viewport regardless of card scroll state. */}
      {editingIndex !== null && photos[editingIndex] && (
        <PhotoMetaModal
          photo={photos[editingIndex]}
          saving={savingMeta}
          onSave={(alt, placement) => handleSaveMeta(editingIndex, alt, placement)}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </>
  );
}

/**
 * PhotoMetaModal — edit alt text + placement label for a single photo.
 * Placement is used by AI page generation as a hint for where to put the
 * image; kept free-form rather than enumerated so customers can label
 * however they want.
 */
function PhotoMetaModal({
  photo,
  saving,
  onSave,
  onClose,
}: {
  photo: SitePhoto;
  saving: boolean;
  onSave: (alt: string, placement: string) => void;
  onClose: () => void;
}) {
  const [alt, setAlt] = useState(photo.alt || '');
  const [placement, setPlacement] = useState(photo.placement || '');

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Edit photo details</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
          <img src={photo.url} alt={photo.alt || ''} className="w-full h-full object-cover" />
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Alt text</label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              maxLength={120}
              placeholder="e.g. Team photo at our Boston office"
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Used by screen readers and search engines. Describe what&apos;s shown.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Placement label</label>
            <input
              type="text"
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
              maxLength={60}
              placeholder="e.g. hero, about, team, gallery"
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-gray-400 mt-1">Hint for where this image should appear on the live site.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => onSave(alt.trim(), placement.trim())}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section Icon Map ──────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ReactNode> = {
  hero: <Sparkles className="h-4 w-4" />,
  services: <Briefcase className="h-4 w-4" />,
  about: <FileText className="h-4 w-4" />,
  testimonials: <Star className="h-4 w-4" />,
  cta: <MousePointerClick className="h-4 w-4" />,
  faq: <HelpCircle className="h-4 w-4" />,
  footer: <FileText className="h-4 w-4" />,
  navbar: <Navigation className="h-4 w-4" />,
};

/**
 * PageHistoryModal — Sprint 4 (2026-05-14).
 *
 * Lists the last 30 revisions for a page (snapshot-on-save table) and lets
 * the customer one-click restore any of them. Right pane previews the
 * selected revision's hero + section count so they don't restore blind.
 *
 * The restore endpoint snapshots the CURRENT state before writing the chosen
 * revision back, so every restore is itself reversible — there's no "point
 * of no return" in this flow.
 */
/**
 * NewPageFromTemplateModal — Sprint 6 (2026-05-14).
 *
 * Two-step picker: choose a template, fill title + slug, hit Create.
 * Server hydrates content from /lib/sites/page-templates and inserts a
 * Draft page so the agency can edit placeholders before publishing.
 */
function NewPageFromTemplateModal({
  siteId,
  onClose,
  onCreated,
}: {
  siteId: string;
  onClose: () => void;
  onCreated: (page: SitePage) => void | Promise<void>;
}) {
  type Tpl = { id: string; label: string; description: string; icon: string; pageType: string };
  const [catalog, setCatalog] = useState<Tpl[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selected, setSelected] = useState<Tpl | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/agency/sites/${siteId}/pages/from-template`, { cache: 'no-store' });
        const result = await res.json();
        if (!cancelled && res.ok) {
          setCatalog(result.data || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => { cancelled = true; };
  }, [siteId]);

  // Auto-suggest a slug from the title — kebab-case the title, agency
  // can override before submit.
  useEffect(() => {
    if (!title || slug) return;
    const auto = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(auto);
  }, [title, slug]);

  const onSubmit = async () => {
    if (!selected || !title.trim() || !slug.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}/pages/from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: selected.id, title: title.trim(), slug: slug.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Failed to create page');
      } else {
        await onCreated(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset title/slug when a different template is picked so the customer
  // doesn't carry over half-typed values from the previous selection.
  const pickTemplate = (t: Tpl) => {
    setSelected(t);
    setTitle('');
    setSlug('');
    setError(null);
  };

  // Map template icon name strings to actual Lucide components. Tightly
  // scoped to the icons referenced in PAGE_TEMPLATES.
  const iconFor = (name: string) => {
    const map: Record<string, React.ReactNode> = {
      FileText: <FileText className="h-4 w-4" />,
      Star: <Star className="h-4 w-4" />,
      Briefcase: <Briefcase className="h-4 w-4" />,
      Phone: <Phone className="h-4 w-4" />,
      Sparkles: <Sparkles className="h-4 w-4" />,
    };
    return map[name] || <FileText className="h-4 w-4" />;
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">New page from template</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Pick a starter to skip the blank-page setup. Pages are created as Drafts.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingCatalog ? (
            <div className="flex items-center justify-center text-xs text-gray-500 py-8">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading templates…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {catalog.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t)}
                  className={`text-left p-3 rounded-lg border transition ${
                    selected?.id === t.id
                      ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300'
                      : 'border-gray-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={selected?.id === t.id ? 'text-indigo-600' : 'text-gray-500'}>
                      {iconFor(t.icon)}
                    </span>
                    <span className={`text-sm font-semibold ${selected?.id === t.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {t.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">{t.description}</p>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Page title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`e.g. ${selected.label}`}
                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL slug</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 font-mono whitespace-nowrap pl-1">yoursite.com/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder={selected.id}
                    className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Auto-normalized to kebab-case. The new page starts as a Draft.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!selected || !title.trim() || !slug.trim() || submitting}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Create Page
          </button>
        </div>
      </div>
    </div>
  );
}

function PageHistoryModal({
  siteId,
  page,
  onClose,
  onRestored,
}: {
  siteId: string;
  page: SitePage;
  onClose: () => void;
  onRestored: () => void;
}) {
  type Revision = {
    id: string;
    snapshot: Record<string, unknown>;
    note: string | null;
    created_at: string;
  };
  const [loading, setLoading] = useState(true);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selected, setSelected] = useState<Revision | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const encoded = encodeURIComponent(page.slug);
        const res = await fetch(`/api/agency/sites/${siteId}/pages/${encoded}/revisions`, { cache: 'no-store' });
        const result = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(result.error || 'Failed to load history');
        } else {
          const list: Revision[] = result.data || [];
          setRevisions(list);
          setSelected(list[0] || null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [siteId, page.slug]);

  const onRestore = async () => {
    if (!selected) return;
    if (!window.confirm('Restore this revision? Your current edits will be saved as a new revision first, so this is reversible.')) return;
    setRestoring(true);
    setError(null);
    try {
      const encoded = encodeURIComponent(page.slug);
      const res = await fetch(
        `/api/agency/sites/${siteId}/pages/${encoded}/revisions/${selected.id}/restore`,
        { method: 'POST' },
      );
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Restore failed');
      } else {
        onRestored();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setRestoring(false);
    }
  };

  // Snapshot helpers — best-effort projections for the preview pane.
  const snapHero = (r: Revision | null): string =>
    String((r?.snapshot.hero_h1 as string) || '(no headline)');
  const snapSubtitle = (r: Revision | null): string =>
    String((r?.snapshot.hero_subtitle as string) || '');
  const snapSectionCount = (r: Revision | null): number => {
    const cs = r?.snapshot.content_sections;
    return Array.isArray(cs) ? cs.length : 0;
  };
  const snapFaqCount = (r: Revision | null): number => {
    const f = r?.snapshot.faq;
    return Array.isArray(f) ? f.length : 0;
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Revision history</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">{page.title || page.slug}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading history…
          </div>
        )}

        {!loading && revisions.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 text-center">
            <Clock className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-600">No revisions yet.</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Saved edits create restore points automatically. Edit anything on this page to start building history.
            </p>
          </div>
        )}

        {!loading && revisions.length > 0 && (
          <div className="flex-1 flex min-h-0">
            {/* Left: revision list */}
            <div className="w-1/2 border-r border-gray-100 overflow-y-auto">
              {revisions.map((rev) => {
                const isSelected = selected?.id === rev.id;
                return (
                  <button
                    key={rev.id}
                    onClick={() => setSelected(rev)}
                    className={`w-full text-left px-4 py-2.5 border-b border-gray-50 transition-colors ${
                      isSelected ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>
                        {formatRelativeTime(rev.created_at)}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                        {new Date(rev.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                      {rev.note || (rev.snapshot.hero_h1 ? `H1: ${rev.snapshot.hero_h1}` : 'Untitled edit')}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: preview */}
            <div className="w-1/2 overflow-y-auto p-4">
              {selected && (
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Headline</div>
                    <div className="text-gray-900 font-medium">{snapHero(selected)}</div>
                  </div>
                  {snapSubtitle(selected) && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Subtitle</div>
                      <div className="text-gray-700">{snapSubtitle(selected)}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-gray-100 px-2.5 py-1.5">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">Sections</div>
                      <div className="text-sm font-semibold text-gray-800">{snapSectionCount(selected)}</div>
                    </div>
                    <div className="rounded-md border border-gray-100 px-2.5 py-1.5">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">FAQ items</div>
                      <div className="text-sm font-semibold text-gray-800">{snapFaqCount(selected)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Meta title</div>
                    <div className="text-gray-700 truncate">{String(selected.snapshot.meta_title || '—')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="px-5 py-2 text-[11px] text-red-700 bg-red-50 border-t border-red-200">{error}</div>
        )}

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 shrink-0">
          <p className="text-[10px] text-gray-400">
            Restores are reversible — your current state is snapshotted first.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onRestore}
              disabled={!selected || restoring}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {restoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Restore this revision
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section Manager ───────────────────────────────────────────────────────────

/**
 * LogoUploader — single-file upload to `/api/agency/sites/[id]/logo` that
 * sets `client_sites.logo_url`. Shows live preview, replace/remove actions.
 * SVG accepted (logos commonly need vector fidelity) — see endpoint comment.
 *
 * Sprint 3 (2026-05-14).
 */
function LogoUploader({
  siteId,
  logoUrl,
  onChanged,
}: {
  siteId: string;
  logoUrl: string | null;
  onChanged: () => Promise<void> | void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/agency/sites/${siteId}/logo`, { method: 'POST', body: fd });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Upload failed');
      } else {
        await onChanged();
      }
    } catch (err) {
      console.error('[logo-upload]', err);
      setError('Network error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onRemove = async () => {
    if (!window.confirm('Remove the site logo?')) return;
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}/logo`, { method: 'DELETE' });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        setError(result.error || 'Remove failed');
      } else {
        await onChanged();
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <CollapsibleCard title="Logo" icon={<ImageIcon className="h-4 w-4" />}>
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl
              ? <img src={logoUrl} alt="Site logo" className="max-h-full max-w-full object-contain" />
              : <ImageIcon className="h-6 w-6 text-gray-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-600 mb-2">
              {logoUrl
                ? 'Used in the header (and footer where supported). PNG/SVG with transparent background renders best.'
                : 'Add a logo to replace the auto-generated brand wordmark in the header.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onPick}
                disabled={uploading}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {uploading
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Upload className="h-3 w-3" />}
                {logoUrl ? 'Replace' : 'Upload Logo'}
              </button>
              {logoUrl && (
                <button
                  onClick={onRemove}
                  disabled={uploading}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onFile} />
        {error && (
          <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
            {error}
          </div>
        )}
        <p className="text-[10px] text-gray-400">
          Max 4MB · PNG, JPEG, WebP, or SVG · changes apply on next publish.
        </p>
      </div>
    </CollapsibleCard>
  );
}

/**
 * ThemeEditor — colors, design style, font family, and corner radius in one
 * card. Replaces fragmented controls that previously lived only in the
 * wizard. Saves to client_sites and is picked up by `getDesignCSS()` at
 * build time as CSS custom properties (--color-primary, --font-sans,
 * --radius-base).
 *
 * Sprint 2 of the website builder overhaul (2026-05-14).
 */
function ThemeEditor({
  site,
  onSave,
  saving,
}: {
  site: SiteData;
  onSave: (updates: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [colorPrimary, setColorPrimary] = useState(site.color_primary || '#4f46e5');
  const [colorSecondary, setColorSecondary] = useState(site.color_secondary || '#111827');
  const [designStyle, setDesignStyle] = useState(site.design_style || 'clean-light');
  const [fontFamily, setFontFamily] = useState(site.font_family || 'inter');
  const [borderRadius, setBorderRadius] = useState(site.border_radius || 'default');
  const [dirty, setDirty] = useState(false);

  const designStyles: { id: 'modern-dark' | 'clean-light' | 'bold' | 'minimal'; label: string; desc: string }[] = [
    { id: 'clean-light', label: 'Clean Light',  desc: 'White, professional, easy-read.' },
    { id: 'modern-dark', label: 'Modern Dark',  desc: 'Dark slate, glow accents.' },
    { id: 'bold',        label: 'Bold',         desc: 'High-contrast, thick borders.' },
    { id: 'minimal',     label: 'Minimal',      desc: 'Whitespace-heavy, refined.' },
  ];

  const fontOptions: { id: string; label: string; preview: string }[] = [
    { id: 'inter',    label: 'Inter',        preview: 'Aa · Modern neutral' },
    { id: 'system',   label: 'System UI',    preview: 'Aa · Native feel' },
    { id: 'serif',    label: 'Serif',        preview: 'Aa · Editorial' },
    { id: 'rounded',  label: 'Rounded',      preview: 'Aa · Friendly' },
    { id: 'mono',     label: 'Monospace',    preview: 'Aa · Technical' },
    { id: 'humanist', label: 'Humanist',     preview: 'Aa · Avenir-style' },
  ];

  const radiusOptions: { id: string; label: string; px: string }[] = [
    { id: 'sharp',   label: 'Sharp',   px: '0' },
    { id: 'subtle',  label: 'Subtle',  px: '4' },
    { id: 'default', label: 'Default', px: '8' },
    { id: 'rounded', label: 'Rounded', px: '12' },
    { id: 'pill',    label: 'Pill',    px: '999' },
  ];

  return (
    <CollapsibleCard title="Theme" icon={<Palette className="h-4 w-4" />}>
      <div className="space-y-5">
        {/* Colors */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Brand Colors</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="color"
                value={colorPrimary}
                onChange={(e) => { setColorPrimary(e.target.value); setDirty(true); }}
                className="h-9 w-12 rounded-md border border-gray-200 cursor-pointer"
              />
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">Primary</div>
                <div className="text-xs font-mono text-gray-700">{colorPrimary}</div>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="color"
                value={colorSecondary}
                onChange={(e) => { setColorSecondary(e.target.value); setDirty(true); }}
                className="h-9 w-12 rounded-md border border-gray-200 cursor-pointer"
              />
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">Secondary</div>
                <div className="text-xs font-mono text-gray-700">{colorSecondary}</div>
              </div>
            </label>
          </div>
        </div>

        {/* Design style */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Design Style</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {designStyles.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setDesignStyle(s.id); setDirty(true); }}
                className={`text-left p-2.5 rounded-lg border transition ${
                  designStyle === s.id
                    ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300'
                    : 'border-gray-200 bg-white hover:border-indigo-200'
                }`}
              >
                <div className={`text-xs font-semibold ${designStyle === s.id ? 'text-indigo-900' : 'text-gray-900'}`}>{s.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Font family */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Font Family</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {fontOptions.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setFontFamily(f.id); setDirty(true); }}
                className={`text-left p-2.5 rounded-lg border transition ${
                  fontFamily === f.id
                    ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300'
                    : 'border-gray-200 bg-white hover:border-indigo-200'
                }`}
              >
                <div className={`text-xs font-semibold ${fontFamily === f.id ? 'text-indigo-900' : 'text-gray-900'}`}>{f.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{f.preview}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Corner radius */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Corner Radius</label>
          <div className="flex flex-wrap gap-2">
            {radiusOptions.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setBorderRadius(r.id); setDirty(true); }}
                className={`flex items-center gap-2 px-3 py-1.5 border transition ${
                  borderRadius === r.id
                    ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300'
                    : 'border-gray-200 bg-white hover:border-indigo-200'
                }`}
                style={{ borderRadius: r.id === 'pill' ? '999px' : `${r.px}px` }}
              >
                <span
                  className="h-4 w-4 bg-indigo-500"
                  style={{ borderRadius: r.id === 'pill' ? '999px' : `${r.px}px` }}
                />
                <span className={`text-xs font-medium ${borderRadius === r.id ? 'text-indigo-900' : 'text-gray-900'}`}>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            onSave({
              color_primary: colorPrimary,
              color_secondary: colorSecondary,
              design_style: designStyle,
              font_family: fontFamily,
              border_radius: borderRadius,
            });
            setDirty(false);
          }}
          disabled={saving || !dirty}
          className="w-full px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          Save Theme
        </button>

        <p className="text-[10px] text-gray-400 leading-snug">
          Changes apply to the live site the next time you click <strong>Publish to Live</strong>.
          Colors and fonts flow through CSS custom properties, so all template variants pick them
          up automatically.
        </p>
      </div>
    </CollapsibleCard>
  );
}

function SectionManager({
  site,
  onSave,
  saving,
}: {
  site: SiteData;
  onSave: (updates: Record<string, unknown>) => void;
  saving: boolean;
}) {
  // Get current recipe-based variants from the industry
  const recipeDefaults = getRecipeDefaults(site.industry);

  // Section order state — use saved order or default
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    site.section_order && site.section_order.length > 0
      ? site.section_order
      : [...DEFAULT_SECTION_ORDER]
  );

  // Section variant overrides
  const [overrides, setOverrides] = useState<Record<string, string>>(
    site.section_overrides || {}
  );

  // Track which section has its variant picker open
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Track if user made changes
  const [dirty, setDirty] = useState(false);

  // Section picker state
  const [showSectionPicker, setShowSectionPicker] = useState(false);

  // Drag-and-drop state (Sprint 2). Native HTML5 DnD keeps this dependency-
  // free; index-based tracking is sufficient since sectionOrder is a stable
  // array of unique section-type strings. dragOverIndex drives the insertion
  // indicator so the customer sees where the dropped item will land.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const onDragStart = (index: number) => (e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox to fire dragstart at all.
    e.dataTransfer.setData('text/plain', String(index));
  };
  const onDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) setDragOverIndex(index);
  };
  const onDragLeave = () => setDragOverIndex(null);
  const onDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex;
    setDragIndex(null);
    setDragOverIndex(null);
    if (from === null || from === index) return;
    const next = [...sectionOrder];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    setSectionOrder(next);
    setDirty(true);
  };
  const onDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const getEffectiveVariant = (sectionType: string): string => {
    return overrides[sectionType] || recipeDefaults[sectionType] || '';
  };

  const removeSection = (index: number) => {
    const newOrder = sectionOrder.filter((_, i) => i !== index);
    setSectionOrder(newOrder);
    setDirty(true);
  };

  const addSection = (sectionType: string) => {
    setSectionOrder([...sectionOrder, sectionType]);
    setShowSectionPicker(false);
    setDirty(true);
  };

  // Sections available to add (not already in the order)
  const availableSections = Object.entries(SECTION_VARIANTS)
    .filter(([key]) => REORDERABLE_SECTIONS.includes(key as (typeof REORDERABLE_SECTIONS)[number]))
    .filter(([key]) => !sectionOrder.includes(key));

  const moveSection = (index: number, direction: -1 | 1) => {
    const newOrder = [...sectionOrder];
    const target = index + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    setSectionOrder(newOrder);
    setDirty(true);
  };

  const changeVariant = (sectionType: string, variant: string) => {
    const newOverrides = { ...overrides };
    // If it's the same as recipe default, remove the override
    if (variant === recipeDefaults[sectionType]) {
      delete newOverrides[sectionType];
    } else {
      newOverrides[sectionType] = variant;
    }
    setOverrides(newOverrides);
    setDirty(true);
  };

  const handleSave = () => {
    // Only save order if it differs from default
    const isDefaultOrder = JSON.stringify(sectionOrder) === JSON.stringify([...DEFAULT_SECTION_ORDER]);
    const hasOverrides = Object.keys(overrides).length > 0;

    onSave({
      section_order: isDefaultOrder ? null : sectionOrder,
      section_overrides: hasOverrides ? overrides : null,
    });
    setDirty(false);
  };

  const resetToDefaults = () => {
    setSectionOrder([...DEFAULT_SECTION_ORDER]);
    setOverrides({});
    setDirty(true);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-gray-900">Sections</span>
          <span className="text-[10px] font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            {sectionOrder.length} sections
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={resetToDefaults}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save Layout
          </button>
        </div>
      </div>

      {/* Section List */}
      <div className="divide-y divide-gray-50">
        {sectionOrder.map((sectionType, index) => {
          const sectionInfo = SECTION_VARIANTS[sectionType];
          if (!sectionInfo) return null;

          const currentVariant = getEffectiveVariant(sectionType);
          const isOverridden = sectionType in overrides;
          const isExpanded = expandedSection === sectionType;

          const isDragging = dragIndex === index;
          const isDragOver = dragOverIndex === index && dragIndex !== null && dragIndex !== index;

          return (
            <div
              key={sectionType}
              className="group"
              draggable
              onDragStart={onDragStart(index)}
              onDragOver={onDragOver(index)}
              onDragLeave={onDragLeave}
              onDrop={onDrop(index)}
              onDragEnd={onDragEnd}
            >
              {/* Drop indicator — thin indigo line above the hover target so
                  the customer sees exactly where the dragged section lands.
                  Only renders when something is being dragged over a *different*
                  row, never on the source row itself. */}
              {isDragOver && (
                <div className="h-0.5 bg-indigo-500 mx-4 sm:mx-5" aria-hidden="true" />
              )}
              {/* Section row */}
              <div
                className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 transition-colors ${
                  isDragging ? 'opacity-40 bg-indigo-50' : 'hover:bg-gray-50/50'
                }`}
              >
                {/* Drag handle — visible affordance for the DnD. The whole row
                    is draggable so customers can grab anywhere, but the handle
                    is the clearest signal of "this can be reordered". */}
                <span
                  className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0 -ml-1"
                  title="Drag to reorder"
                  aria-hidden="true"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                {/* Icon */}
                <span className="text-indigo-400 shrink-0">
                  {SECTION_ICONS[sectionType] || <Layers className="h-4 w-4" />}
                </span>

                {/* Name & variant badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {sectionInfo.label}
                    </span>
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : sectionType)}
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 sm:py-0.5 rounded-md transition-colors cursor-pointer min-h-[36px] sm:min-h-0 ${
                        isOverridden
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Palette className="h-3 w-3" />
                      {formatVariantName(currentVariant)}
                      <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Move up/down arrows + remove */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    className="p-2 sm:p-1 text-gray-300 hover:text-indigo-500 disabled:opacity-30 disabled:hover:text-gray-300 transition-colors rounded min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
                    title="Move up"
                  >
                    <ChevronUp className="h-5 w-5 sm:h-4 sm:w-4" />
                  </button>
                  <button
                    onClick={() => moveSection(index, 1)}
                    disabled={index === sectionOrder.length - 1}
                    className="p-2 sm:p-1 text-gray-300 hover:text-indigo-500 disabled:opacity-30 disabled:hover:text-gray-300 transition-colors rounded min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
                    title="Move down"
                  >
                    <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4" />
                  </button>
                  <button
                    onClick={() => removeSection(index)}
                    className="p-2 sm:p-1 text-gray-300 hover:text-red-500 transition-colors rounded ml-0.5 sm:ml-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center"
                    title="Remove section"
                  >
                    <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </button>
                </div>
              </div>

              {/* Variant picker (expanded) */}
              {isExpanded && (
                <div className="px-4 sm:px-5 pb-4 pt-1">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Choose {sectionInfo.label} Style
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sectionInfo.variants.map((variant) => {
                        const isActive = currentVariant === variant;
                        const isDefault = variant === recipeDefaults[sectionType];
                        return (
                          <button
                            key={variant}
                            onClick={() => {
                              changeVariant(sectionType, variant);
                              setExpandedSection(null);
                            }}
                            className={`flex items-center gap-2 px-3 py-3 sm:py-2.5 rounded-lg text-left transition-all text-sm min-h-[44px] ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                          >
                            <span className="font-medium text-xs">{formatVariantName(variant)}</span>
                            {isDefault && !isActive && (
                              <span className="text-[9px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-auto">
                                Default
                              </span>
                            )}
                            {isActive && (
                              <Check className="h-3.5 w-3.5 ml-auto shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Section button + picker */}
      {availableSections.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-50">
          {showSectionPicker ? (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-700">Add Section</p>
                <button
                  onClick={() => setShowSectionPicker(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {availableSections.map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => addSection(key)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
                  >
                    <span className="text-indigo-400">
                      {SECTION_ICONS[key] || <Layers className="h-4 w-4" />}
                    </span>
                    <span className="text-xs font-medium">{info.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowSectionPicker(true)}
              className="w-full px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Section
            </button>
          )}
        </div>
      )}

      {/* Navbar & Footer variants (non-reorderable but switchable) */}
      <div className="border-t border-gray-100 px-5 py-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Structural
        </p>
        {(['navbar', 'footer'] as const).map((sectionType) => {
          const sectionInfo = SECTION_VARIANTS[sectionType];
          if (!sectionInfo) return null;
          const currentVariant = getEffectiveVariant(sectionType);
          const isOverridden = sectionType in overrides;
          const isExpanded = expandedSection === sectionType;

          return (
            <div key={sectionType}>
              <div className="flex items-center gap-3 py-2">
                <span className="text-gray-400 shrink-0">
                  {SECTION_ICONS[sectionType] || <Layers className="h-4 w-4" />}
                </span>
                <span className="text-sm font-medium text-gray-700 flex-1">
                  {sectionInfo.label}
                </span>
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : sectionType)}
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    isOverridden
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Palette className="h-3 w-3" />
                  {formatVariantName(currentVariant)}
                  <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {isExpanded && (
                <div className="pb-3 pt-1 pl-7">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="grid grid-cols-2 gap-2">
                      {sectionInfo.variants.map((variant) => {
                        const isActive = currentVariant === variant;
                        const isDefault = variant === recipeDefaults[sectionType];
                        return (
                          <button
                            key={variant}
                            onClick={() => {
                              changeVariant(sectionType, variant);
                              setExpandedSection(null);
                            }}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                          >
                            <span className="font-medium text-xs">{formatVariantName(variant)}</span>
                            {isDefault && !isActive && (
                              <span className="text-[9px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-auto">
                                Default
                              </span>
                            )}
                            {isActive && (
                              <Check className="h-3.5 w-3.5 ml-auto shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Get default recipe variants for an industry (client-side helper) */
function getRecipeDefaults(industry: string): Record<string, string> {
  // These match the INDUSTRY_RECIPES structure
  // Using a simplified default since we can't import the full recipes.ts on client side
  // The variant names are the same keys used in SECTION_VARIANTS
  const defaults: Record<string, string> = {
    hero: 'gradient-overlay',
    services: 'grid-3col',
    about: 'stats-bar',
    testimonials: 'grid-cards',
    cta: 'form-embed',
    faq: 'accordion',
    footer: 'four-column',
    navbar: 'sticky-white',
  };

  // Industry-specific defaults (matching recipes.ts)
  const INDUSTRY_DEFAULTS: Record<string, Partial<Record<string, string>>> = {
    hvac: { hero: 'full-bleed', cta: 'phone-banner' },
    plumbing: { hero: 'full-bleed', services: 'icon-list', testimonials: 'carousel', cta: 'phone-banner' },
    electrical: { hero: 'full-bleed', cta: 'phone-banner' },
    dental: { hero: 'gradient-overlay', services: 'alternating', about: 'team-grid', testimonials: 'carousel', faq: 'two-column', footer: 'map-contact' },
    legal: { hero: 'centered-badge', services: 'icon-list', about: 'photo-split', testimonials: 'single-spotlight', cta: 'split-offer' },
    restaurant: { hero: 'split-screen', services: 'tabs', about: 'timeline', testimonials: 'carousel', cta: 'floating-bar', faq: 'two-column', footer: 'map-contact', navbar: 'transparent-overlay' },
    'real-estate': { hero: 'split-screen', about: 'photo-split' },
    auto: { hero: 'full-bleed', cta: 'phone-banner' },
    'med-spa': { hero: 'gradient-overlay', services: 'alternating', about: 'team-grid', testimonials: 'single-spotlight', faq: 'two-column', footer: 'minimal', navbar: 'transparent-overlay' },
    fitness: { hero: 'gradient-overlay', testimonials: 'carousel', cta: 'floating-bar', navbar: 'hamburger' },
    veterinary: { hero: 'gradient-overlay', services: 'icon-list', about: 'team-grid', testimonials: 'carousel', faq: 'two-column', footer: 'map-contact' },
    consulting: { hero: 'centered-badge', services: 'icon-list', about: 'photo-split', testimonials: 'single-spotlight', cta: 'split-offer', footer: 'minimal' },
    roofing: { hero: 'full-bleed', cta: 'phone-banner' },
    landscaping: { hero: 'split-screen', services: 'alternating', about: 'photo-split', cta: 'split-offer' },
    'lawn-care': { hero: 'split-screen', testimonials: 'carousel', cta: 'phone-banner', faq: 'two-column' },
    cleaning: { hero: 'gradient-overlay', services: 'icon-list' },
    painting: { hero: 'split-screen', services: 'alternating', about: 'photo-split', testimonials: 'carousel', cta: 'split-offer' },
    flooring: { hero: 'split-screen', services: 'alternating' },
    remodeling: { hero: 'full-bleed', services: 'alternating', about: 'timeline', cta: 'split-offer' },
    'pest-control': { hero: 'full-bleed', testimonials: 'carousel', cta: 'phone-banner' },
    locksmith: { hero: 'full-bleed', services: 'icon-list', cta: 'phone-banner', footer: 'map-contact' },
    moving: { hero: 'split-screen', testimonials: 'carousel' },
    salon: { hero: 'gradient-overlay', services: 'tabs', about: 'team-grid', testimonials: 'single-spotlight', cta: 'floating-bar', faq: 'two-column', footer: 'minimal', navbar: 'transparent-overlay' },
    medical: { hero: 'centered-badge', services: 'icon-list', about: 'team-grid', testimonials: 'single-spotlight', faq: 'two-column', footer: 'map-contact' },
    accounting: { hero: 'centered-badge', services: 'icon-list', about: 'photo-split', testimonials: 'single-spotlight', cta: 'split-offer', footer: 'minimal' },
  };

  const industryOverrides = INDUSTRY_DEFAULTS[industry] || {};
  return { ...defaults, ...industryOverrides } as Record<string, string>;
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
  const [regenerateStatus, setRegenerateStatus] = useState<'idle' | 'working' | 'success' | 'timeout'>('idle');
  const [showRegenerateInput, setShowRegenerateInput] = useState(false);
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const [rebuilding, setRebuilding] = useState(false);
  const regenerateOriginalRef = useRef<string | null>(null);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'site'>('content');
  // Sprint 4: revision history modal — opens from the page header History button.
  const [historyOpen, setHistoryOpen] = useState(false);
  // Sprint 6: live preview iframe — split-pane view alongside the edit cards.
  // previewDevice constrains the iframe width to simulate phone / tablet /
  // desktop. previewRefreshKey is bumped to bust the iframe's internal cache
  // after a save so the next render reflects the latest DB state.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  // Sprint 6: page templates picker — opens from the "Add Page" affordance
  // in the sidebar, mounted at the editor root so it overlays everything.
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editorSubTab, setEditorSubTab] = useState<'editor' | 'widget'>('editor');

  const siteUrl = site?.site_domain
    ? `https://${site.site_domain}`
    : site?.site_subdomain
      ? `https://${site.site_subdomain}`
      : null;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch site and pages
  const fetchData = useCallback(async () => {
    try {
      const [siteRes, pagesRes] = await Promise.all([
        fetch(`/api/agency/sites/${siteId}`, { cache: 'no-store' }),
        fetch(`/api/agency/sites/${siteId}/pages`, { cache: 'no-store' }),
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
            setSelectedPage(pagesResult.data.find((p: SitePage) => isHomepageRow(p)) || pagesResult.data[0]);
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
          // Match by ID (not slug) so a fresh slug after a rename still
          // updates the correct row — otherwise the sidebar shows the
          // stale row beside the freshly-renamed one until next page load.
          setPages((prev) => prev.map((p) => (p.id === result.data.id ? result.data : p)));
        }
      }
    } catch {
      // silently ignore
    }
  };

  // Refresh site data
  const refreshSite = async () => {
    try {
      const res = await fetch(`/api/agency/sites/${siteId}`, { cache: 'no-store' });
      if (res.ok) {
        const result = await res.json();
        setSite(result.data);
      }
    } catch {
      // silently ignore
    }
  };

  // Save page edits (hero, meta, hidden, title, slug)
  const savePageEdits = async (updates: Partial<SitePage>) => {
    if (!selectedPage) return;
    setSaving(true);
    try {
      // IMPORTANT: use the CURRENT slug for the URL (the row is looked up by
      // path), but if updates.slug changes the slug, the response carries
      // the new value and we refresh with that. Without this, slug renames
      // would 404 on the next refresh against the old URL.
      const oldSlug = selectedPage.slug;
      const encodedSlug = encodeURIComponent(oldSlug);
      const res = await fetch(`/api/agency/sites/${siteId}/pages/${encodedSlug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const result = await res.json().catch(() => ({}));
        const newSlug = (result?.data?.slug as string | undefined) || oldSlug;
        showToast(newSlug !== oldSlug ? `Page renamed → ${newSlug}` : 'Changes saved');
        await refreshPage(newSlug);
        // Sprint 6: bump the preview iframe so it re-fetches the assembled
        // HTML with the latest DB state. Saves are cheap; previews should
        // never feel stale.
        setPreviewRefreshKey((k) => k + 1);
        // After a slug rename, the pages array still has the old slug for
        // this row — refreshPage updates the matching row by ID, but the
        // sidebar grouping uses .slug, so also swap the slug locally.
        if (newSlug !== oldSlug) {
          setPages((prev) => prev.map((p) => (p.id === selectedPage.id ? { ...p, slug: newSlug } : p)));
        }
      } else {
        // Surface server error message (collision, homepage protection, etc.)
        const result = await res.json().catch(() => ({}));
        showToast(result?.error || 'Failed to save changes', 'error');
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
        // Sprint 6: site-level changes (theme, nav, footer) affect every
        // page's render, so bump the preview key too.
        setPreviewRefreshKey((k) => k + 1);
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

  // Move content section up/down
  const moveContentSection = async (index: number, direction: -1 | 1) => {
    if (!selectedPage?.content_sections) return;
    const newSections = [...selectedPage.content_sections];
    const target = index + direction;
    if (target < 0 || target >= newSections.length) return;
    [newSections[index], newSections[target]] = [newSections[target], newSections[index]];
    await savePageEdits({ content_sections: newSections } as Partial<SitePage>);
  };

  // Delete a content section
  const deleteContentSection = async (index: number) => {
    if (!selectedPage?.content_sections) return;
    const newSections = selectedPage.content_sections.filter((_, i) => i !== index);
    await savePageEdits({ content_sections: newSections } as Partial<SitePage>);
  };

  // Add a new blank content section
  const addContentSection = async () => {
    const existing = selectedPage?.content_sections || [];
    const newSections = [...existing, { heading: 'New Section', body: '' }];
    await savePageEdits({ content_sections: newSections } as Partial<SitePage>);
  };

  // Duplicate a page
  const duplicatePage = async (page: SitePage) => {
    setSaving(true);
    try {
      const newSlug = isHomepageRow(page)
        ? 'home-copy'
        : `${page.slug}-copy`;

      const res = await fetch(`/api/agency/sites/${siteId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${page.title} (Copy)`,
          slug: newSlug,
          page_type: page.page_type,
          hero_h1: page.hero_h1,
          hero_subtitle: page.hero_subtitle,
          hero_cta_text: page.hero_cta_text,
          hero_cta_link: page.hero_cta_link,
          meta_title: page.meta_title,
          meta_description: page.meta_description,
          content_sections: page.content_sections,
          faq: page.faq,
          source: 'duplicate',
        }),
      });

      if (res.ok) {
        showToast('Page duplicated');
        // Refresh pages list
        const pagesRes = await fetch(`/api/agency/sites/${siteId}/pages`);
        if (pagesRes.ok) {
          const pagesResult = await pagesRes.json();
          if (Array.isArray(pagesResult.data)) {
            setPages(pagesResult.data);
            // Select the new page
            const newPage = pagesResult.data.find((p: SitePage) => p.slug === newSlug);
            if (newPage) setSelectedPage(newPage);
          }
        }
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        showToast(err.error || 'Failed to duplicate page', 'error');
      }
    } catch {
      showToast('Failed to duplicate page', 'error');
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
        // Sprint 4 wording: "Hide" → "Draft", "Show" → "Publish". The
        // distinction here is one click ahead of the optimistic state, so
        // `page.hidden` reflects the pre-toggle value.
        showToast(page.hidden ? 'Page published — visible on next deploy' : 'Page moved to draft');
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
    setRegenerateStatus('working');

    // Snapshot current content for comparison
    regenerateOriginalRef.current = JSON.stringify(selectedPage.content_sections);

    try {
      const encodedSlug = encodeURIComponent(selectedPage.slug);
      const res = await fetch(`/api/agency/sites/${siteId}/pages/${encodedSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate', feedback }),
      });
      if (res.ok) {
        // Poll at 5s, 10s, 20s — check if content actually changed
        const checkRegenerated = async (slug: string) => {
          try {
            const encoded = encodeURIComponent(slug);
            const pollRes = await fetch(`/api/agency/sites/${siteId}/pages/${encoded}`);
            if (pollRes.ok) {
              const result = await pollRes.json();
              if (result.data) {
                const newContent = JSON.stringify(result.data.content_sections);
                if (newContent !== regenerateOriginalRef.current) {
                  // Content changed — success!
                  setSelectedPage(result.data);
                  setPages((prev) => prev.map((p) => (p.slug === slug ? result.data : p)));
                  setRegenerating(false);
                  setRegenerateStatus('success');
                  showToast('✓ Page regenerated successfully!');
                  setTimeout(() => setRegenerateStatus('idle'), 4000);
                  return true;
                }
              }
            }
          } catch {
            // silently ignore poll errors
          }
          return false;
        };

        // Staggered polling
        const slug = selectedPage.slug;
        setTimeout(async () => {
          if (await checkRegenerated(slug)) return;
          setTimeout(async () => {
            if (await checkRegenerated(slug)) return;
            setTimeout(async () => {
              if (await checkRegenerated(slug)) return;
              // Final timeout — content didn't change yet
              setRegenerating(false);
              setRegenerateStatus('timeout');
              showToast('Regeneration may still be processing. Refresh to check.');
              setTimeout(() => setRegenerateStatus('idle'), 6000);
            }, 10000); // 20s total
          }, 5000); // 10s total
        }, 5000); // 5s
      } else {
        showToast('Failed to regenerate page', 'error');
        setRegenerating(false);
        setRegenerateStatus('idle');
      }
    } catch {
      showToast('Failed to regenerate page', 'error');
      setRegenerating(false);
      setRegenerateStatus('idle');
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
        // Refresh site data after a delay to pick up updated last_deployed_at
        setTimeout(() => refreshSite(), 10000);
        setTimeout(() => refreshSite(), 30000);
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

      {/* Revision History Modal — Sprint 4 */}
      {historyOpen && selectedPage && (
        <PageHistoryModal
          siteId={siteId}
          page={selectedPage}
          onClose={() => setHistoryOpen(false)}
          onRestored={async () => {
            await refreshPage(selectedPage.slug);
            setToast({ type: 'success', message: 'Revision restored — remember to Publish to push it live.' });
            setHistoryOpen(false);
          }}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Menu className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {pages.length}
              </span>
            </button>
            <Link
              href={site?.client_id ? `/agency/clients/${site.client_id}` : '/agency/website'}
              className="text-gray-500 hover:text-gray-900 transition-colors hidden sm:block"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-2 truncate">
                <Globe className="h-4 w-4 text-indigo-600 shrink-0" />
                <span className="truncate">{site?.business_name || 'Site Editor'}</span>
              </h1>
              {siteUrl && (
                <p className="text-xs text-gray-400 font-mono truncate max-w-[200px] sm:max-w-none">{siteUrl}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {siteUrl && (
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] sm:min-h-0 px-2 sm:px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">View Live</span>
              </a>
            )}
            {/* Unpublished-changes pill. Lit when any save (site or page)
                has happened since the last successful deploy. Pure visual
                nudge — does not block; customers may want to keep editing. */}
            {site && hasUnpublishedChanges(site, pages) && !rebuilding && (
              <span
                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 rounded-md"
                title={`Last deploy ${formatRelativeTime(site.last_deployed_at)} · changes saved since`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unpublished
              </span>
            )}
            <DeployHistoryButton siteId={siteId} siteUrl={siteUrl} />
            <button
              onClick={rebuildSite}
              disabled={rebuilding}
              className="min-h-[44px] sm:min-h-0 px-2 sm:px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {rebuilding ? <Loader2 className="h-3.5 w-3.5 sm:h-3 sm:w-3 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
              <span className="hidden sm:inline">{rebuilding ? 'Deploying…' : 'Publish to Live'}</span>
            </button>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex border-t border-gray-100 px-2 sm:px-4 overflow-x-auto">
          <button
            onClick={() => setEditorSubTab('editor')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex-1 sm:flex-none justify-center sm:justify-start ${
              editorSubTab === 'editor' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            Editor
          </button>
          <Link
            href={`/agency/website/${siteId}/settings`}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap flex-1 sm:flex-none justify-center sm:justify-start"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
          {site?.client_id && (
            <button
              onClick={() => setEditorSubTab('widget')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex-1 sm:flex-none justify-center sm:justify-start ${
                editorSubTab === 'widget' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat Widget
            </button>
          )}
        </div>
      </div>

      {/* Chat Widget sub-tab */}
      {editorSubTab === 'widget' && site?.client_id && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <WidgetBuilderEmbedded clientId={site.client_id} />
        </div>
      )}

      {/* Main Layout: Sidebar + Content */}
      <div className={`flex flex-1 overflow-hidden ${editorSubTab !== 'editor' ? 'hidden' : ''}`}>
        {/* Mobile Sidebar Overlay */}
        <div className={`fixed inset-0 z-40 md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Slide-in panel */}
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                Pages
                <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[10px]">{pages.length}</span>
              </p>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Back link on mobile */}
            <div className="px-4 py-2 border-b border-gray-50">
              <Link
                href={site?.client_id ? `/agency/clients/${site.client_id}` : '/agency/website'}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1.5 min-h-[44px]"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sites
              </Link>
            </div>
            <div className="py-1">
              {GROUP_ORDER.map((type) => {
                const typePages = groupedPages[type];
                if (!typePages || typePages.length === 0) return null;
                return (
                  <div key={type} className="mb-1">
                    <p className="px-4 py-1.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                      {GROUP_LABELS[type] || type}
                    </p>
                    {typePages.map((page) => {
                      const isSelected = selectedPage?.id === page.id;
                      return (
                        <button
                          key={page.id}
                          onClick={() => {
                            setSelectedPage(page);
                            if (page.slug !== '/') setActiveTab('content');
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors min-h-[44px] ${
                            page.hidden ? 'opacity-50' : ''
                          } ${
                            isSelected
                              ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600'
                              : 'text-gray-700 hover:bg-gray-50 border-l-2 border-transparent'
                          }`}
                        >
                          <span className={`shrink-0 ${isSelected ? 'text-indigo-500' : 'text-gray-400'}`}>
                            {getPageIcon(page)}
                          </span>
                          <span className="text-sm truncate flex-1">{getPageLabel(page)}</span>
                          {page.hidden && (
                            <span className="shrink-0 text-[8px] bg-amber-100 text-amber-700 border border-amber-200 px-1 py-0.5 rounded font-medium uppercase tracking-wide" title="Draft — not visible to visitors">
                              Draft
                            </span>
                          )}
                          {!page.hidden && page.edited && (
                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Edited" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop Sidebar — Page List */}
        <div className="hidden md:block w-56 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
          <div className="px-3 py-3 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between mb-2">
              Pages
              <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[10px]">{pages.length}</span>
            </p>
            {/* Sprint 6: Add Page CTA — opens the page templates picker. */}
            <button
              onClick={() => setNewPageOpen(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
            >
              <Plus className="h-3 w-3" /> New page
            </button>
          </div>

          <div className="py-1">
            {GROUP_ORDER.map((type) => {
              const typePages = groupedPages[type];
              if (!typePages || typePages.length === 0) return null;
              return (
                <div key={type} className="mb-1">
                  <p className="px-3 py-1 text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                    {GROUP_LABELS[type] || type}
                  </p>
                  {typePages.map((page) => {
                    const isSelected = selectedPage?.id === page.id;
                    return (
                      <button
                        key={page.id}
                        onClick={() => {
                          setSelectedPage(page);
                          if (page.slug !== '/') setActiveTab('content');
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                          page.hidden ? 'opacity-50' : ''
                        } ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600'
                            : 'text-gray-700 hover:bg-gray-50 border-l-2 border-transparent'
                        }`}
                      >
                        <span className={`shrink-0 ${isSelected ? 'text-indigo-500' : 'text-gray-400'}`}>
                          {getPageIcon(page)}
                        </span>
                        <span className="text-xs truncate flex-1">{getPageLabel(page)}</span>
                        {page.hidden && (
                          <span className="shrink-0 text-[8px] bg-gray-200 text-gray-500 px-1 py-0.5 rounded font-medium">
                            Hidden
                          </span>
                        )}
                        {!page.hidden && page.edited && (
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Edited" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area — split-pane when preview is on (Sprint 6).
            Left pane: the edit cards. Right pane: live preview iframe.
            Each pane scrolls independently. On mobile we stack vertically
            via flex-col so the preview drops below the edit cards. */}
        <div className={`flex-1 flex min-w-0 ${previewOpen ? 'flex-col xl:flex-row' : ''}`}>
        <div className={`${previewOpen ? 'xl:w-1/2 xl:border-r border-gray-200 h-1/2 xl:h-auto' : 'flex-1'} overflow-y-auto`}>
          {selectedPage ? (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
              {/* Page Header */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-indigo-500 shrink-0">{getPageIcon(selectedPage)}</span>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 truncate">
                        <span className="truncate">{getPageLabel(selectedPage)}</span>
                        {selectedPage.hidden && (
                          <span
                            className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0"
                            title="This page is a draft — hidden from visitors and search engines."
                          >
                            <EyeOff className="h-3 w-3" /> Draft
                          </span>
                        )}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400 font-mono truncate">{selectedPage.slug}</p>
                        {isHomepageRow(selectedPage) && (
                          <span className="text-[10px] text-gray-400 shrink-0">
                            › {activeTab === 'content' ? 'Content' : activeTab === 'design' ? 'Design' : 'Site Settings'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {showRegenerateInput ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
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
                          className="flex-1 sm:w-64 px-2.5 py-2 sm:py-1.5 text-xs border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            regeneratePage(regenerateFeedback || undefined);
                            setShowRegenerateInput(false);
                            setRegenerateFeedback('');
                          }}
                          disabled={regenerating}
                          className="min-h-[44px] sm:min-h-0 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Go
                        </button>
                        <button
                          onClick={() => { setShowRegenerateInput(false); setRegenerateFeedback(''); }}
                          className="min-h-[44px] sm:min-h-0 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-4 w-4 sm:h-3 sm:w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowRegenerateInput(true)}
                        disabled={regenerating}
                        className="min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1.5 text-xs font-medium border border-amber-200 text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {regenerating ? <Loader2 className="h-3.5 w-3.5 sm:h-3 sm:w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
                        <span className="hidden sm:inline">Regenerate with AI</span>
                        <span className="sm:hidden">AI</span>
                      </button>
                    )}
                    {siteUrl && (
                      <a
                        href={`${siteUrl}/${selectedPage.slug === 'index' ? '' : selectedPage.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] sm:min-h-0 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                        <span className="hidden sm:inline">Preview</span>
                      </a>
                    )}
                    <button
                      onClick={() => setPreviewOpen((v) => !v)}
                      className={`min-h-[44px] sm:min-h-0 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium border rounded-lg flex items-center gap-1.5 ${
                        previewOpen
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                      title="Toggle live preview"
                    >
                      <Eye className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                      <span className="hidden sm:inline">Preview</span>
                    </button>
                    <button
                      onClick={() => setHistoryOpen(true)}
                      className="min-h-[44px] sm:min-h-0 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                      title="View revision history"
                    >
                      <RotateCcw className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                      <span className="hidden sm:inline">History</span>
                    </button>
                    <button
                      onClick={() => togglePageVisibility(selectedPage)}
                      className="min-h-[44px] sm:min-h-0 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                      title={selectedPage.hidden
                        ? 'Publish — make this page visible to visitors'
                        : 'Move to draft — hide from visitors and search engines'}
                    >
                      {selectedPage.hidden ? <Eye className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> : <EyeOff className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
                      <span className="hidden sm:inline">{selectedPage.hidden ? 'Publish' : 'Draft'}</span>
                    </button>
                    <button
                      onClick={() => duplicatePage(selectedPage)}
                      className="min-h-[44px] sm:min-h-0 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
                      title="Duplicate page"
                    >
                      <Copy className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                      <span className="hidden sm:inline">Duplicate</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Regeneration Progress Banner */}
              {regenerateStatus === 'working' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                  <Loader2 className="h-5 w-5 text-amber-600 animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Regenerating with AI...</p>
                    <p className="text-xs text-amber-600">This takes 15–30 seconds. The page will update automatically.</p>
                  </div>
                </div>
              )}
              {regenerateStatus === 'success' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">✓ Page regenerated!</p>
                    <p className="text-xs text-green-600">Content has been updated. Review the changes below.</p>
                  </div>
                </div>
              )}
              {regenerateStatus === 'timeout' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Regeneration may still be processing</p>
                    <p className="text-xs text-blue-600">Refresh the page in a moment to check for updates.</p>
                  </div>
                </div>
              )}

              {/* Tab Bar — only show on homepage (Site Settings + Design are
                  site-wide so they only make sense on the home row). */}
              {isHomepageRow(selectedPage) && (
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                  {([
                    { id: 'content' as const, label: 'Content', icon: <FileText className="h-3.5 w-3.5" /> },
                    { id: 'design' as const, label: 'Design', icon: <Palette className="h-3.5 w-3.5" /> },
                    { id: 'site' as const, label: 'Site Settings', icon: <Settings className="h-3.5 w-3.5" /> },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap min-h-[44px] sm:min-h-0 ${
                        activeTab === tab.id
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ─── Content Tab (always shown on non-homepage, conditional on homepage) ─── */}
              {(!isHomepageRow(selectedPage) || activeTab === 'content') && (
                <div className="space-y-4">
                  {/* Page Settings (title + slug) — must be above Hero & SEO so
                      customers find the title field quickly. Added 2026-05-13
                      after a customer reported pages had no way to be renamed. */}
                  <PageSettingsCard
                    page={selectedPage}
                    onSave={savePageEdits}
                    saving={saving}
                  />

                  {/* Hero & SEO Editor */}
                  <HeroEditor
                    page={selectedPage}
                    photos={site?.photos || []}
                    onSave={savePageEdits}
                    saving={saving}
                  />

                  {/* Sprint 5: Form Builder — configures cta_form_fields +
                      form_webhook_url for this page's form-embed CTA. Empty
                      fields[] preserves the legacy contact form. */}
                  <FormBuilderEditor
                    page={selectedPage}
                    onSave={savePageEdits}
                    saving={saving}
                  />

                  {/* Content Sections */}
                  <CollapsibleCard
                    title="Content Sections"
                    icon={<MessageSquare className="h-4 w-4" />}
                    badge={`${selectedPage.content_sections?.length || 0}`}
                    defaultOpen={true}
                  >
                    <div className="space-y-3">
                      {(!selectedPage.content_sections || selectedPage.content_sections.length === 0) ? (
                        <div className="text-center py-8">
                          <MessageSquare className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                          <p className="text-sm text-gray-400 mb-3">No content sections yet</p>
                          <button
                            onClick={addContentSection}
                            className="px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Content Section
                          </button>
                        </div>
                      ) : (
                        <>
                          {selectedPage.content_sections.map((section, i) => (
                            <div
                              key={i}
                              className="bg-gray-50 rounded-xl border border-gray-100 p-3 sm:p-4 hover:border-indigo-200 transition-colors group"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-0">
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
                                <div className="flex items-center gap-1.5 sm:gap-1 shrink-0 sm:ml-3">
                                  <div className="flex sm:flex-col gap-1 sm:gap-0.5">
                                    <button
                                      onClick={() => moveContentSection(i, -1)}
                                      disabled={i === 0}
                                      className="p-2 sm:p-0.5 text-gray-300 hover:text-indigo-500 disabled:opacity-30 transition-colors min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center rounded-lg sm:rounded-none bg-white sm:bg-transparent border border-gray-200 sm:border-0"
                                      title="Move up"
                                    >
                                      <ArrowUp className="h-4 w-4 sm:h-3 sm:w-3" />
                                    </button>
                                    <button
                                      onClick={() => moveContentSection(i, 1)}
                                      disabled={i === (selectedPage.content_sections?.length ?? 0) - 1}
                                      className="p-2 sm:p-0.5 text-gray-300 hover:text-indigo-500 disabled:opacity-30 transition-colors min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center rounded-lg sm:rounded-none bg-white sm:bg-transparent border border-gray-200 sm:border-0"
                                      title="Move down"
                                    >
                                      <ArrowDown className="h-4 w-4 sm:h-3 sm:w-3" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => setEditingSection(i)}
                                    className="px-3 py-2 sm:py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex items-center gap-1 min-h-[44px] sm:min-h-0"
                                  >
                                    <Edit3 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteContentSection(i)}
                                    className="p-2 sm:p-1.5 text-gray-400 sm:text-gray-300 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-all min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center rounded-lg sm:rounded-none bg-white sm:bg-transparent border border-gray-200 sm:border-0"
                                    title="Delete section"
                                  >
                                    <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}

                          <button
                            onClick={addContentSection}
                            className="w-full px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Content Section
                          </button>
                        </>
                      )}
                    </div>
                  </CollapsibleCard>

                  {/* FAQ Editor */}
                  <CollapsibleCard
                    title="FAQ"
                    icon={<HelpCircle className="h-4 w-4" />}
                    badge={`${selectedPage.faq?.length || 0} items`}
                    defaultOpen={false}
                  >
                    {(!selectedPage.faq || selectedPage.faq.length === 0) ? (
                      <div className="text-center py-8">
                        <HelpCircle className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 mb-3">No FAQ items yet</p>
                        <button
                          onClick={() => savePageEdits({ faq: [{ question: '', answer: '' }] })}
                          className="px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add FAQ
                        </button>
                      </div>
                    ) : (
                      <FaqEditor
                        page={selectedPage}
                        onSave={savePageEdits}
                        saving={saving}
                      />
                    )}
                  </CollapsibleCard>
                </div>
              )}

              {/* ─── Design Tab (homepage only) ─── */}
              {isHomepageRow(selectedPage) && activeTab === 'design' && site && (
                <div className="space-y-4">
                  {/* Logo first — most visible piece of branding, customers
                      look for it before anything else. */}
                  <LogoUploader
                    siteId={siteId}
                    logoUrl={site.logo_url}
                    onChanged={refreshSite}
                  />

                  {/* Theme tokens — colors, font, radius, design style.
                      Single card so customers find every visual control in
                      one place (was previously fragmented to the wizard). */}
                  <ThemeEditor
                    site={site}
                    onSave={saveSiteEdits}
                    saving={savingSite}
                  />

                  {/* Section Manager — reorder + variant switching */}
                  <SectionManager
                    site={site}
                    onSave={saveSiteEdits}
                    saving={savingSite}
                  />

                  {/* Image Gallery */}
                  <ImageGallery
                    siteId={siteId}
                    photos={site.photos || []}
                    onPhotosChanged={refreshSite}
                  />
                </div>
              )}

              {/* ─── Site Settings Tab (homepage only) ───
                  Previously gated on `slug === '/'` which never matched in
                  production (homepage rows use slug='home' or page_type=
                  'homepage'), so the Header/Footer builders were invisible.
                  Fixed 2026-05-14 alongside the menus builder upgrade. */}
              {isHomepageRow(selectedPage) && activeTab === 'site' && site && (
                <div className="space-y-4">
                  <BusinessDetailsEditor site={site} onSave={saveSiteEdits} saving={savingSite} />
                  <NavLinkEditor site={site} onSave={saveSiteEdits} saving={savingSite} />
                  <FooterEditor site={site} onSave={saveSiteEdits} saving={savingSite} />
                  {/* Custom Code lives in Site Settings (not Design) because
                      analytics + tracking pixels are operational concerns,
                      not visual ones. Kept at the bottom — most agencies
                      configure once at launch and never touch again. */}
                  <CustomCodeEditor site={site} onSave={saveSiteEdits} saving={savingSite} />
                </div>
              )}

            </div>
          ) : (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-3">Select a page from the sidebar to edit</p>
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden px-4 py-3 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center gap-2"
                >
                  <Menu className="h-4 w-4" />
                  Browse Pages
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sprint 6: Preview pane (right side on xl, below on smaller).
            Mounted only when previewOpen so the iframe doesn't keep rendering
            in the background. */}
        {previewOpen && selectedPage && (
          <div className="xl:w-1/2 h-1/2 xl:h-auto flex-1 xl:flex-none">
            <PreviewPanel
              siteId={siteId}
              pageSlug={selectedPage.slug}
              device={previewDevice}
              refreshKey={previewRefreshKey}
              onDeviceChange={setPreviewDevice}
              onRefresh={() => setPreviewRefreshKey((k) => k + 1)}
              onClose={() => setPreviewOpen(false)}
            />
          </div>
        )}
        </div>
      </div>

      {/* Sprint 6: Page Templates picker — modal mounted at the root so it
          overlays everything; opened from the sidebar's "Add page" affordance. */}
      {newPageOpen && (
        <NewPageFromTemplateModal
          siteId={siteId}
          onClose={() => setNewPageOpen(false)}
          onCreated={async (page) => {
            setNewPageOpen(false);
            await refreshSite();
            // Refresh pages list and select the new page.
            const pagesRes = await fetch(`/api/agency/sites/${siteId}/pages`);
            if (pagesRes.ok) {
              const result = await pagesRes.json();
              if (Array.isArray(result.data)) {
                setPages(result.data);
                const created = result.data.find((p: SitePage) => p.id === page.id);
                if (created) setSelectedPage(created);
              }
            }
            showToast(`Created "${page.title}" — it's a Draft. Customize then publish.`);
          }}
        />
      )}
    </div>
  );
}
