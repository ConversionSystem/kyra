'use client';

type FAQAccordionProps = {
  items: { question: string; answer: string }[];
};

export function FAQAccordion({ items }: FAQAccordionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <details
          key={item.question}
          className="group bg-black/30 border border-white/10 rounded-xl p-4"
        >
          <summary className="cursor-pointer font-semibold text-white list-none flex items-start justify-between gap-4">
            <span>{item.question}</span>
            <span className="text-red-400 text-lg leading-none group-open:rotate-45 transition shrink-0">
              +
            </span>
          </summary>
          <p className="mt-3 text-gray-300 leading-relaxed">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
