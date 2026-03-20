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
  return `<div class="text-lg mb-2" style="color: var(--color-accent);" aria-label="${rating} out of 5 stars">${stars}</div>`;
}

export function carouselTestimonials(data: TestimonialsData): string {
  const heading = data.heading || 'What Our Clients Say';

  const cards = data.testimonials.map(t => `
    <div class="flex-shrink-0 w-80 snap-center rounded-xl p-6 shadow-md" style="background: var(--color-surface); border: 1px solid var(--color-border);">
      <div class="text-3xl mb-3" style="color: var(--color-primary);">&ldquo;</div>
      <p class="text-base mb-4 leading-relaxed" style="color: var(--color-text);">${t.text}</p>
      ${renderStars(t.rating)}
      <p class="font-semibold" style="color: var(--color-text);">${t.name}</p>
      ${t.location ? `<p class="text-sm" style="color: var(--color-text-muted);">${t.location}</p>` : ''}
    </div>`).join('');

  return `<section class="py-16 px-4" style="background: var(--color-surface);" aria-label="Testimonials">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-10" style="color: var(--color-text);">${heading}</h2>
    <div class="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory" style="scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;">
      ${cards}
    </div>
  </div>
</section>`;
}

export default carouselTestimonials;
