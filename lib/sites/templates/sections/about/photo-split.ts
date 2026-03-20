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
  const story = data.ownerStory || data.body || 'We are passionate about delivering exceptional service to every client. Our commitment to quality and attention to detail sets us apart.';

  const photo = data.photoUrl
    ? `<img src="${data.photoUrl}" alt="${ownerName}" class="w-full h-full object-cover" />`
    : `<div class="w-full h-full flex items-center justify-center" style="background: linear-gradient(135deg, ${data.colors.primary}, ${data.colors.secondary});">
        <svg class="w-24 h-24 opacity-30" fill="#ffffff" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
      </div>`;

  const statBoxes: string[] = [];
  if (data.yearsInBusiness) {
    statBoxes.push(`<div class="rounded-xl p-4 text-center" style="background: #f9fafb;">
      <span class="block text-2xl font-bold" style="color: ${data.colors.primary};">${data.yearsInBusiness}+</span>
      <span class="text-sm" style="color: #6b7280;">Years Experience</span>
    </div>`);
  }
  if (data.rating) {
    statBoxes.push(`<div class="rounded-xl p-4 text-center" style="background: #f9fafb;">
      <span class="block text-2xl font-bold" style="color: ${data.colors.primary};">${data.rating}</span>
      <span class="text-sm" style="color: #6b7280;">Star Rating</span>
    </div>`);
  }
  if (data.reviewCount) {
    statBoxes.push(`<div class="rounded-xl p-4 text-center" style="background: #f9fafb;">
      <span class="block text-2xl font-bold" style="color: ${data.colors.primary};">${data.reviewCount}+</span>
      <span class="text-sm" style="color: #6b7280;">Reviews</span>
    </div>`);
  }
  if (data.license) {
    statBoxes.push(`<div class="rounded-xl p-4 text-center" style="background: #f9fafb;">
      <span class="block text-2xl font-bold" style="color: ${data.colors.primary};">${data.license}</span>
      <span class="text-sm" style="color: #6b7280;">Licensed</span>
    </div>`);
  }

  const statsGrid = statBoxes.length
    ? `<div class="grid grid-cols-2 gap-3 mt-6">${statBoxes.join('')}</div>`
    : '';

  return `<section class="py-16 sm:py-24" style="background: #ffffff;" aria-label="About">
  <div class="max-w-6xl mx-auto px-4 sm:px-6">
    <div class="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
      <div class="w-full md:w-1/2 aspect-[4/5] rounded-2xl overflow-hidden shadow-lg">
        ${photo}
      </div>
      <div class="w-full md:w-1/2">
        <h2 class="text-3xl sm:text-4xl font-bold mb-4" style="color: #1f2937;">${heading}</h2>
        <p class="text-lg font-semibold mb-2" style="color: ${data.colors.primary};">${ownerName}</p>
        <p class="text-base sm:text-lg leading-relaxed mb-6" style="color: #6b7280;">${story}</p>
        ${statsGrid}
      </div>
    </div>
  </div>
</section>`;
}

export default photoSplitAbout;
