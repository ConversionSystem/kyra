import { Phone } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';

type PhoneLinkProps = {
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
};

export function PhoneLink({ className = '', showIcon = true, children }: PhoneLinkProps) {
  return (
    <a href={BUSINESS.phoneHref} className={className}>
      {showIcon && <Phone className="h-4 w-4" />}
      {children || BUSINESS.phone}
    </a>
  );
}
