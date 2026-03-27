interface ServicesData {
  heading?: string;
  services: Array<{
    name: string;
    slug: string;
    description?: string;
    icon?: string;
  }>;
  businessName?: string;
  colors: { primary: string; secondary: string };
}

// Industry-relevant SVG icon shapes
const ICON_SHAPES = [
  'M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.049.58.025 1.193-.14 1.743',
  'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
  'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5',
  'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
];

function featureCheckmarks(items: string[], primary: string): string {
  return items.map(item => `<div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 0.6rem;">
    <div style="width: 22px; height: 22px; border-radius: 50%; background: ${primary}15; border: 1.5px solid ${primary}40; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
    <span style="color: #4b5563; font-size: 0.92rem; line-height: 1.5;">${item}</span>
  </div>`).join('');
}

export function alternatingServices(data: ServicesData): string {
  const heading = data.heading || 'Our Services';
  const { primary, secondary } = data.colors;
  const displayServices = data.services.slice(0, 6);

  const rows = displayServices.map((s, i) => {
    const isEven = i % 2 === 0;
    const bgColor = isEven ? '#ffffff' : '#f9fafb';
    const descText = s.description || `Professional ${s.name.toLowerCase()} services delivered with expertise and care. We bring years of experience and industry-best practices to every job, ensuring results you'll be proud of.`;
    const iconPath = ICON_SHAPES[i % ICON_SHAPES.length];

    // Feature bullets from description or generic
    const bullets = [
      'Licensed, certified professionals',
      'Upfront transparent pricing',
      'Satisfaction guaranteed on every job',
    ];

    const visualPanel = `<div style="position: relative; border-radius: 20px; overflow: hidden; background: linear-gradient(135deg, ${isEven ? `${primary}18` : `${secondary}15`} 0%, ${isEven ? `${secondary}15` : `${primary}18`} 100%); min-height: 320px; display: flex; align-items: center; justify-content: center;">
      <!-- Background pattern -->
      <div style="position: absolute; inset: 0; opacity: 0.5; background-image: radial-gradient(${primary}30 1px, transparent 1px); background-size: 20px 20px;" aria-hidden="true"></div>
      <!-- Icon circle -->
      <div style="position: relative; z-index: 1; text-align: center; padding: 3rem;">
        <div style="width: 100px; height: 100px; border-radius: 50%; background: ${primary}; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 20px 50px ${primary}60;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="${iconPath}" /></svg>
        </div>
        <div style="font-weight: 800; color: #1f2937; font-size: 1.15rem; margin-bottom: 0.4rem;">${s.name}</div>
        <div style="display: inline-block; background: ${primary}; color: white; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 4px 12px; border-radius: 100px;">${i === 0 ? 'Most Popular' : i === 1 ? 'Highly Rated' : 'Available Now'}</div>
      </div>
    </div>`;

    const textPanel = `<div style="display: flex; flex-direction: column; justify-content: center; padding: 1rem 0;">
      <div style="display: inline-block; background: ${primary}15; color: ${primary}; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 12px; border-radius: 100px; margin-bottom: 1rem; width: fit-content;">Service ${i + 1} of ${displayServices.length}</div>
      <h3 style="font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 900; color: #111827; margin: 0 0 1rem 0; letter-spacing: -0.02em; line-height: 1.15;">${s.name}</h3>
      <p style="color: #4b5563; font-size: 1.02rem; line-height: 1.75; margin: 0 0 1.5rem 0;">${descText}</p>
      <div style="margin-bottom: 2rem;">${featureCheckmarks(bullets, primary)}</div>
      <a href="/services/${s.slug}" style="display: inline-flex; align-items: center; gap: 8px; background: ${primary}; color: #ffffff; font-weight: 700; font-size: 0.95rem; padding: 12px 24px; border-radius: 10px; text-decoration: none; width: fit-content; transition: opacity 0.2s; box-shadow: 0 4px 16px ${primary}40;" onmouseover="this.style.opacity='0.88'" onmouseout="this.style.opacity='1'">
        Get a Quote →
      </a>
    </div>`;

    return `<div style="background: ${bgColor}; padding: 4rem 1.5rem;">
      <div style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center;">
        ${isEven ? `<div>${visualPanel}</div><div>${textPanel}</div>` : `<div>${textPanel}</div><div>${visualPanel}</div>`}
      </div>
    </div>`;
  }).join('\n');

  return `<section aria-label="${heading}">
  <div style="background: ${primary}; padding: 3.5rem 1.5rem; text-align: center;">
    <div style="display: inline-block; background: rgba(255,255,255,0.2); color: white; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 16px; border-radius: 100px; margin-bottom: 1rem;">Everything We Offer</div>
    <h2 style="color: #ffffff; font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 900; margin: 0; letter-spacing: -0.02em;">${heading}</h2>
  </div>
  ${rows}
</section>`;
}

export default alternatingServices;
