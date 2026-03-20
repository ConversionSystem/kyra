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

export function teamGridAbout(data: AboutData): string {
  const heading = data.heading || 'Meet Our Team';
  const body = data.body || '';
  const hasRealMembers = data.teamMembers && data.teamMembers.length > 0;

  // If no real team members, show owner story card instead
  if (!hasRealMembers) {
    const ownerName = data.ownerName || 'Our Founder';
    const ownerStory = data.ownerStory || data.body || 'Dedicated to providing exceptional service and building lasting relationships with every client we serve.';

    const ownerPhoto = data.photoUrl
      ? `<img src="${data.photoUrl}" alt="${ownerName}" class="w-24 h-24 rounded-full object-cover shadow" />`
      : `<div class="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold shadow" style="background: linear-gradient(135deg, ${data.colors.primary}, ${data.colors.secondary}); color: #ffffff;">${ownerName.charAt(0).toUpperCase()}</div>`;

    return `<section class="py-16 sm:py-24" style="background: #ffffff;" aria-label="About the Owner">
  <div class="max-w-3xl mx-auto px-4 sm:px-6">
    <div class="rounded-2xl shadow-lg p-8 sm:p-12 text-center" style="background: #f9fafb; border: 1px solid #e5e7eb;">
      <div class="flex justify-center mb-6">${ownerPhoto}</div>
      <h2 class="text-2xl sm:text-3xl font-bold mb-2" style="color: #1f2937;">${ownerName}</h2>
      <p class="text-sm font-semibold uppercase tracking-wide mb-4" style="color: ${data.colors.primary};">Owner</p>
      <p class="text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style="color: #6b7280;">${ownerStory}</p>
    </div>
  </div>
</section>`;
  }

  // Render real team members grid
  const cards = data.teamMembers!.map((m) => {
    const photo = m.photoUrl
      ? `<img src="${m.photoUrl}" alt="${m.name}" class="w-full h-full object-cover" />`
      : `<div class="w-full h-full flex items-center justify-center text-2xl font-bold" style="background: linear-gradient(135deg, ${data.colors.primary}, ${data.colors.secondary}); color: #ffffff;">${m.name.charAt(0).toUpperCase()}</div>`;

    return `<div class="rounded-2xl shadow-md overflow-hidden text-center" style="background: #ffffff;">
      <div class="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden mx-auto mt-6" style="border: 3px solid #e5e7eb;">
        ${photo}
      </div>
      <div class="p-4 pb-6">
        <h3 class="text-lg font-semibold" style="color: #1f2937;">${m.name}</h3>
        <p class="text-sm mt-1" style="color: ${data.colors.primary};">${m.role}</p>
      </div>
    </div>`;
  }).join('');

  return `<section class="py-16 sm:py-24" style="background: #ffffff;" aria-label="Our Team">
  <div class="max-w-6xl mx-auto px-4 sm:px-6">
    <h2 class="text-3xl sm:text-4xl font-bold text-center mb-4" style="color: #1f2937;">${heading}</h2>
    ${body ? `<p class="text-center text-lg mb-12 max-w-2xl mx-auto" style="color: #6b7280;">${body}</p>` : '<div class="mb-12"></div>'}
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 sm:gap-10">
      ${cards}
    </div>
  </div>
</section>`;
}

export default teamGridAbout;
