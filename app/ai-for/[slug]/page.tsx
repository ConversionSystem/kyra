import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import { INDUSTRY_TEMPLATES } from '@/lib/templates/industry-templates';
import DemoChat from '@/app/demo/[industry]/demo-chat';
import RichNichePage, { NICHES, NICHE_SLUGS } from './rich-niches';

// Generate all ~55 pages at build time for SEO (50 template-backed +
// 5 rich-content niches from ./rich-niches, deduped).
export function generateStaticParams() {
  const templateIds = INDUSTRY_TEMPLATES.map((t) => t.id);
  const seen = new Set(templateIds);
  const extras = NICHE_SLUGS.filter((s) => !seen.has(s));
  return [...templateIds, ...extras].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Prefer rich-niche metadata when the slug has hand-authored content.
  const niche = NICHES[slug];
  if (niche) {
    return {
      title: niche.metaTitle,
      description: niche.metaDesc,
      keywords: niche.keywords,
      alternates: {
        canonical: `https://kyra.conversionsystem.com/ai-for/${slug}`,
      },
      openGraph: {
        title: niche.metaTitle,
        description: niche.metaDesc,
        url: `https://kyra.conversionsystem.com/ai-for/${slug}`,
      },
    };
  }

  const template = INDUSTRY_TEMPLATES.find((t) => t.id === slug);
  if (!template) return { title: 'Industry Not Found' };

  const title = `AI Worker for ${template.name} | Kyra — Free During Beta`;
  const description = `Deploy an autonomous AI worker for your ${template.industry.toLowerCase()} business. ${template.description} 50+ templates. Powered by OpenClaw. Free during beta.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://kyra.conversionsystem.com/ai-for/${slug}`,
    },
    alternates: {
      canonical: `https://kyra.conversionsystem.com/ai-for/${slug}`,
    },
  };
}

// Industry-specific demo conversations
function getDemoConversation(template: (typeof INDUSTRY_TEMPLATES)[number]) {
  const name = template.variables?.find((v) => v.key === 'business_name')?.placeholder || 'Your Business';
  const faqs = template.sampleFaqs || [];

  if (faqs.length >= 2) {
    return {
      contactName: 'New Customer',
      businessName: name,
      accentColor: '#4f46e5',
      conversation: [
        { from: 'contact' as const, text: faqs[0].q, delay: 800 },
        { from: 'ai' as const, text: faqs[0].a, delay: 1100 },
        { from: 'contact' as const, text: faqs[1].q, delay: 800 },
        { from: 'ai' as const, text: faqs[1].a, delay: 1000 },
      ],
    };
  }

  return {
    contactName: 'New Customer',
    businessName: name,
    accentColor: '#4f46e5',
    conversation: [
      { from: 'contact' as const, text: `Hi, I'm looking for ${template.industry.toLowerCase()} services.`, delay: 800 },
      { from: 'ai' as const, text: `Welcome! 😊 I'd love to help. What specifically are you looking for?`, delay: 1000 },
    ],
  };
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Rich-content niches (dental, cannabis, fitness, home-services) ship a
  // hand-authored page — render that in preference to the template version.
  const niche = NICHES[slug];
  if (niche) {
    return <RichNichePage niche={slug} data={niche} />;
  }

  const template = INDUSTRY_TEMPLATES.find((t) => t.id === slug);
  if (!template) notFound();

  const demo = getDemoConversation(template);
  const relatedTemplates = INDUSTRY_TEMPLATES.filter(
    (t) => t.id !== slug && t.tags.some((tag) => template.tags.includes(tag)),
  ).slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
      <PublicNav />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-16">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium">
            <span className="bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">New</span>
            {template.emoji} {template.industry} AI Worker
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black leading-[1.05] mb-6 tracking-tight">
              AI worker for{' '}
              <span className="text-indigo-400">{template.industry.toLowerCase()}</span>
              <br />
              that never sleeps.
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed mb-8 max-w-lg">
              {template.description}. Deployed in minutes, runs 24/7 across every channel. No code required.
            </p>

            {/* Tools */}
            <div className="flex flex-wrap gap-2 mb-8">
              {template.suggestedTools.map((tool) => (
                <span key={tool} className="bg-white/10 border border-white/10 text-sm px-3 py-1.5 rounded-full text-slate-300">
                  {tool === 'book_appointment' && '📅 Appointment Booking'}
                  {tool === 'tag_contact' && '🏷️ Contact Tagging'}
                  {tool === 'create_opportunity' && '💰 Deal Creation'}
                  {tool === 'escalate_to_human' && '🚨 Human Escalation'}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/solo"
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-lg px-8 py-4 rounded-xl"
              >
                Deploy This Worker Free →
              </Link>
              <Link
                href="/ai-for"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 transition text-white font-medium px-6 py-4 rounded-xl"
              >
                Browse All 50+ Templates
              </Link>
            </div>
            <p className="text-sm text-slate-500 mt-3">1 free account included · No credit card required</p>
          </div>

          {/* Demo chat */}
          <div className="flex justify-center lg:justify-end">
            <DemoChat
              conversation={demo.conversation}
              contactName={demo.contactName}
              businessName={demo.businessName}
              accentColor={demo.accentColor}
            />
          </div>
        </div>
      </section>

      {/* What this AI worker does */}
      <section className="border-t border-white/10 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-10">
            What your {template.industry.toLowerCase()} AI worker handles
          </h2>

          {/* FAQs as conversation examples */}
          {template.sampleFaqs && template.sampleFaqs.length > 0 && (
            <div className="space-y-4 mb-12">
              {template.sampleFaqs.map((faq, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <p className="text-sm text-slate-400 mb-2">Customer asks:</p>
                  <p className="text-white font-medium mb-3">&quot;{faq.q}&quot;</p>
                  <p className="text-sm text-slate-400 mb-2">AI worker responds:</p>
                  <p className="text-slate-300">&quot;{faq.a}&quot;</p>
                </div>
              ))}
            </div>
          )}

          {/* Automations */}
          {template.automations && template.automations.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-6 text-center">Built-in automations</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {template.automations.map((auto, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h4 className="font-bold text-white mb-1">⚡ {auto.name}</h4>
                    <p className="text-slate-400 text-sm">{auto.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Built-in capabilities */}
      <section className="border-t border-white/10 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-3">
            Every AI worker also includes
          </h2>
          <p className="text-slate-400 text-center mb-10">
            Built-in capabilities that work across all industries.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '⭐', title: 'Review Management', desc: 'Automated review requests after service + AI-drafted responses to incoming reviews.' },
              { icon: '💳', title: 'Payment Collection', desc: 'Send Stripe payment links via SMS — collect deposits, invoices, and fees in-conversation.' },
              { icon: '📊', title: 'Lead Scoring', desc: 'AI scores leads based on conversation signals so your team focuses on the hottest prospects.' },
              { icon: '🌐', title: 'Funnel Building', desc: 'AI-generated landing pages and lead capture forms tailored to your industry.' },
            ].map((cap) => (
              <div key={cap.title} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="text-2xl mb-2">{cap.icon}</div>
                <h3 className="font-bold text-white mb-1">{cap.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related templates */}
      {relatedTemplates.length > 0 && (
        <section className="border-t border-white/10 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-black text-center mb-8">
              Related AI worker templates
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedTemplates.map((t) => (
                <Link
                  key={t.id}
                  href={`/ai-for/${t.id}`}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-indigo-400/40 transition-all"
                >
                  <div className="text-3xl mb-3">{t.emoji}</div>
                  <h3 className="font-bold text-lg mb-1">{t.name}</h3>
                  <p className="text-slate-400 text-sm">{t.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-white/10 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-indigo-600 rounded-2xl p-10">
            <h2 className="text-3xl font-black mb-4">
              Deploy your {template.industry.toLowerCase()} AI worker now
            </h2>
            <p className="text-indigo-200 mb-6">
              Free to start. Live in under 5 minutes. No code needed.
            </p>
            <Link
              href="/solo"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-black text-lg px-10 py-4 rounded-xl hover:bg-indigo-50 transition"
            >
              Try Kyra Free →
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
