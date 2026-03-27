interface AboutData {
  heading?: string;
  body?: string;
  ownerName?: string;
  ownerStory?: string;
  photoUrl?: string;
  yearsInBusiness?: number;
  rating?: number;
  reviewCount?: number;
  license?: string;
  teamMembers?: Array<{ name: string; role: string; photoUrl?: string }>;
  milestones?: Array<{ year: string; text: string }>;
  colors: { primary: string; secondary: string };
}

export function photoSplitAbout(data: AboutData): string {
  const heading = data.heading || 'About Us';
  const ownerName = data.ownerName || 'Our Team';
  const story = data.ownerStory || data.body || 'We are passionate about delivering exceptional service to every client. With years of hands-on experience and a commitment to quality, we\'ve built a reputation you can count on. From the first call to the final walkthrough, we treat every job like it\'s in our own home.';
  const { primary } = data.colors;

  // Business name initial for avatar
  const initial = ownerName.charAt(0).toUpperCase();

  const photoPanel = data.photoUrl
    ? `<div style="position: relative; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.18);">
        <img src="${data.photoUrl}" alt="${ownerName}" style="width: 100%; height: 100%; min-height: 420px; object-fit: cover; object-position: center top;" />
        <!-- Overlay badge -->
        <div style="position: absolute; bottom: 1.5rem; left: 1.5rem; background: rgba(255,255,255,0.95); border-radius: 14px; padding: 12px 18px; backdrop-filter: blur(8px); box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
          <div style="font-weight: 800; color: #111827; font-size: 0.95rem;">${ownerName}</div>
          <div style="color: #6b7280; font-size: 0.8rem; margin-top: 2px;">Local Business Owner</div>
        </div>
      </div>`
    : `<div style="position: relative; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.15); background: linear-gradient(145deg, ${data.colors.secondary} 0%, ${primary} 60%); min-height: 420px; display: flex; align-items: center; justify-content: center;">
        <div style="text-align: center; padding: 3rem;">
          <div style="width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; border: 3px solid rgba(255,255,255,0.4); font-size: 3rem; font-weight: 900; color: white;">${initial}</div>
          <div style="color: white; font-weight: 800; font-size: 1.3rem; margin-bottom: 0.5rem;">${ownerName}</div>
          <div style="color: rgba(255,255,255,0.75); font-size: 0.9rem;">Trusted Local Experts</div>
        </div>
        <!-- Pattern overlay -->
        <div style="position: absolute; inset: 0; opacity: 0.07; background-image: radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px); background-size: 20px 20px;" aria-hidden="true"></div>
      </div>`;

  const whyChooseUs = [
    'Fully licensed, insured, and background-checked technicians',
    'Upfront pricing with no hidden fees or surprises',
    'Satisfaction guaranteed — we\'ll make it right',
    'Locally owned and deeply invested in our community',
  ];

  const credBadges = [];
  if (data.yearsInBusiness) credBadges.push({ val: `${data.yearsInBusiness}+`, lbl: 'Years' });
  if (data.reviewCount) credBadges.push({ val: `${data.reviewCount}+`, lbl: 'Reviews' });
  if (data.rating) credBadges.push({ val: `${data.rating}★`, lbl: 'Rated' });

  const badgesHtml = credBadges.length
    ? `<div style="display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap;">
        ${credBadges.map(b => `<div style="background: ${primary}15; border: 1px solid ${primary}30; border-radius: 12px; padding: 10px 16px; text-align: center; min-width: 80px;">
          <div style="font-size: 1.4rem; font-weight: 900; color: ${primary}; line-height: 1;">${b.val}</div>
          <div style="font-size: 0.75rem; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">${b.lbl}</div>
        </div>`).join('')}
      </div>`
    : '';

  return `<section style="padding: 5rem 1.5rem; background: #ffffff;" aria-label="About us" id="about">
  <div style="max-width: 1200px; margin: 0 auto;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center;">
      <!-- Photo panel -->
      <div>
        ${photoPanel}
      </div>

      <!-- Content panel -->
      <div>
        <div style="display: inline-block; background: ${primary}15; color: ${primary}; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 14px; border-radius: 100px; margin-bottom: 1.25rem;">Our Story</div>

        <h2 style="font-size: clamp(1.8rem, 3.5vw, 2.6rem); font-weight: 900; color: #111827; margin: 0 0 0.75rem 0; letter-spacing: -0.02em; line-height: 1.15;">${heading}</h2>
        <div style="width: 50px; height: 4px; background: ${primary}; border-radius: 2px; margin-bottom: 1.5rem;"></div>

        <p style="color: #4b5563; font-size: 1.05rem; line-height: 1.75; margin: 0 0 1.5rem 0;">${story}</p>

        ${badgesHtml}

        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1rem; font-weight: 800; color: #111827; margin: 0 0 1rem 0; text-transform: uppercase; letter-spacing: 0.05em;">Why Choose Us</h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${whyChooseUs.map(item => `<div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="width: 22px; height: 22px; border-radius: 50%; background: ${primary}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span style="color: #4b5563; font-size: 0.93rem; line-height: 1.5;">${item}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

export default photoSplitAbout;
