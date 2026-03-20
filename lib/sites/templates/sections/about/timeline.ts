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
}

export function timelineAbout(data: AboutData): string {
  const heading = data.heading || 'Our Journey';
  const body = data.body || '';

  let milestones = data.milestones;
  if (!milestones || milestones.length === 0) {
    const currentYear = new Date().getFullYear();
    const years = data.yearsInBusiness || 5;
    const startYear = currentYear - years;
    milestones = [
      { year: String(startYear), text: 'Founded with a vision to deliver outstanding service to our community.' },
      { year: String(startYear + Math.floor(years * 0.3)), text: 'Expanded our team and capabilities to serve more clients.' },
      { year: String(startYear + Math.floor(years * 0.6)), text: 'Reached a major milestone in projects completed and client satisfaction.' },
      { year: String(currentYear), text: 'Continuing to grow and innovate for the future.' },
    ];
  }

  const items = milestones.map((m, i) => {
    const isLast = i === milestones!.length - 1;
    return `<div class="relative flex gap-6">
      <div class="flex flex-col items-center">
        <div class="w-4 h-4 rounded-full shrink-0 z-10" style="background: var(--color-primary); border: 3px solid var(--color-surface); box-shadow: 0 0 0 2px var(--color-primary);"></div>
        ${!isLast ? `<div class="w-0.5 grow" style="background: var(--color-border);"></div>` : ''}
      </div>
      <div class="pb-10 ${isLast ? 'pb-0' : ''}">
        <span class="text-sm font-bold uppercase tracking-wide" style="color: var(--color-primary);">${m.year}</span>
        <p class="mt-1 text-base leading-relaxed" style="color: var(--color-text-muted);">${m.text}</p>
      </div>
    </div>`;
  }).join('');

  return `<section class="py-16 sm:py-24" style="background: var(--color-surface);" aria-label="Our Journey">
  <div class="max-w-3xl mx-auto px-4 sm:px-6">
    <h2 class="text-3xl sm:text-4xl font-bold text-center mb-4" style="color: var(--color-text);">${heading}</h2>
    ${body ? `<p class="text-center text-lg mb-12" style="color: var(--color-text-muted);">${body}</p>` : '<div class="mb-12"></div>'}
    <div class="flex flex-col">
      ${items}
    </div>
  </div>
</section>`;
}

export default timelineAbout;
