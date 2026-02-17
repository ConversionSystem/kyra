import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-indigo-600 text-white shadow hover:bg-indigo-700',
        secondary: 'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200',
        destructive: 'border-transparent bg-red-500 text-white shadow hover:bg-red-600',
        outline: 'border-gray-300 text-gray-700',
        fact: 'border-blue-200 bg-blue-50 text-blue-600',
        person: 'border-indigo-200 bg-indigo-50 text-indigo-600',
        decision: 'border-amber-200 bg-amber-50 text-amber-600',
        event: 'border-green-200 bg-green-50 text-green-600',
        preference: 'border-indigo-200 bg-indigo-50 text-indigo-600',
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
