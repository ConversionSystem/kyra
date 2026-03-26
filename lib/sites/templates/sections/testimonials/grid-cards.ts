interface TestimonialsData {
  heading?: string;
  testimonials: Array<{
    name: string;
    text: string;
    rating?: number;
    location?: string;
  }>;
  colors: { primary: string; secondary: string };
}

function renderStars(rating: number, color: string): string {
  if (!rating) return '';
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < rating
      ? `<svg style="width:20px;height:20px;fill:#fbbf24;" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>`
      : `<svg style="width:20px;height:20px;fill:#e5e7eb;" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>`
  ).join('');
  return `<div class="flex gap-1 mb-3" aria-label="${rating} out of 5 stars">${stars}</div>`;
}

export function gridCardsTestimonials(data: TestimonialsData): string {
  const heading = data.heading || 'What Our Clients Say';

  const cards = data.testimonials.map(t => {
    const initial = t.name.charAt(0).toUpperCase();
    return `
    <div class="rounded-2xl p-8 shadow-lg" style="background: var(--color-surface); border-left: 4px solid ${data.colors.primary};">
      ${t.rating ? renderStars(t.rating, data.colors.primary) : ''}
      <p class="text-base leading-relaxed mb-6" style="color: #1f2937;">${t.text}</p>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style="background: ${data.colors.primary}; color: #ffffff;">${initial}</div>
        <div>
          <p class="font-semibold text-sm" style="color: #1f2937;">${t.name}</p>
          ${t.location ? `<p class="text-sm" style="color: #6b7280;">${t.location}</p>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  return `<section class="py-16 sm:py-24 px-4" style="background: var(--color-surface);" aria-label="Testimonials">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl sm:text-4xl font-bold text-center mb-12" style="color: #1f2937;">${heading}</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      ${cards}
    </div>
  </div>
</section>`;
}

export default gridCardsTestimonials;
