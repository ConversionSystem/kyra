import Link from 'next/link';
import type { Metadata } from 'next';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Privacy Policy — Kyra AI',
  description: 'How Kyra collects, uses, and protects your data.',
};

const LAST_UPDATED = 'February 22, 2026';
const COMPANY = 'Conversion System';
const EMAIL = 'angel@conversionsystem.com';
const WEBSITE = 'kyra.conversionsystem.com';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <PublicNav />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 prose prose-invert prose-sm max-w-none">
        <h1 className="text-3xl font-black mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: {LAST_UPDATED}</p>

        <p className="text-slate-300 leading-relaxed mb-8">
          {COMPANY} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates Kyra ({WEBSITE}). This Privacy Policy explains how we collect, use, disclose, and protect information about you when you use our platform.
        </p>

        {[
          {
            title: '1. Information We Collect',
            content: [
              'Account information: email address, name, and password when you create an account.',
              'Agency and client data: business names, industry types, AI personality configurations, and GHL integration tokens you provide.',
              'Conversation data: AI-generated responses and incoming messages processed through connected channels (GHL SMS, web chat, etc.) are stored to power analytics and conversation history.',
              'Usage data: page views, feature usage, and session information collected automatically.',
              'Payment information: billing is handled by Stripe; we do not store credit card numbers.',
              'Lead capture: email addresses submitted via the landing page interest form.',
            ],
          },
          {
            title: '2. How We Use Your Information',
            content: [
              'To provide, operate, and improve the Kyra platform.',
              'To generate AI responses on behalf of your configured AI workers.',
              'To send transactional emails (account confirmations, escalation alerts, weekly reports) when a Resend API key is configured.',
              'To process payments and manage subscriptions via Stripe.',
              'To monitor platform health and debug issues.',
              'To communicate platform updates and product announcements (opt-out available).',
            ],
          },
          {
            title: '3. Data Sharing',
            content: [
              'We do not sell your personal data.',
              'OpenAI: AI responses are generated via the OpenAI API. Messages processed by Kyra may be sent to OpenAI subject to their privacy policy.',
              'GoHighLevel: Integration with GHL requires sharing your private integration token; GHL processes messages on their infrastructure.',
              'Stripe: Payment processing and subscription management.',
              'Supabase: Database hosting for account and conversation data.',
              'Vercel: Application hosting and infrastructure.',
              'Resend: Email delivery (only when configured by the account holder).',
            ],
          },
          {
            title: '4. Data Retention',
            content: [
              'Conversation logs are retained for 90 days by default.',
              'Account data is retained while your account is active.',
              'You may request deletion of your data at any time by emailing ' + EMAIL + '.',
            ],
          },
          {
            title: '5. Security',
            content: [
              'We use industry-standard security practices including HTTPS encryption, access controls, and isolated per-client infrastructure for AI agents.',
              'API keys and integration tokens are stored encrypted at rest.',
              'No system is 100% secure; we encourage strong passwords and monitoring your account activity.',
            ],
          },
          {
            title: '6. Your Rights (GDPR / CCPA)',
            content: [
              'Access: Request a copy of your personal data.',
              'Correction: Update inaccurate data via your account settings.',
              'Deletion: Request erasure of your account and associated data.',
              'Portability: Request an export of your conversation and configuration data.',
              'Opt-out: Unsubscribe from marketing emails at any time via the link in any email.',
              'To exercise any of these rights, email ' + EMAIL + '.',
            ],
          },
          {
            title: '7. Cookies',
            content: [
              'We use session cookies for authentication and local storage for web chat widget session continuity.',
              'We do not use third-party advertising cookies.',
            ],
          },
          {
            title: '8. Children\'s Privacy',
            content: [
              'Kyra is not directed at children under 13. We do not knowingly collect data from children.',
            ],
          },
          {
            title: '9. Changes to This Policy',
            content: [
              'We may update this policy periodically. Changes will be posted here with an updated date. Continued use of the platform after changes constitutes acceptance.',
            ],
          },
          {
            title: '10. Contact',
            content: [
              'Questions about this policy? Contact us at ' + EMAIL + '.',
            ],
          },
        ].map(section => (
          <div key={section.title} className="mb-8">
            <h2 className="text-lg font-bold text-white mb-3">{section.title}</h2>
            <ul className="space-y-2">
              {section.content.map((item, i) => (
                <li key={i} className="text-slate-300 text-sm leading-relaxed flex gap-2">
                  <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="border-t border-white/10 pt-8 mt-8">
          <p className="text-slate-500 text-sm">
            {COMPANY} · {EMAIL} · <Link href="/terms" className="text-indigo-400 hover:underline">Terms of Service</Link>
          </p>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
