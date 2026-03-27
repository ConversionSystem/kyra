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

export function singleSpotlightTestimonials(data: TestimonialsData): string {
  const heading = data.heading || 'What Our Clients Say';
  const { primary, secondary } = data.colors;
  const t = data.testimonials[0];
  if (!t) return '';

  const initial = t.name.charAt(0).toUpperCase();
  const displayRating = t.rating || 5;
  const stars = Array(displayRating).fill(0).map(() =>
    `<svg width="24" height="24" viewBox="0 0 20 20" fill="#fbbf24"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>`
  ).join('');

  // Also show secondary testimonials as smaller cards below
  const secondaryCards = data.testimonials.slice(1, 3).map(st => {
    const si = st.name.charAt(0).toUpperCase();
    return `<div style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18); border-radius: 16px; padding: 1.5rem; text-align: left; backdrop-filter: blur(8px);">
      <p style="color: rgba(255,255,255,0.88); font-size: 0.9rem; font-style: italic; line-height: 1.65; margin: 0 0 1rem 0;">&ldquo;${st.text.length > 120 ? st.text.slice(0, 120) + '…' : st.text}&rdquo;</p>
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.9rem;">${si}</div>
        <span style="color: rgba(255,255,255,0.8); font-size: 0.85rem; font-weight: 600;">${st.name}</span>
      </div>
    </div>`;
  }).join('');

  return `<section style="background: linear-gradient(135deg, ${secondary} 0%, ${primary} 55%, ${secondary}bb 100%); padding: 5rem 1.5rem; position: relative; overflow: hidden;" aria-label="Featured testimonial" id="testimonials">
  <!-- Giant background quote mark -->
  <div style="position: absolute; top: -40px; left: 50%; transform: translateX(-50%); font-size: 30rem; line-height: 1; color: rgba(255,255,255,0.04); font-family: Georgia, serif; pointer-events: none; user-select: none;" aria-hidden="true">&ldquo;</div>
  <!-- Pattern overlay -->
  <div style="position: absolute; inset: 0; opacity: 0.05; background-image: radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px); background-size: 28px 28px;" aria-hidden="true"></div>

  <div style="max-width: 900px; margin: 0 auto; position: relative; z-index: 1; text-align: center;">
    <!-- Section label -->
    <div style="display: inline-block; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); color: white; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 14px; border-radius: 100px; margin-bottom: 2rem;">${heading}</div>

    <!-- Stars -->
    <div style="display: flex; justify-content: center; gap: 4px; margin-bottom: 2rem;" aria-label="${displayRating} out of 5 stars">
      ${stars}
    </div>

    <!-- Main quote -->
    <blockquote style="font-size: clamp(1.2rem, 2.5vw, 1.7rem); color: #ffffff; font-style: italic; line-height: 1.65; font-weight: 400; margin: 0 0 2.5rem 0; text-shadow: 0 1px 10px rgba(0,0,0,0.2);">
      &ldquo;${t.text}&rdquo;
    </blockquote>

    <!-- Attribution -->
    <div style="display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: ${secondaryCards ? '3rem' : '0'};">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 1.4rem; border: 2px solid rgba(255,255,255,0.45);">${initial}</div>
      <div style="text-align: left;">
        <div style="color: #ffffff; font-weight: 800; font-size: 1.05rem;">${t.name}</div>
        <div style="color: rgba(255,255,255,0.7); font-size: 0.88rem;">${t.location || 'Verified Customer'}</div>
      </div>
    </div>

    <!-- Secondary cards row -->
    ${secondaryCards ? `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 2rem; text-align: left;">${secondaryCards}</div>` : ''}
  </div>
</section>`;
}

export default singleSpotlightTestimonials;
