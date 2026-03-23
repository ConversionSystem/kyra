import Link from 'next/link';

/**
 * "Powered by Kyra" badge for the chat widget footer.
 *
 * Plan logic:
 * - Free / Lite: always visible (cannot be turned off)
 * - Pro / Scale: can be toggled off via agency settings
 */
export function PoweredByBadge({ className }: { className?: string }) {
  return (
    <Link
      href="https://kyra.conversionsystem.com?ref=widget"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-indigo-500 transition-colors ${className ?? ''}`}
    >
      Powered by <span className="font-semibold text-indigo-500">Kyra</span> ⚡
    </Link>
  );
}
