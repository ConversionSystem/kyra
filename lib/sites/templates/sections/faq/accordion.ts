interface FaqData {
  heading?: string;
  faqs: Array<{ question: string; answer: string }>;
}

export function accordionFaq(data: FaqData): string {
  const heading = data.heading || 'Frequently Asked Questions';

  const items = data.faqs.map(faq => `
    <details class="group rounded-lg" style="border: 1px solid var(--color-border);">
      <summary class="flex items-center justify-between cursor-pointer px-6 py-4 text-lg font-medium select-none list-none" style="color: var(--color-text);">
        <span>${faq.question}</span>
        <span class="ml-4 text-xl transition-transform group-open:rotate-45" style="color: var(--color-primary);">+</span>
      </summary>
      <div class="px-6 pb-4 text-base leading-relaxed" style="color: var(--color-text-muted);">${faq.answer}</div>
    </details>`).join('');

  return `<section class="py-16 px-4" style="background: var(--color-surface);" aria-label="FAQ">
  <div class="max-w-3xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-10" style="color: var(--color-text);">${heading}</h2>
    <div class="space-y-3">
      ${items}
    </div>
  </div>
</section>`;
}

export default accordionFaq;
