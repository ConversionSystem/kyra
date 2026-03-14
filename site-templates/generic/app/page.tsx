import Link from 'next/link';
import {
  Phone, Star, Award, CheckCircle2, ChevronRight, MapPin, ArrowRight, Shield,
  Users, Clock, Scale, MessageCircle,
} from 'lucide-react';
import { BUSINESS, SERVICES, SERVICE_AREAS } from '@/lib/constants';
import { getPageContent, getPagesByType } from '@/lib/content';
import { CTASection } from '@/components/shared/cta-section';
import { TestimonialCard } from '@/components/shared/testimonial-card';
import { SchemaMarkup } from '@/components/shared/schema-markup';
import { faqSchema } from '@/lib/seo';

// Strip markdown artifacts from AI-generated content
function cleanText(s: string): string {
  return s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/gm, '').replace(/^:\s*/, '').trim();
}

// Parse "**Heading**\nbody text\n\n**Heading2**\nbody text" into structured blocks
function parseSubSections(body: string): { title: string; text: string }[] {
  const blocks: { title: string; text: string }[] = [];
  // Split on double newlines or bold markers
  const raw = body.split(/\n\s*\n/).filter(Boolean);

  let current: { title: string; text: string } | null = null;
  for (const chunk of raw) {
    const lines = chunk.split('\n').filter(Boolean);
    for (const line of lines) {
      const boldMatch = line.match(/^\*\*(.+?)\*\*\s*$/);
      if (boldMatch) {
        if (current) blocks.push(current);
        current = { title: cleanText(boldMatch[1]), text: '' };
      } else if (current) {
        current.text += (current.text ? ' ' : '') + cleanText(line);
      } else {
        // No bold heading yet, create untitled block
        current = { title: '', text: cleanText(line) };
      }
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

// Pick an icon for a "Why Choose Us" reason based on keywords
const REASON_ICONS = [Scale, Users, Shield, Clock, Star, MessageCircle, Award, CheckCircle2];

export default function HomePage() {
  const page = getPageContent('/');

  const heroH1 = cleanText(page?.heroH1 || `Welcome to ${BUSINESS.name}`);
  const heroSubtitle = cleanText(page?.heroSubtitle || BUSINESS.tagline);
  // Keep raw body for sub-section parsing (needs ** markers intact)
  const rawSections = (page?.sections || []).map(s => ({
    ...s,
    heading: cleanText(s.heading || ''),
    rawBody: s.body || '',
    body: cleanText(s.body || ''),
    bullets: s.bullets?.map((b: string) => cleanText(b)) || [],
  }));
  const testimonials = page?.testimonials || [];
  const faqs = page?.faq || [];

  // Categorize sections by type
  const servicesOverview = rawSections.find(s => s.heading.toLowerCase().includes('services overview'));
  const whyChooseUs = rawSections.find(s => s.heading.toLowerCase().includes('why choose'));
  const socialProof = rawSections.find(s => s.heading.toLowerCase().includes('social proof') || s.heading.toLowerCase().includes('testimonial'));
  const serviceArea = rawSections.find(s => s.heading.toLowerCase().includes('service area'));
  const knownTypes = [servicesOverview, whyChooseUs, socialProof, serviceArea].filter(Boolean);
  const otherSections = rawSections.filter(s => !knownTypes.includes(s));

  // Parse sub-sections from RAW body (needs ** markers intact)
  const servicesBlocks = servicesOverview ? parseSubSections(servicesOverview.rawBody) : [];
  const reasonBlocks = whyChooseUs ? parseSubSections(whyChooseUs.rawBody) : [];
  const socialText = socialProof ? cleanText(socialProof.body) : '';
  const areaText = serviceArea ? cleanText(serviceArea.body) : '';

  // Build service descriptions from service pages
  const servicePages = getPagesByType('service');
  const serviceDescriptions: Record<string, string> = {};
  for (const sp of servicePages) {
    const slug = sp.slug.replace('/services/', '');
    if (sp.metaDescription) {
      serviceDescriptions[slug] = cleanText(sp.metaDescription);
    } else if (sp.sections?.[0]?.body) {
      serviceDescriptions[slug] = cleanText(sp.sections[0].body).slice(0, 150) + '...';
    }
  }

  return (
    <main>
      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.15),transparent_60%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {BUSINESS.license && (
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-400 font-medium">{BUSINESS.license}</span>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-4xl">
            {heroH1}
          </h1>

          <p className="mt-4 text-lg text-gray-400 max-w-2xl">{heroSubtitle}</p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            {BUSINESS.rating > 0 && BUSINESS.reviewCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-gray-300">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold">{BUSINESS.rating}</span> Rating ({BUSINESS.reviewCount} reviews)
              </div>
            )}
            {BUSINESS.yearsInBusiness > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-gray-300">
                <Award className="h-4 w-4 text-red-500" />
                {BUSINESS.yearsInBusiness}+ Years Experience
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <a
              href={BUSINESS.phoneHref}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl text-lg font-semibold transition shadow-lg shadow-red-600/25"
            >
              <Phone className="h-5 w-5" />
              Call Now - {BUSINESS.phone}
            </a>
            <a
              href="/contact"
              className="flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl text-lg font-medium transition"
            >
              Contact Us
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-white/10 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {BUSINESS.yearsInBusiness > 0 && (
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-red-500">{BUSINESS.yearsInBusiness}+</div>
                <div className="text-sm text-gray-400 mt-1">Years Experience</div>
              </div>
            )}
            {BUSINESS.rating > 0 && (
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-red-500">{BUSINESS.rating}</div>
                <div className="text-sm text-gray-400 mt-1">Star Rating</div>
              </div>
            )}
            {SERVICES.length > 0 && (
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-red-500">{SERVICES.length}</div>
                <div className="text-sm text-gray-400 mt-1">Practice Areas</div>
              </div>
            )}
            {SERVICE_AREAS.length > 0 ? (
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-red-500">{SERVICE_AREAS.length}+</div>
                <div className="text-sm text-gray-400 mt-1">Areas Served</div>
              </div>
            ) : BUSINESS.reviewCount > 0 ? (
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-red-500">{BUSINESS.reviewCount}+</div>
                <div className="text-sm text-gray-400 mt-1">Client Reviews</div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Our Services</h2>
            <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
              Comprehensive solutions tailored to your needs. Explore our areas of expertise.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(SERVICES as readonly { name: string; slug: string; description: string }[]).map((svc) => (
              <Link
                key={svc.slug}
                href={`/services/${svc.slug}`}
                className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-red-500/30 hover:bg-white/[0.07] transition-all"
              >
                <h3 className="text-lg font-semibold text-white mb-2">{svc.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{svc.description || serviceDescriptions[svc.slug] || ''}</p>
                <div className="flex items-center gap-1 mt-auto text-red-400 text-sm font-medium group-hover:text-red-300 transition">
                  Learn More <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            ))}

            {/* Phone CTA card */}
            <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 flex flex-col justify-center">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Need Help Now?</h3>
              <p className="text-sm text-red-100 mb-6">
                Call us today for immediate assistance. We are ready to help.
              </p>
              <a
                href={BUSINESS.phoneHref}
                className="flex items-center justify-center gap-2 bg-white text-red-600 px-4 py-3 rounded-xl font-semibold hover:bg-red-50 transition"
              >
                <Phone className="h-4 w-4" />
                {BUSINESS.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Deep-Dive — parsed from "Services Overview" AI content */}
      {servicesBlocks.length > 0 && (
        <section className="py-20 sm:py-28 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white">What We Handle</h2>
              <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
                A closer look at the {SERVICES.length > 0 ? SERVICES.length : ''} areas where we can help.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {servicesBlocks.filter(b => b.title && b.text).map((block, idx) => {
                const matchingService = SERVICES.find(s =>
                  s.name.toLowerCase() === block.title.toLowerCase() ||
                  block.title.toLowerCase().includes(s.name.toLowerCase())
                );
                const href = matchingService ? `/services/${matchingService.slug}` : undefined;
                return (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center shrink-0 mt-1">
                        <Scale className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-white mb-2">{block.title}</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">{block.text}</p>
                        {href && (
                          <Link href={href} className="inline-flex items-center gap-1 mt-3 text-red-400 text-sm font-medium hover:text-red-300 transition">
                            Learn more <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us — parsed from AI content into cards */}
      {reasonBlocks.length > 0 && (
        <section className="py-20 sm:py-28 bg-gray-900/50 border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white">Why Choose {BUSINESS.name}</h2>
              <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
                What sets us apart from others in {BUSINESS.address.split(',').slice(-2, -1)[0]?.trim() || 'the area'}.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {reasonBlocks.filter(b => b.title && b.text).map((block, idx) => {
                const Icon = REASON_ICONS[idx % REASON_ICONS.length];
                return (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center shrink-0 mt-1">
                        <Icon className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">{block.title}</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">{block.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Social Proof / Reviews Section */}
      {(socialText || testimonials.length > 0) && (
        <section className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-white">What Our Clients Say</h2>
              {BUSINESS.rating > 0 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 ${star <= Math.round(BUSINESS.rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`}
                    />
                  ))}
                  <span className="text-gray-400 ml-2">
                    {BUSINESS.rating}/5
                    {BUSINESS.reviewCount > 0 && ` (${BUSINESS.reviewCount} reviews)`}
                  </span>
                </div>
              )}
            </div>

            {testimonials.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {testimonials.map((t) => (
                  <TestimonialCard key={t.name} name={t.name} text={t.text} rating={t.rating} />
                ))}
              </div>
            ) : socialText ? (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                  <MessageCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
                  <p className="text-gray-300 leading-relaxed">{socialText}</p>
                  <a
                    href={BUSINESS.phoneHref}
                    className="inline-flex items-center gap-2 mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition"
                  >
                    <Phone className="h-4 w-4" />
                    Call {BUSINESS.phone}
                  </a>
                </div>
              </div>
            ) : null}

            {testimonials.length > 0 && (
              <div className="text-center mt-10">
                <Link
                  href="/reviews"
                  className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-medium transition"
                >
                  See All Reviews <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Service Area (text) — only if no dedicated areas grid */}
      {areaText && (SERVICE_AREAS as readonly unknown[]).length === 0 && (
        <section className="py-20 sm:py-28 bg-gray-900/50 border-y border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <MapPin className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Where We Serve</h2>
            <p className="text-gray-400 leading-relaxed">{areaText}</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 mt-8 border border-white/20 hover:bg-white/5 text-white px-6 py-3 rounded-xl font-medium transition"
            >
              <MapPin className="h-4 w-4" />
              Get Directions
            </Link>
          </div>
        </section>
      )}

      {/* Service Areas Grid — if areas exist */}
      {SERVICE_AREAS.length > 0 && (
        <section className="py-20 sm:py-28 bg-gray-900/50 border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Areas We Serve</h2>
              <p className="text-gray-400 max-w-2xl">
                {areaText || 'Proudly serving clients across multiple locations. Contact us to learn more about our services in your area.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {SERVICE_AREAS.map((area) => (
                <Link
                  key={area.slug}
                  href={`/${area.slug}`}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-red-400 transition bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  {area.name}, {area.state}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Any other sections the AI generated that aren't one of the known types */}
      {otherSections.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            {otherSections.map((section, idx) => (
              <div key={idx}>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 text-center">{section.heading}</h2>
                {section.body && (
                  <div className="max-w-3xl mx-auto space-y-4 mb-8">
                    {cleanText(section.body).split('\n').filter(Boolean).map((para, pIdx) => (
                      <p key={pIdx} className="text-gray-400 leading-relaxed text-center">{para}</p>
                    ))}
                  </div>
                )}
                {section.bullets && section.bullets.length > 0 && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    {section.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-red-500 shrink-0" />
                        <span className="text-gray-300">{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <CTASection />

      {faqs.length > 0 && <SchemaMarkup data={faqSchema(faqs)} />}
    </main>
  );
}
