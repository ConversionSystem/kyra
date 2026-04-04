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

// Lucide star SVG (yellow filled, from original site)
const ICON_STAR_YELLOW = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star h-4 w-4 text-yellow-500 fill-yellow-500" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>`;
const ICON_CHEVRON_RIGHT = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right h-4 w-4" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>`;

function renderStars(rating: number, isDark = false): string {
  const clamp = Math.max(1, Math.min(5, Math.round(rating)));
  if (isDark) {
    return Array.from({ length: clamp }, () => ICON_STAR_YELLOW).join('');
  }
  const emptyColor = '#e5e7eb';
  return Array.from({ length: 5 }, (_, i) =>
    `<svg style="width:20px;height:20px;flex-shrink:0;" viewBox="0 0 20 20"><path fill="${i < clamp ? '#fbbf24' : emptyColor}" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>`
  ).join('');
}

function avatarColor(name: string, primary: string): string {
  const palette = [primary, '#7c3aed', '#059669', '#dc2626', '#d97706', '#2563eb'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export function gridCardsTestimonials(data: TestimonialsData): string {
  const isDark = data.designStyle === 'modern-dark';
  if (isDark) return modernDarkTestimonials(data);
  return lightTestimonials(data);
}

function modernDarkTestimonials(data: TestimonialsData): string {
  const heading = data.heading || 'What Our Customers Say';

  const cards = data.testimonials.map(t => {
    const stars = renderStars(t.rating || 5, true);
    return `<div class="bg-white/5 border border-white/10 rounded-2xl p-6"><div class="flex gap-0.5 mb-3">${stars}</div><p class="text-gray-300 text-sm leading-relaxed mb-4">&ldquo;${t.text}&rdquo;</p><div class="text-sm font-medium text-white">${t.name}</div></div>`;
  });

  return `<section id="testimonials" class="py-20 sm:py-28"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="text-center mb-14"><h2 class="text-3xl sm:text-4xl font-bold text-white">${heading}</h2><p class="mt-3 text-gray-400">Real reviews from real customers</p></div><div class="grid md:grid-cols-2 gap-6">${cards.join('')}</div><div class="text-center mt-10"><a class="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-medium transition" href="/reviews">See All Reviews ${ICON_CHEVRON_RIGHT}</a></div></div></section>`;
}

function lightTestimonials(data: TestimonialsData): string {
  const heading = data.heading || 'What Our Clients Say';
  const { primary } = data.colors;

  const cards = data.testimonials.map(t => {
    const initial = t.name.charAt(0).toUpperCase();
    const avatarBg = avatarColor(t.name, primary);
    const stars = renderStars(t.rating || 5);
    const displayRating = t.rating || 5;

    return `<div style="background: #ffffff; border: 1px solid #f0f0f0; border-radius: 20px; padding: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 1rem; transition: transform 0.25s, box-shadow 0.25s; position: relative; overflow: hidden;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 16px 32px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'">
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(to right, ${primary}, ${primary}80);"></div>
      <div style="position: absolute; bottom: 16px; right: 20px; font-size: 5rem; line-height: 1; color: ${primary}12; font-family: Georgia, serif; pointer-events: none;" aria-hidden="true">&ldquo;</div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="display: flex; gap: 2px;" aria-label="${displayRating} out of 5 stars">${stars}</div>
        <span style="color: #6b7280; font-size: 0.8rem; font-weight: 600;">${displayRating}.0</span>
      </div>
      <p style="color: #374151; font-size: 0.97rem; line-height: 1.75; margin: 0; font-style: italic; flex: 1; position: relative; z-index: 1;">&ldquo;${t.text}&rdquo;</p>
      <div style="display: flex; align-items: center; gap: 12px; padding-top: 0.75rem; border-top: 1px solid #f3f4f6;">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: ${avatarBg}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #ffffff; font-weight: 800; font-size: 1.1rem; box-shadow: 0 4px 12px ${avatarBg}60;">${initial}</div>
        <div>
          <p style="color: #111827; font-weight: 700; font-size: 0.93rem; margin: 0 0 2px 0;">${t.name}</p>
          ${t.location ? `<p style="color: #9ca3af; font-size: 0.8rem; margin: 0;">📍 ${t.location}</p>` : '<p style="color: #9ca3af; font-size: 0.8rem; margin: 0;">✓ Verified Customer</p>'}
        </div>
      </div>
    </div>`;
  });

  const googleBadge = `<div style="display: flex; align-items: center; gap: 10px; justify-content: center; margin-bottom: 2.5rem; padding: 12px 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 100px; width: fit-content; margin-left: auto; margin-right: auto; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
    <span style="font-size: 0.85rem; color: #374151; font-weight: 600;">Google Reviews</span>
    <div style="display: flex; gap: 2px;">${Array(5).fill(0).map(() => `<svg width="14" height="14" viewBox="0 0 20 20" fill="#fbbf24"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>`).join('')}</div>
  </div>`;

  return `<section id="testimonials" class="py-16 sm:py-20 px-4 sm:px-6 lg:px-8" style="background: #f8fafc;" aria-label="Testimonials">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-12">
      <div style="display: inline-block; background: ${primary}15; color: ${primary}; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 16px; border-radius: 100px; margin-bottom: 1rem;">Reviews</div>
      <h2 style="font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 900; color: #111827; margin: 0 0 1.5rem 0; letter-spacing: -0.02em;">${heading}</h2>
      ${googleBadge}
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      ${cards.join('\n      ')}
    </div>
  </div>
</section>`;
}

export default gridCardsTestimonials;
