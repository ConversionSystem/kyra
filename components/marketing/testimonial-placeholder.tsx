/**
 * Testimonial component — swap placeholder content for real quotes.
 * Usage: <TestimonialPlaceholder name="..." role="..." quote="..." />
 */
export function TestimonialPlaceholder({
  quote = "Kyra changed how we run our agency. Our clients get instant responses 24/7, and we finally have time to focus on growth instead of putting out fires.",
  name = 'Your Name Here',
  role = 'Agency Owner — First Happy Customer',
}: {
  quote?: string;
  name?: string;
  role?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
      <div className="text-4xl mb-4">&ldquo;</div>
      <p className="text-lg text-gray-700 leading-relaxed mb-6 italic max-w-xl mx-auto">
        {quote}
      </p>
      <div>
        <p className="font-bold text-gray-900">{name}</p>
        <p className="text-sm text-gray-500">{role}</p>
      </div>
    </div>
  );
}
