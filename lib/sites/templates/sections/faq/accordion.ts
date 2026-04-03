interface FaqData {
  heading?: string;
  faqs: Array<{ question: string; answer: string }>;
  colors: { primary: string; secondary: string };
  designStyle?: string;
}

export function accordionFaq(data: FaqData): string {
  const isDark = data.designStyle === 'modern-dark';
  if (isDark) return modernDarkFaq(data);
  return lightFaq(data);
}

function modernDarkFaq(data: FaqData): string {
  const heading = data.heading || 'Frequently Asked Questions';
  const { primary } = data.colors;

  const items = data.faqs.map(faq => `
    <details style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 0.75rem; overflow: hidden; transition: border-color 0.2s;" onmouseover="this.style.borderColor='rgba(220,38,38,0.2)'" onmouseout="if(!this.open)this.style.borderColor='rgba(255,255,255,0.08)'">
      <summary style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 1.25rem 1.5rem; font-size: 1rem; font-weight: 700; color: #f1f5f9; list-style: none; user-select: none; gap: 1rem;" class="faq-summary-dark">
        <span>${faq.question}</span>
        <span class="faq-icon-dark" style="color: ${primary}; font-size: 1.5rem; line-height: 1; flex-shrink: 0; transition: transform 0.25s;">+</span>
      </summary>
      <div style="padding: 0 1.5rem 1.25rem; color: #94a3b8; font-size: 0.95rem; line-height: 1.75; border-top: 1px solid rgba(255,255,255,0.06);">${faq.answer}</div>
    </details>`).join('');

  return `<style>
  details[open] .faq-icon-dark { transform: rotate(45deg); }
  details .faq-summary-dark::-webkit-details-marker { display: none; }
</style>
<section style="padding: 5rem 1.5rem; background: #0f172a;" aria-label="FAQ">
  <div style="max-width: 760px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 3rem;">
      <div style="display: inline-block; background: ${primary}20; color: ${primary}; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 16px; border-radius: 100px; margin-bottom: 1rem; border: 1px solid ${primary}30;">FAQ</div>
      <h2 style="font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; color: #f1f5f9; margin: 0; letter-spacing: -0.02em;">${heading}</h2>
    </div>
    <div>
      ${items}
    </div>
  </div>
</section>`;
}

function lightFaq(data: FaqData): string {
  const heading = data.heading || 'Frequently Asked Questions';
  const { primary } = data.colors;

  const items = data.faqs.map(faq => `
    <details class="rounded-xl shadow-md mb-3" style="background: var(--color-surface);">
      <summary class="flex items-center justify-between cursor-pointer px-6 py-4 text-lg font-semibold select-none list-none" style="color: #1f2937;">
        <span>${faq.question}</span>
        <span class="faq-icon ml-4 text-xl transition-transform" style="color: ${primary};">+</span>
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
