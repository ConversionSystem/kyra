'use client';

import { FormEvent, useState } from 'react';
import { SERVICES } from '@/lib/constants';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    event.currentTarget.reset();
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
        className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 py-3 font-semibold transition"
      >
        Send Message
      </button>

      {submitted && (
        <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
          Thanks! We received your message and will contact you shortly.
        </p>
      )}
    </form>
  );
}
