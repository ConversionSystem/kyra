import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import type { Metadata } from 'next';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import { getPost, generateStaticParams as getStaticParams, POSTS } from '@/lib/blog/posts';

export { getStaticParams as generateStaticParams };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: 'Not found' };
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      url: `https://kyra.conversionsystem.com/blog/${slug}`,
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = POSTS.filter(p => p.slug !== slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            author: { '@type': 'Organization', name: 'Conversion System' },
            publisher: { '@type': 'Organization', name: 'Kyra AI', url: 'https://kyra.conversionsystem.com' },
          }),
        }}
      />

      <PublicNav />

      <article className="max-w-3xl mx-auto px-4 py-16">
        {/* Back */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-8">
          <ArrowLeft className="h-4 w-4" /> All articles
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{post.emoji}</span>
            <span className="text-xs text-slate-500 bg-white/5 px-3 py-1.5 rounded-full">{post.category}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4">{post.title}</h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-4">{post.description}</p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span>·</span>
            <Clock className="h-3 w-3" />
            <span>{post.readMins} min read</span>
            <span>·</span>
            <span>Kyra AI Blog</span>
          </div>
        </div>

        {/* Content */}
        <div
          className="prose prose-invert prose-sm sm:prose-base max-w-none
            prose-headings:font-black prose-headings:text-white
            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-slate-300 prose-p:leading-relaxed
            prose-li:text-slate-300
            prose-strong:text-white
            prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-indigo-500/50 prose-blockquote:bg-white/5 prose-blockquote:rounded-xl prose-blockquote:py-1 prose-blockquote:not-italic
            prose-ol:text-slate-300 prose-ul:text-slate-300"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div className="mt-12 rounded-2xl bg-indigo-950/50 border border-indigo-500/20 p-8 text-center">
          <p className="text-xl font-bold mb-2">Try it yourself — free</p>
          <p className="text-slate-400 mb-6 text-sm">No credit card. Works with GoHighLevel. First AI employee live in 10 minutes.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup/agency" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition">
              Start Free →
            </Link>
            <Link href="/try/dental" className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium px-6 py-3 rounded-xl transition text-sm">
              See live demo
            </Link>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-bold mb-4 text-slate-300">More to read</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`}
                  className="bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl p-4 transition group">
                  <span className="text-2xl mb-2 block">{p.emoji}</span>
                  <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition leading-tight">{p.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{p.readMins} min read</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
      <PublicFooter />
    </div>
  );
}
