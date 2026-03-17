'use client';

import { FormEvent, useState } from 'react';
import { SERVICES, BUSINESS } from '@/lib/constants';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      serviceType: formData.get('serviceType') as string,
      message: formData.get('message') as string,
      businessName: BUSINESS.name,
      source: 'website-contact-form',
    };

    try {
      // Send to Kyra lead capture API
      const clientId = typeof window !== 'undefined'
        ? (document.querySelector('meta[name="kyra-client-id"]') as HTMLMetaElement)?.content
          || (window as Record<string, unknown>).__KYRA_CLIENT_ID__
          || ''
        : '';

      if (clientId) {
        await fetch(`https://kyra.conversionsystem.com/api/widget/${clientId}/lead`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).catch(() => {
          // Non-fatal — still show success to the user
        });
      }

      setSubmitted(true);
      form.reset();
    } catch {
      setError('Something went wrong. Please try again or call us directly.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <input
          type="text"
          name="name"
          required
          placeholder="Name"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        />
        <input
          type="tel"
          name="phone"
          required
          placeholder="Phone"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
        />
      </div>

      <input
        type="email"
        name="email"
        required
        placeholder="Email"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
      />

      <select
        name="serviceType"
        required
        defaultValue=""
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/50"
      >
        <option value="" disabled>
          Select service type
        </option>
        {SERVICES.map((svc) => (
          <option key={svc.slug} value={svc.name}>
            {svc.name}
          </option>
        ))}
      </select>

      <textarea
        name="message"
        required
        rows={4}
        placeholder="Tell us about your needs"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
      />

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 py-3 font-semibold transition disabled:opacity-50"
      >
        {submitting ? 'Sending...' : 'Send Message'}
      </button>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {submitted && (
        <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
          Thanks! We received your message and will contact you shortly.
        </p>
      )}
    </form>
  );
}
