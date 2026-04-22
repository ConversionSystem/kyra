/**
 * Relative-time helper — "3h ago", "2d ago", etc. Single source of truth.
 * Replaces 4+ reimplementations across client-detail-view, crm-tab,
 * payments-sub-tab, voice-sub-tab.
 */
export function timeAgo(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const diff = Date.now() - d.getTime();
  if (Number.isNaN(diff)) return '—';
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 604_800_000)}w ago`;
  if (diff < 31_536_000_000) return `${Math.floor(diff / 2_592_000_000)}mo ago`;
  return `${Math.floor(diff / 31_536_000_000)}y ago`;
}
