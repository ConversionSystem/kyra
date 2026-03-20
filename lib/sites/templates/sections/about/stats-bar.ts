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

export function statsBarAbout(data: AboutData): string {
  const stats: Array<{ value: string; label: string }> = [];

  if (data.yearsInBusiness) {
    stats.push({ value: `${data.yearsInBusiness}+`, label: 'Years in Business' });
  }
  if (data.rating) {
    stats.push({ value: String(data.rating), label: 'Star Rating' });
  }
  if (data.reviewCount) {
    stats.push({ value: `${data.reviewCount}+`, label: 'Client Reviews' });
  }
  if (data.license) {
    stats.push({ value: data.license, label: 'Licensed & Insured' });
  }

  // Provide defaults if no stats were supplied
  if (stats.length === 0) {
    stats.push(
      { value: '10+', label: 'Years in Business' },
      { value: '4.9', label: 'Star Rating' },
      { value: '200+', label: 'Client Reviews' },
    );
  }

  const cells = stats.map((s) =>
    `<div class="flex flex-col items-center px-4 py-2">
      <span class="text-3xl sm:text-4xl font-bold" style="color: var(--color-surface);">${s.value}</span>
      <span class="text-xs sm:text-sm mt-1 uppercase tracking-wide font-medium" style="color: var(--color-surface); opacity: 0.8;">${s.label}</span>
    </div>`
  ).join('');

  return `<section class="w-full" style="background: var(--color-primary);" aria-label="Business stats">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
    <div class="flex flex-wrap justify-center gap-8 sm:gap-16">
      ${cells}
    </div>
  </div>
</section>`;
}

export default statsBarAbout;
