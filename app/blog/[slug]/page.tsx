import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
import type { Metadata } from 'next';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import { getPost, generateStaticParams as getStaticParams, POSTS } from '@/lib/blog/posts';

export { getStaticParams as generateStaticParams };

// Default author for all posts. When we add per-post author later, add an
// optional `author` field on BlogPost and fall back to this.
const DEFAULT_AUTHOR = {
  name: 'The Kyra Team',
  role: 'Conversion System',
  bio: 'We build white-label AI workforce infrastructure for digital agencies on top of OpenClaw. We publish practical guides on deploying AI agents, self-hosted AI, and multi-channel workforce design.',
  url: 'https://conversionsystem.com',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: 'Not found' };
  const url = `https://kyra.conversionsystem.com/blog/${slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    keywords: [
      post.category,
      'AI worker',
      'AI agent',
      'white-label AI',
      'agency AI platform',
      'OpenClaw',
      'Kyra',
    ],
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [DEFAULT_AUTHOR.name],
      url,
      siteName: 'Kyra AI',
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

  // Related posts: pick 2 others that share the pillar/category first, fall back to most recent
  const related = (() => {
    const sameCategory = POSTS.filter(p => p.slug !== slug && p.category === post.category);
    const others = POSTS.filter(p => p.slug !== slug && p.category !== post.category);
    const sorted = [...sameCategory, ...others].sort((a, b) => b.date.localeCompare(a.date));
    return sorted.slice(0, 3);
  })();

  const wordCount = post.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* JSON-LD — rich schema for SEO + GEO (AI citation surfacing) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            dateModified: post.date,
            articleSection: post.category,
            wordCount,
            inLanguage: 'en-US',
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://kyra.conversionsystem.com/blog/${slug}`,
            },
            author: {
              '@type': 'Organization',
              name: DEFAULT_AUTHOR.name,
              url: DEFAULT_AUTHOR.url,
            },
            publisher: {
              '@type': 'Organization',
              name: 'Kyra AI',
              url: 'https://kyra.conversionsystem.com',
              logo: {
                '@type': 'ImageObject',
                url: 'https://kyra.conversionsystem.com/favicon.ico',
              },
            },
          }),
        }}
      />

      <PublicNav />

      <article className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Back */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> All articles
        </Link>

        {/* Header */}
        <header className="mb-10 border-b border-gray-200 pb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl" aria-hidden="true">{post.emoji}</span>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
              {post.category}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight mb-4 text-gray-900">
            {post.title}
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed mb-6">{post.description}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <Calendar className="h-3.5 w-3.5" />
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </time>
            <span>·</span>
            <Clock className="h-3.5 w-3.5" />
            <span>{post.readMins} min read</span>
            <span>·</span>
            <span>{wordCount.toLocaleString()} words</span>
            <span>·</span>
            <span>By <span className="font-semibold text-gray-700">{DEFAULT_AUTHOR.name}</span></span>
          </div>
        </header>

        {/* Content — light theme, reading-optimized */}
        <div
          className="prose prose-base sm:prose-lg max-w-none
            prose-headings:font-bold prose-headings:text-gray-900 prose-headings:tracking-tight
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-2
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-gray-700 prose-p:leading-[1.75]
            prose-li:text-gray-700 prose-li:my-1
            prose-strong:text-gray-900 prose-strong:font-semibold
            prose-a:text-indigo-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline hover:prose-a:text-indigo-700
            prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-gray-700
            prose-code:text-indigo-700 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:border prose-pre:border-gray-200
            prose-table:text-sm prose-table:border prose-table:border-gray-200 prose-table:rounded-lg prose-table:overflow-hidden
            prose-th:bg-gray-50 prose-th:text-gray-900 prose-th:font-semibold prose-th:px-4 prose-th:py-2 prose-th:border-b prose-th:border-gray-200
            prose-td:text-gray-700 prose-td:px-4 prose-td:py-2 prose-td:border-b prose-td:border-gray-100
            prose-ol:text-gray-700 prose-ul:text-gray-700
            prose-em:text-gray-600"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Author byline footer (E-E-A-T signal for GEO) */}
        <div className="mt-16 rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg">
              K
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{DEFAULT_AUTHOR.name}</p>
              <p className="text-xs text-gray-500 mb-2">{DEFAULT_AUTHOR.role}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{DEFAULT_AUTHOR.bio}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 text-center text-white">
          <p className="text-2xl font-bold mb-2">Try Kyra free</p>
          <p className="text-indigo-100 mb-6 text-sm">No credit card. Powered by OpenClaw. First AI worker live in under 2 minutes.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/solo"
              className="bg-white hover:bg-gray-50 text-indigo-700 font-bold px-6 py-3 rounded-xl transition"
            >
              Start Free →
            </Link>
            <Link
              href="/try/dental"
              className="bg-indigo-500/40 hover:bg-indigo-500/60 border border-white/30 text-white font-medium px-6 py-3 rounded-xl transition text-sm"
            >
              See live demo
            </Link>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Related reading</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map(p => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="bg-white hover:bg-gray-50 border border-gray-200 hover:border-indigo-300 rounded-xl p-5 transition group"
                >
                  <span className="text-2xl mb-2 block" aria-hidden="true">{p.emoji}</span>
                  <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">{p.category}</p>
                  <p className="text-base font-bold text-gray-900 group-hover:text-indigo-700 transition leading-snug mb-1">
                    {p.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{p.readMins} min read</p>
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
