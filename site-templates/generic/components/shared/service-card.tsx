import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type ServiceCardProps = {
  name: string;
  slug: string;
  description: string;
  href?: string;
};

export function ServiceCard({ name, description, href }: ServiceCardProps) {
  const linkHref = href || `/services/${name.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <Link
      href={linkHref}
      className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-red-500/30 hover:bg-white/[0.07] transition-all"
    >
      <h3 className="text-lg font-semibold text-white mb-2">{name}</h3>
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      <div className="flex items-center gap-1 mt-auto text-red-400 text-sm font-medium group-hover:text-red-300 transition">
        Learn More <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
