import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-zinc-50 text-zinc-900 shadow hover:bg-zinc-50/80',
        secondary: 'border-transparent bg-zinc-800 text-zinc-50 hover:bg-zinc-800/80',
        destructive: 'border-transparent bg-red-500 text-zinc-50 shadow hover:bg-red-500/80',
        outline: 'border-zinc-700 text-zinc-50',
        fact: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
        person: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
        decision: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
        event: 'border-green-500/50 bg-green-500/10 text-green-400',
        preference: 'border-pink-500/50 bg-pink-500/10 text-pink-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
