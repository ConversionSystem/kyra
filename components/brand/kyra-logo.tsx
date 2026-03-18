import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Kyra Brand Logo — single source of truth.
 * Use this everywhere. Stop creating new logos.
 *
 * Variants:
 *   "dark"  → for dark backgrounds (white text, indigo icon)
 *   "light" → for white/light backgrounds (indigo text, indigo icon)
 */
export function KyraLogo({
  variant = 'dark',
  size = 'md',
  href = '/',
  className,
}: {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  className?: string;
}) {
  const sizes = {
    sm: { box: 'w-6 h-6', letter: 'text-[10px]', text: 'text-sm' },
    md: { box: 'w-7 h-7', letter: 'text-xs', text: 'text-base' },
    lg: { box: 'w-8 h-8', letter: 'text-sm', text: 'text-lg' },
  };

  const s = sizes[size];

  const logo = (
    <span className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          s.box,
          'rounded-lg bg-indigo-600 flex items-center justify-center font-black',
          s.letter,
          'text-white'
        )}
      >
        K
      </span>
      <span
        className={cn(
          'font-bold tracking-tight',
          s.text,
          variant === 'dark' ? 'text-white' : 'text-indigo-600'
        )}
      >
        Kyra
      </span>
    </span>
  );

  if (href) {
    return <Link href={href}>{logo}</Link>;
  }

  return logo;
}
