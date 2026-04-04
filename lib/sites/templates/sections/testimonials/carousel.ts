interface TestimonialsData {
  heading?: string;
  testimonials: Array<{
    name: string;
    text: string;
    rating?: number;
    location?: string;
  }>;
  colors: { primary: string; secondary: string };
  designStyle?: string;
}

function renderStars(): string {
  return Array(5).fill(0).map(() =>
    `<svg style="width:22px;height:22px;fill:#fbbf24;flex-shrink:0;" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>`
  ).join('');
}

export function carouselTestimonials(data: TestimonialsData): string {
  const heading = data.heading || 'What Our Clients Say';
  const { primary } = data.colors;

  // Show first testimonial as the spotlight, rest as smaller cards
  const [featured, ...rest] = data.testimonials;
  if (!featured) return '';

  const featuredInitial = featured.name.charAt(0).toUpperCase();

  const restCards = rest.slice(0, 4).map(t => {
    const initial = t.name.charAt(0).toUpperCase();
    return `<div style="background: #ffffff; border: 1px solid #f0f0f0; border-radius: 16px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
      <div style="display: flex; gap: 2px; margin-bottom: 0.75rem;">${Array(t.rating || 5).fill(0).map(() => `<svg width="16" height="16" viewBox="0 0 20 20" fill="#fbbf24"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>`).join('')}</div>
      <p style="color: #374151; font-size: 0.88rem; line-height: 1.65; margin: 0 0 1rem 0; font-style: italic;">&ldquo;${t.text.length > 140 ? t.text.slice(0, 140) + '…' : t.text}&rdquo;</p>
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${primary}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.85rem; flex-shrink: 0;">${initial}</div>
        <div>
          <div style="font-weight: 700; color: #111827; font-size: 0.85rem;">${t.name}</div>
          ${t.location ? `<div style="color: #9ca3af; font-size: 0.75rem;">${t.location}</div>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  return `<section class="py-16 sm:py-20 px-4 sm:px-6 lg:px-8" style="background: #f8fafc;" aria-label="Testimonials" id="testimonials">
  <div class="max-w-7xl mx-auto">
    <div style="text-align: center; margin-bottom: 3.5rem;">
      <div style="display: inline-block; background: ${primary}15; color: ${primary}; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 16px; border-radius: 100px; margin-bottom: 1rem;">Client Reviews</div>
      <h2 style="font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 900; color: #111827; margin: 0 0 0.5rem 0; letter-spacing: -0.02em;">${heading}</h2>
      <p style="color: #6b7280; font-size: 1rem; max-width: 400px; margin: 0 auto; line-height: 1.6;">Real feedback from real customers</p>
    </div>

    <!-- Featured testimonial -->
    <div class="px-6 py-10 sm:p-14 mb-8" style="background: linear-gradient(135deg, ${primary} 0%, ${data.colors.secondary} 100%); border-radius: 24px; position: relative; overflow: hidden; box-shadow: 0 20px 60px ${primary}40;">
      <!-- Background quote mark -->
      <div style="position: absolute; top: -20px; right: 30px; font-size: 18rem; line-height: 1; color: rgba(255,255,255,0.07); font-family: Georgia, serif; pointer-events: none;" aria-hidden="true">&ldquo;</div>

      <div style="position: relative; z-index: 1; max-width: 800px; margin: 0 auto; text-align: center;">
        <div style="display: flex; justify-content: center; gap: 4px; margin-bottom: 1.5rem;">${renderStars()}</div>
        <p style="font-size: clamp(1.1rem, 2.5vw, 1.5rem); color: #ffffff; line-height: 1.7; font-style: italic; font-weight: 400; margin: 0 0 2rem 0;">&ldquo;${featured.text}&rdquo;</p>
        <div style="display: flex; align-items: center; justify-content: center; gap: 14px;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 1.3rem; border: 2px solid rgba(255,255,255,0.4);">${featuredInitial}</div>
          <div style="text-align: left;">
            <div style="color: #ffffff; font-weight: 800; font-size: 1.05rem;">${featured.name}</div>
            <div style="color: rgba(255,255,255,0.75); font-size: 0.85rem;">${featured.location || 'Verified Customer'}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Additional reviews grid -->
    ${rest.length > 0 ? `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      ${restCards}
    </div>` : ''}
  </div>
</section>`;
}

export default carouselTestimonials;
