import Link from 'next/link';
import type { Metadata } from 'next';
import { POSTS } from '@/lib/blog/posts';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra Blog — AI Workforce Strategy for Agencies',
  description: 'Learn how to grow your business with AI workers. Guides on deployment, pricing, voice AI, and industry-specific use cases.',
  openGraph: { title: 'Kyra AI Blog — Agency Growth Guides', url: 'https://kyra.conversionsystem.com/blog' },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <PublicNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            Agency Playbook
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">Grow your agency with AI.</h1>
          <p className="text-slate-400 text-lg">Practical guides on deploying AI workers, pricing your offer, and scaling recurring revenue.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {POSTS.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`}
              className="group bg-white/5 hover:bg-white/8 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all block">
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="text-3xl">{post.emoji}</span>
                <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-full shrink-0">{post.category}</span>
              </div>
              <h2 className="font-bold text-white text-lg leading-tight mb-2 group-hover:text-indigo-300 transition">
                {post.title}
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{post.description}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <span>·</span>
                <span>{post.readMins} min read</span>
                <span className="ml-auto text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
                  Read →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-indigo-950/50 border border-indigo-500/20 p-8 text-center">
          <p className="text-xl font-bold mb-2">Ready to add AI workers to your agency?</p>
          <p className="text-slate-400 mb-6 text-sm">Free to start. Powered by OpenClaw. First AI live in under 2 minutes.</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/solo" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition">
              Get Started Free →
            </Link>
            <Link href="/try/dental" className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium px-6 py-3 rounded-xl transition text-sm">
              Try live demo
            </Link>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
