interface FaqData {
  heading?: string;
  faqs: Array<{ question: string; answer: string }>;
}

export function twoColumnFaq(data: FaqData): string {
  const heading = data.heading || 'Frequently Asked Questions';

  const cards = data.faqs.map(faq => `
    <div class="rounded-xl p-6" style="background: var(--color-surface); border: 1px solid var(--color-border);">
      <h3 class="text-lg font-semibold mb-2" style="color: var(--color-text);">${faq.question}</h3>
      <p class="text-base leading-relaxed" style="color: var(--color-text-muted);">${faq.answer}</p>
    </div>`).join('');

  return `<section class="py-16 px-4" style="background: var(--color-surface);" aria-label="FAQ">
  <div class="max-w-5xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-10" style="color: var(--color-text);">${heading}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${cards}
    </div>
  </div>
</section>`;
}

export default twoColumnFaq;
