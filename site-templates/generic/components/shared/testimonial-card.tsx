import { Star } from 'lucide-react';

type TestimonialCardProps = {
  name: string;
  text: string;
  rating: number;
};

export function TestimonialCard({ name, text, rating }: TestimonialCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        ))}
      </div>
      <p className="text-gray-300 text-sm leading-relaxed mb-4">&ldquo;{text}&rdquo;</p>
      <div className="text-sm font-medium text-white">{name}</div>
    </div>
  );
}
