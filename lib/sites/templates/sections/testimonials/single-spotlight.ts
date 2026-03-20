interface TestimonialsData {
  heading?: string;
  testimonials: Array<{
    name: string;
    text: string;
    rating?: number;
    location?: string;
  }>;
}

function renderStars(rating?: number): string {
  if (!rating) return '';
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < rating ? '★' : '☆'
  ).join('');
  return `<div class="text-2xl mb-4" style="color: var(--color-accent);" aria-label="${rating} out of 5 stars">${stars}</div>`;
}

export function singleSpotlightTestimonials(data: TestimonialsData): string {
  const heading = data.heading || 'What Our Clients Say';
  const t = data.testimonials[0];
  if (!t) return '';

  return `<section class="py-20 px-4" style="background: var(--color-surface);" aria-label="Featured testimonial">
  <div class="max-w-3xl mx-auto text-center">
    <h2 class="text-3xl font-bold mb-12" style="color: var(--color-text);">${heading}</h2>
    <div class="text-6xl leading-none mb-6" style="color: var(--color-primary);">&ldquo;</div>
    <blockquote class="text-xl sm:text-2xl leading-relaxed mb-8 italic" style="color: var(--color-text);">${t.text}</blockquote>
    ${renderStars(t.rating)}
    <p class="text-lg font-semibold" style="color: var(--color-text);">${t.name}</p>
    ${t.location ? `<p class="text-base mt-1" style="color: var(--color-text-muted);">${t.location}</p>` : ''}
  </div>
</section>`;
}

export default singleSpotlightTestimonials;
