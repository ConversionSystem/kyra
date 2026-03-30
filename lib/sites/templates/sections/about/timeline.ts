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
      { year: String(startYear + Math.floor(years * 0.5)), text: 'Expanded our team and capabilities to better serve our growing client base.' },
      { year: String(currentYear), text: `Today — ${years} years serving the community with pride.` },
    ];
  }

  const items = milestones.map((m, i) => {
    const isEven = i % 2 === 0;
    const cardSide = isEven ? 'md:flex-row' : 'md:flex-row-reverse';
    const textAlign = isEven ? 'md:text-right' : 'md:text-left';

    return `<div class="relative flex flex-row ${cardSide} items-start gap-4 md:gap-8">
      <!-- Left / Right card -->
      <div class="hidden md:block md:w-5/12 ${textAlign}">
        ${isEven ? `<div class="inline-block rounded-xl shadow-md p-5" style="background: var(--color-surface);">
          <p class="text-base leading-relaxed" style="color: #6b7280;">${m.text}</p>
        </div>` : `<span class="inline-block rounded-full px-4 py-1.5 text-sm font-bold" style="background: ${data.colors.primary}; color: #ffffff;">${m.year}</span>`}
      </div>

      <!-- Center line + dot -->
      <div class="flex flex-col items-center md:w-2/12 shrink-0">
        <div class="w-4 h-4 rounded-full shrink-0 z-10 shadow" style="background: ${data.colors.primary};"></div>
        ${i < milestones!.length - 1 ? `<div class="w-0.5 grow min-h-[40px]" style="background: ${data.colors.primary}; opacity: 0.3;"></div>` : ''}
      </div>

      <!-- Right / Left card -->
      <div class="md:w-5/12 ${isEven ? '' : ''}">
        ${isEven ? `<span class="inline-block rounded-full px-4 py-1.5 text-sm font-bold" style="background: ${data.colors.primary}; color: #ffffff;">${m.year}</span>` : `<div class="inline-block rounded-xl shadow-md p-5" style="background: var(--color-surface);">
          <p class="text-base leading-relaxed" style="color: #6b7280;">${m.text}</p>
        </div>`}
      </div>

      <!-- Mobile: card below dot (visible only on small screens) -->
      <div class="md:hidden flex-1 pb-8">
        <span class="inline-block rounded-full px-4 py-1.5 text-sm font-bold mb-2" style="background: ${data.colors.primary}; color: #ffffff;">${m.year}</span>
        <div class="rounded-xl shadow-md p-4" style="background: var(--color-surface);">
          <p class="text-base leading-relaxed" style="color: #6b7280;">${m.text}</p>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<section id="about" class="py-16 sm:py-24" style="background: var(--color-surface);" aria-label="Our Journey">
  <div class="max-w-4xl mx-auto px-4 sm:px-6">
    <h2 class="text-3xl sm:text-4xl font-bold text-center mb-4" style="color: #1f2937;">${heading}</h2>
    ${body ? `<p class="text-center text-lg mb-12 max-w-2xl mx-auto" style="color: #6b7280;">${body}</p>` : '<div class="mb-12"></div>'}
    <div class="flex flex-col gap-2">
      ${items}
    </div>
  </div>
</section>`;
}

export default timelineAbout;
