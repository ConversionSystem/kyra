'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Home,
  Briefcase,
  MapPin,
  MessageSquare,
  HelpCircle,
  Star,
  Phone,
  Edit3,
  Eye,
  RotateCcw,
  TrendingUp,
  Settings,
  BookOpen,
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
  meta_title: string | null;
  meta_description: string | null;
  content_sections: ContentSection[] | null;
  faq: FAQItem[] | null;
  edited: boolean;
  edited_at: string | null;
}

interface ContentSection {
  heading: string;
  body: string;
  bullets?: string[];
}

interface FAQItem {
  question: string;
  answer: string;
}

interface SiteData {
  id: string;
  business_name: string;
  industry: string;
  status: string;
  site_domain: string | null;
  site_subdomain: string | null;
  page_count: number;
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
  // Check slug-based icons first
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
  onSave,
  saving,
}: {
  page: SitePage;
  onSave: (updates: Partial<SitePage>) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [heroH1, setHeroH1] = useState(page.hero_h1 || '');
  const [heroSubtitle, setHeroSubtitle] = useState(page.hero_subtitle || '');
  const [metaTitle, setMetaTitle] = useState(page.meta_title || '');
  const [metaDescription, setMetaDescription] = useState(page.meta_description || '');

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

  // Toast helper
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
          // Auto-select first page if none selected
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

  // Save page edits (hero, meta)
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
        // Poll for completion
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
                      <button
                        key={page.id}
                        onClick={() => setSelectedPage(page)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className={isSelected ? 'text-indigo-500' : 'text-gray-400'}>
                          {getPageIcon(page)}
                        </span>
                        <span className="text-sm truncate">{getPageLabel(page)}</span>
                        {page.edited && (
                          <span className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title="Edited" />
                        )}
                      </button>
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
                    <h2 className="text-lg font-semibold text-gray-900">{getPageLabel(selectedPage)}</h2>
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

              {/* Hero & SEO Editor */}
              <HeroEditor page={selectedPage} onSave={savePageEdits} saving={saving} />

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
                          {section.bullets && section.bullets.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <ChevronRight className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-400">
                                {section.bullets.length} bullet{section.bullets.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
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
