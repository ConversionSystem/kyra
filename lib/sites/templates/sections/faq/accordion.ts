interface FaqData {
  heading?: string;
  faqs: Array<{ question: string; answer: string }>;
  colors: { primary: string; secondary: string };
}

export function accordionFaq(data: FaqData): string {
  const heading = data.heading || 'Frequently Asked Questions';

  const items = data.faqs.map(faq => `
    <details class="rounded-xl shadow-md mb-3" style="background: var(--color-surface);">
      <summary class="flex items-center justify-between cursor-pointer px-6 py-4 text-lg font-semibold select-none list-none" style="color: #1f2937;">
        <span>${faq.question}</span>
        <span class="faq-icon ml-4 text-xl transition-transform" style="color: ${data.colors.primary};">+</span>
      </summary>
      <div class="px-6 pb-4 text-base leading-relaxed" style="color: #6b7280;">${faq.answer}</div>
    </details>`).join('');

  return `<style>details[open] summary .faq-icon { transform: rotate(45deg); }</style>
<section class="py-16 sm:py-24 px-4" style="background: var(--color-surface);" aria-label="FAQ">
  <div class="max-w-3xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-10" style="color: #1f2937;">${heading}</h2>
    <div>
      ${items}
    </div>
  </div>
</section>`;
}

export default accordionFaq;
