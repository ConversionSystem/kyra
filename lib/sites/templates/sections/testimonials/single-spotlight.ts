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
      ? `<svg style="width:24px;height:24px;fill:#fbbf24;" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>`
      : `<svg style="width:24px;height:24px;fill:#e5e7eb;" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>`
  ).join('');
  return `<div class="flex justify-center gap-1 mb-6" aria-label="${rating} out of 5 stars">${stars}</div>`;
}

export function singleSpotlightTestimonials(data: TestimonialsData): string {
  const heading = data.heading || 'What Our Clients Say';
  const t = data.testimonials[0];
  if (!t) return '';

  return `<section class="py-16 sm:py-24 px-4" style="background: var(--color-surface);" aria-label="Featured testimonial">
  <div class="max-w-3xl mx-auto text-center">
    <h2 class="text-3xl sm:text-4xl font-bold mb-12" style="color: #1f2937;">${heading}</h2>
    <div style="font-size: 96px; line-height: 1; color: ${data.colors.primary}; opacity: 0.3;">&ldquo;</div>
    <blockquote class="text-xl sm:text-2xl leading-relaxed mb-8 italic" style="color: #1f2937;">${t.text}</blockquote>
    ${t.rating ? renderStars(t.rating, data.colors.primary) : ''}
    <p class="text-lg font-semibold" style="color: #1f2937;">${t.name}</p>
    ${t.location ? `<p class="text-base mt-1" style="color: #6b7280;">${t.location}</p>` : ''}
  </div>
</section>`;
}

export default singleSpotlightTestimonials;
