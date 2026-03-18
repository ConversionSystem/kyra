'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled, className }, ref) => {
    return (
      <button
        ref={ref}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-indigo-600' : 'bg-gray-300',
          className,
        )}
      >
        <span
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };
