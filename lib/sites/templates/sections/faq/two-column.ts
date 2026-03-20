interface FaqData {
  heading?: string;
  faqs: Array<{ question: string; answer: string }>;
  colors: { primary: string; secondary: string };
}

export function twoColumnFaq(data: FaqData): string {
  const heading = data.heading || 'Frequently Asked Questions';

  const cards = data.faqs.map(faq => `
    <div class="rounded-xl shadow-md p-6" style="background: #ffffff;">
      <h3 class="text-lg font-bold mb-2" style="color: ${data.colors.primary};">${faq.question}</h3>
      <p class="text-base leading-relaxed" style="color: #6b7280;">${faq.answer}</p>
    </div>`).join('');

  return `<section class="py-16 sm:py-24 px-4" style="background: #ffffff;" aria-label="FAQ">
  <div class="max-w-5xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-10" style="color: #1f2937;">${heading}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${cards}
    </div>
  </div>
</section>`;
}

export default twoColumnFaq;
