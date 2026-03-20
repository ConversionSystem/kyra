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

export function teamGridAbout(data: AboutData): string {
  const heading = data.heading || 'Meet Our Team';
  const body = data.body || '';

  let members = data.teamMembers;
  if (!members || members.length === 0) {
    members = [
      { name: data.ownerName || 'Alex Johnson', role: 'Founder & Lead', photoUrl: data.photoUrl },
      { name: 'Jamie Rivera', role: 'Operations Manager' },
      { name: 'Sam Patel', role: 'Senior Specialist' },
      { name: 'Morgan Lee', role: 'Client Relations' },
    ];
  }

  const cards = members.map((m) => {
    const photo = m.photoUrl
      ? `<img src="${m.photoUrl}" alt="${m.name}" class="w-full h-full object-cover" />`
      : `<div class="w-full h-full flex items-center justify-center" style="background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));">
          <svg class="w-12 h-12 opacity-30" style="color: var(--color-surface);" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
        </div>`;

    return `<div class="flex flex-col items-center text-center">
      <div class="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden mb-4" style="border: 3px solid var(--color-border);">
        ${photo}
      </div>
      <h3 class="text-lg font-semibold" style="color: var(--color-text);">${m.name}</h3>
      <p class="text-sm mt-1" style="color: var(--color-text-muted);">${m.role}</p>
    </div>`;
  }).join('');

  return `<section class="py-16 sm:py-24" style="background: var(--color-surface);" aria-label="Our Team">
  <div class="max-w-6xl mx-auto px-4 sm:px-6">
    <h2 class="text-3xl sm:text-4xl font-bold text-center mb-4" style="color: var(--color-text);">${heading}</h2>
    ${body ? `<p class="text-center text-lg mb-12 max-w-2xl mx-auto" style="color: var(--color-text-muted);">${body}</p>` : '<div class="mb-12"></div>'}
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 sm:gap-10">
      ${cards}
    </div>
  </div>
</section>`;
}

export default teamGridAbout;
