'use client';

import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

export function PartnerApplicationForm() {
  const [form, setForm] = useState({
    name: '', email: '', website: '', audience: '',
    ghlTier: '', hearAbout: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/partners/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Submission failed');
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please email angel@conversionsystem.com directly.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12 border-2 border-green-200 rounded-2xl bg-green-50">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-black text-gray-900 mb-2">Application received!</h3>
        <p className="text-gray-600 max-w-sm mx-auto">
          We review applications within 24 hours. You'll get your partner link and onboarding materials via email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-2xl p-7 space-y-5 bg-white shadow-sm">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name *</label>
          <input
            type="text" required value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Your name"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
          <input
            type="email" required value={form.email}
            onChange={e => update('email', e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Website or social profile</label>
        <input
          type="url" value={form.website}
          onChange={e => update('website', e.target.value)}
          placeholder="https://youragency.com or linkedin.com/in/you"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">How would you refer agencies to Kyra? *</label>
        <textarea
          required value={form.audience}
          onChange={e => update('audience', e.target.value)}
          rows={3}
          placeholder="e.g. I run an agency consulting business, have a YouTube channel with 5K subs, or coach agency owners in my mastermind..."
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your CRM platform (if applicable)</label>
        <select
          value={form.ghlTier}
          onChange={e => update('ghlTier', e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
        >
          <option value="">Select...</option>
          <option value="GoHighLevel">GoHighLevel</option>
          <option value="HubSpot">HubSpot</option>
          <option value="Other">Other CRM</option>
          <option value="None">No CRM yet</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">How did you hear about Kyra?</label>
        <input
          type="text" value={form.hearAbout}
          onChange={e => update('hearAbout', e.target.value)}
          placeholder="GHL community, LinkedIn, cold outreach, referral..."
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : 'Apply to Partner Program →'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        By applying you agree to the partner terms. Commission is paid monthly via Stripe. No cap, no expiry.
      </p>
    </form>
  );
}
