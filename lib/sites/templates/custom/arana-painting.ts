/**
 * Arana Painting custom page assembler.
 *
 * Converts the original Hono/JSX site into static HTML identical to aranapainting.com.
 * All content is driven by `site` / `page` / `allPages` parameters so any painting
 * business can reuse this template through the Kyra dashboard.
 *
 * Design: Navy/gold/teal palette, Montserrat + Source Sans 3 fonts, AOS animations,
 * Font Awesome icons, full-width hero with stats, mobile-responsive.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Default image URLs from the original Arana Painting website
// ---------------------------------------------------------------------------
const IMG = {
  logo: 'https://assets.cdn.filesafe.space/eH9EceMluUOqJLXfRPf1/media/66b5ec9c487a815226a3a7de.png',
  heroBg: 'https://assets.cdn.filesafe.space/c3cmUrbBhdgs54adfIYP/media/646b867161da632943062104.jpeg',
  aboutBg: 'https://assets.cdn.filesafe.space/c3cmUrbBhdgs54adfIYP/media/646b912e163fc903a4203d53.jpeg',
  residential: 'https://assets.cdn.filesafe.space/eH9EceMluUOqJLXfRPf1/media/6788c6613a4480a701efd246.png',
  commercial: 'https://assets.cdn.filesafe.space/eH9EceMluUOqJLXfRPf1/media/6788c661dbd69c21bae1e313.png',
  kitchen: 'https://assets.cdn.filesafe.space/eH9EceMluUOqJLXfRPf1/media/6788c71dc273441d85740776.png',
  hoa: 'https://assets.cdn.filesafe.space/eH9EceMluUOqJLXfRPf1/media/67766fa8d4ebc487e7c48539.png',
  about1: 'https://assets.cdn.filesafe.space/eH9EceMluUOqJLXfRPf1/media/66b5e91b2abf3c66031f20fd.jpeg',
  about2: 'https://assets.cdn.filesafe.space/eH9EceMluUOqJLXfRPf1/media/6788c85b671b4d49b0e7c2ec.jpeg',
  craftsmanship: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=400&fit=crop&q=80',
  seamless: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop&q=80',
  satisfaction: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop&q=80',
  ctaBg: 'https://assets.cdn.filesafe.space/eH9EceMluUOqJLXfRPf1/media/67767fbd1acf695c34d892a4.png',
  googleReview: 'https://assets.cdn.filesafe.space/eH9EceMluUOqJLXfRPf1/media/66bc9de571b5f1f1fa7ec864.png',
  hoaMain: 'https://assets.cdn.filesafe.space/eH9EceMluUOqJLXfRPf1/media/67766fa86e3c74a9a2162843.png',
  kitchenMain: 'https://assets.cdn.filesafe.space/eH9EceMluUOqJLXfRPf1/media/6788c85b671b4d0cc5e7c2eb.jpeg',
  kitchenAfter: 'https://assets.cdn.filesafe.space/eH9EceMluUOqJLXfRPf1/media/6788c85b76959f4442e91b7f.jpeg',
};

// ---------------------------------------------------------------------------
// Default constants (fallbacks matching Arana Painting's real data)
// ---------------------------------------------------------------------------
const DEFAULTS = {
  businessName: "Arana Painting",
  dba: "Arana's Painting, INC",
  phone: '650 532 4879',
  phoneFormatted: '(650) 532-4879',
  phoneHref: '+16505324879',
  email: 'painter.arana@gmail.com',
  address: { street: '1504 Sanchez Ave.', city: 'Burlingame', state: 'CA', zip: '94010' },
  license: '1015308',
  tagline: 'Transforming spaces with vision, precision, and care since 2015.',
  rating: '5.0',
  reviewCount: '127',
  yearsInBusiness: '10',
  yearFounded: '2015',
  googlePlaceId: 'ChIJ3WwCVtd3j4ARVUmcyNJiXtA',
  geo: { lat: '37.5841', lng: '-122.3661' },
};

const DEFAULT_SERVICES = [
  { name: 'Residential Painting', slug: 'residential-painting', description: 'Transform your home with our expert residential painting services. Our skilled team refreshes your living spaces with vibrant aesthetics.', icon: 'fa-home', image: IMG.residential },
  { name: 'Commercial Painting', slug: 'commercial-painting', description: "Enhance your commercial property's appeal with our expert services. We ensure professional and outstanding results for your business.", icon: 'fa-building', image: IMG.commercial },
  { name: 'Kitchen Cabinets', slug: 'kitchen-cabinets', description: 'Repainting your cabinets transforms your kitchen and home. Contact us today for your free custom quote!', icon: 'fa-utensils', image: IMG.kitchen },
  { name: 'HOA Painting', slug: 'hoa-painting', description: 'Revitalize your community with fresh paint and expert services, creating an inviting environment for all residents.', icon: 'fa-city', image: IMG.hoa },
];

const DEFAULT_CITIES = [
  { name: 'Burlingame', slug: 'burlingame' }, { name: 'San Mateo', slug: 'san-mateo' },
  { name: 'Hillsborough', slug: 'hillsborough' }, { name: 'Millbrae', slug: 'millbrae' },
  { name: 'San Bruno', slug: 'san-bruno' }, { name: 'Foster City', slug: 'foster-city' },
  { name: 'Belmont', slug: 'belmont' }, { name: 'San Carlos', slug: 'san-carlos' },
  { name: 'Redwood City', slug: 'redwood-city' }, { name: 'Palo Alto', slug: 'palo-alto' },
  { name: 'Menlo Park', slug: 'menlo-park' }, { name: 'Atherton', slug: 'atherton' },
  { name: 'Woodside', slug: 'woodside' }, { name: 'Daly City', slug: 'daly-city' },
  { name: 'South San Francisco', slug: 'south-san-francisco' }, { name: 'Half Moon Bay', slug: 'half-moon-bay' },
];

const DEFAULT_FAQ = [
  { question: 'How much does it cost to paint a house in Burlingame?', answer: 'House painting costs in Burlingame typically range from $3,000-$15,000 for interior and $4,000-$20,000 for exterior, depending on size, condition, and paint quality. Factors include square footage, number of rooms, prep work needed, and paint grade. Contact us for a free, detailed estimate tailored to your specific project.' },
  { question: 'Is Arana Painting licensed and insured?', answer: 'Yes, Arana Painting is fully licensed with the California Contractors State License Board (License #1015308) and carries comprehensive insurance including general liability and workers\u2019 compensation coverage. This protects you and your property throughout the project.' },
  { question: 'What areas does Arana Painting serve?', answer: 'We serve Burlingame and the entire San Mateo County including San Mateo, Hillsborough, Millbrae, San Bruno, Foster City, Belmont, San Carlos, Redwood City, Palo Alto, Menlo Park, Atherton, and surrounding Bay Area communities.' },
  { question: 'How long does a typical painting project take?', answer: 'Project timelines vary based on scope: a single room typically takes 1-2 days, whole house interiors 5-10 days, and exterior projects 3-7 days depending on size, weather conditions, and prep work required. We\'ll provide an accurate timeline during your free consultation.' },
  { question: 'Do you offer free estimates?', answer: 'Absolutely! We offer free, no-obligation estimates for all projects. Our team will visit your property, discuss your vision and requirements, assess the scope of work, and provide a detailed written quote. Call (650) 532-4879 or fill out our contact form to schedule.' },
  { question: 'What type of paint do you use?', answer: 'We use premium paints from trusted brands like Sherwin-Williams, Benjamin Moore, and Dunn-Edwards. We also offer eco-friendly, low-VOC and zero-VOC options for healthier indoor air quality. Our team will recommend the best paint type for your specific project needs.' },
  { question: 'Do you provide color consultation services?', answer: 'Yes! Our experienced team offers color consultation to help you choose the perfect colors that complement your space, lighting, and personal style. We can provide sample swatches and recommendations based on current design trends and your preferences.' },
];

const DEFAULT_REVIEWS = [
  { name: 'Sarah M.', text: 'Arana Painting transformed our home beautifully. Professional team, excellent results, and great attention to detail.', rating: 5 },
  { name: 'David K.', text: 'Outstanding work on our exterior. The team was professional, on time, and the results exceeded our expectations.', rating: 5 },
  { name: 'Lisa R.', text: 'Kitchen cabinet painting was flawless. They treated our home with care and the finish is like a factory quality.', rating: 5 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function esc(s: string | number | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function phoneHref(phone: string): string {
  return 'tel:+1' + phone.replace(/\D/g, '');
}

/** Strip "CA LIC:" prefix from license — the templates add it themselves */
function normalizeLicense(raw: string): string {
  return String(raw).replace(/^CA\s*LIC[:#]?\s*/i, '').trim();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function getServices(site: Record<string, any>): typeof DEFAULT_SERVICES {
  if (site.services?.length) return site.services;
  return DEFAULT_SERVICES;
}

function getCities(site: Record<string, any>): typeof DEFAULT_CITIES {
  if (site.cities?.length) return site.cities;
  return DEFAULT_CITIES;
}

function getReviews(site: Record<string, any>): typeof DEFAULT_REVIEWS {
  if (site.reviews?.length) return site.reviews;
  return DEFAULT_REVIEWS;
}

function getAddr(site: Record<string, any>): Record<string, string> {
  const a = site.address || DEFAULTS.address;
  return { street: a.street || '', city: a.city || '', state: a.state || '', zip: a.zip || '' };
}

function addrFull(addr: Record<string, string>): string {
  return [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
}

function navLink(slug: string): string {
  if (!slug || slug === 'home' || slug === '/') return '/';
  return `/${slug.replace(/^\/+/, '')}`;
}

// ---------------------------------------------------------------------------
// CSS (entire stylesheet inline, matching Arana Painting exactly)
// ---------------------------------------------------------------------------
function renderCSS(): string {
  return `<style>
:root{--primary:#1a365d;--primary-dark:#0d1f3c;--primary-light:#2a4a7a;--secondary:#c9a227;--secondary-light:#d4b341;--secondary-dark:#a88920;--teal:#007690;--teal-light:#0091b3;--teal-dark:#005a6e;--accent:#e8d5a3;--brand-navy:#1B2D4F;--brand-gold:#C8A97E;--brand-teal:#2E8B8B;--text:#1f2937;--text-light:#6b7280;--text-muted:#9ca3af;--bg-white:#fff;--bg-light:#f9fafb;--bg-gray:#f3f4f6;--bg-dark:#111827;--shadow-sm:0 1px 2px 0 rgba(0,0,0,.05);--shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -1px rgba(0,0,0,.06);--shadow-md:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -2px rgba(0,0,0,.05);--shadow-lg:0 25px 50px -12px rgba(0,0,0,.25);--radius-sm:6px;--radius:12px;--radius-lg:20px;--radius-xl:30px;--transition:all .3s cubic-bezier(.4,0,.2,1);--transition-slow:all .5s cubic-bezier(.4,0,.2,1)}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;overflow-x:hidden}
html,body{max-width:100vw;overflow-x:hidden}
body{font-family:'Source Sans 3','Segoe UI','Helvetica Neue',Arial,sans-serif;color:var(--text);line-height:1.7;font-size:16px;background:var(--bg-white);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
h1,h2,h3,h4,h5,h6{font-family:'Montserrat','Source Sans 3','Segoe UI',sans-serif;font-weight:700;line-height:1.2;color:var(--primary)}
img{max-width:100%;height:auto}
a{text-decoration:none;color:inherit;transition:var(--transition)}
.container{max-width:1280px;margin:0 auto;padding:0 24px}

/* Header */
.header{position:fixed;top:0;left:0;right:0;z-index:1000;background:linear-gradient(135deg,rgba(26,54,93,.98),rgba(13,31,60,.98));backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 4px 20px rgba(0,0,0,.3);transition:var(--transition)}
.header.scrolled{background:linear-gradient(135deg,rgba(26,54,93,1),rgba(13,31,60,1));box-shadow:0 4px 30px rgba(0,0,0,.4)}
.nav{display:flex;align-items:center;justify-content:space-between;height:80px}
.logo-img{height:55px;width:auto;transition:var(--transition)}
.logo:hover .logo-img{transform:scale(1.05)}
.nav-links{display:flex;gap:8px}
.nav-links a{padding:10px 18px;font-weight:500;font-size:15px;color:rgba(255,255,255,.9);border-radius:var(--radius);position:relative;overflow:hidden}
.nav-links a::before{content:'';position:absolute;bottom:8px;left:50%;transform:translateX(-50%) scaleX(0);width:20px;height:2px;background:var(--secondary);transition:var(--transition)}
.nav-links a:hover,.nav-links a.active{color:var(--secondary)}
.nav-links a:hover::before,.nav-links a.active::before{transform:translateX(-50%) scaleX(1)}
.nav-actions{display:flex;align-items:center;gap:16px}
.phone-btn{display:flex;align-items:center;gap:10px;padding:12px 24px;background:linear-gradient(135deg,var(--teal),var(--teal-dark));color:#fff;border-radius:50px;font-weight:600;font-size:15px;box-shadow:0 4px 15px rgba(0,118,144,.4);transition:var(--transition)}
.phone-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,118,144,.5)}
.mobile-menu-btn{display:none;width:44px;height:44px;background:none;border:none;cursor:pointer;padding:12px}
.hamburger{display:block;width:20px;height:2px;background:#fff;position:relative;transition:var(--transition)}
.hamburger::before,.hamburger::after{content:'';position:absolute;width:20px;height:2px;background:#fff;left:0;transition:var(--transition)}
.hamburger::before{top:-6px}.hamburger::after{bottom:-6px}
.mobile-menu-btn.active .hamburger{background:transparent}
.mobile-menu-btn.active .hamburger::before{transform:rotate(45deg);top:0}
.mobile-menu-btn.active .hamburger::after{transform:rotate(-45deg);bottom:0}
.mobile-menu{position:fixed;top:80px;left:0;right:0;background:#fff;transform:translateY(-100%);opacity:0;visibility:hidden;transition:var(--transition);box-shadow:var(--shadow-lg);z-index:999}
.mobile-menu.active{transform:translateY(0);opacity:1;visibility:visible}
.mobile-menu-inner{padding:20px 24px 30px;display:flex;flex-direction:column}
.mobile-menu a{padding:16px 0;font-size:17px;font-weight:500;color:var(--text);border-bottom:1px solid var(--bg-gray)}
.mobile-menu a.active{color:var(--secondary)}
.mobile-phone{margin-top:20px;padding:16px 24px !important;background:linear-gradient(135deg,var(--secondary),var(--secondary-dark));color:#fff !important;border-radius:var(--radius);text-align:center;border:none !important}

/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:16px 32px;border-radius:50px;font-weight:600;font-size:16px;cursor:pointer;border:none;transition:var(--transition);text-align:center}
.btn-primary{background:linear-gradient(135deg,var(--secondary),var(--secondary-dark));color:#fff;box-shadow:0 4px 15px rgba(201,162,39,.4)}
.btn-primary:hover{transform:translateY(-3px);box-shadow:0 8px 25px rgba(201,162,39,.5)}
.btn-secondary{background:var(--teal);color:#fff;box-shadow:0 4px 15px rgba(0,118,144,.3)}
.btn-secondary:hover{background:var(--teal-dark);transform:translateY(-3px)}
.btn-outline{background:transparent;color:#fff;border:2px solid #fff}
.btn-outline:hover{background:#fff;color:var(--primary)}
.btn-large{padding:18px 40px;font-size:17px}

/* Section header */
.section-header{text-align:center;margin-bottom:60px}
.section-badge{display:inline-block;padding:8px 20px;background:linear-gradient(135deg,rgba(0,118,144,.15),rgba(0,118,144,.05));color:var(--teal);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;border-radius:50px;margin-bottom:20px}
.section-header h2{font-size:clamp(32px,5vw,48px);margin-bottom:16px;background:linear-gradient(135deg,var(--primary),var(--primary-light));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.section-desc{font-size:18px;color:var(--text-light);max-width:600px;margin:0 auto}

/* Hero */
.hero{min-height:100vh;display:flex;align-items:center;position:relative;overflow:hidden;padding-top:80px}
.hero-bg{position:absolute;top:0;left:0;right:0;bottom:0;background-size:cover;background-position:center;z-index:-2;filter:brightness(1.15) contrast(1.1) saturate(1.1)}
.hero-overlay{position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(26,54,93,.55),rgba(26,54,93,.45) 40%,rgba(13,31,60,.5) 70%,rgba(13,31,60,.6));z-index:-1}
.hero .container{display:block;max-width:1000px}
.hero-content{color:#fff;text-align:center;max-width:900px;margin:0 auto}
.hero-badge{display:inline-flex;align-items:center;gap:10px;padding:12px 24px;backdrop-filter:blur(12px);background:rgba(26,54,93,.7);border:1px solid rgba(201,162,39,.5);box-shadow:0 4px 20px rgba(0,0,0,.3);border-radius:50px;font-size:15px;font-weight:600;color:var(--secondary-light);margin:0 auto 28px auto}
.hero h1{font-size:clamp(36px,6vw,60px);color:#fff;margin-bottom:24px;line-height:1.1;text-shadow:2px 2px 8px rgba(0,0,0,.5),0 0 30px rgba(0,0,0,.3)}
.hero h1 span{color:var(--secondary)}
.hero-text{font-size:19px;opacity:.9;margin-bottom:32px;line-height:1.8;text-shadow:1px 1px 4px rgba(0,0,0,.4);max-width:700px;margin-left:auto;margin-right:auto}
.hero-buttons{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:40px;justify-content:center}
.hero-buttons .btn{box-shadow:0 4px 20px rgba(0,0,0,.35)}
.hero-stats{display:flex;gap:40px;padding:40px;justify-content:center;border-top:1px solid rgba(255,255,255,.3);background:rgba(26,54,93,.6);margin-top:40px;border-radius:16px;backdrop-filter:blur(12px);box-shadow:0 4px 30px rgba(0,0,0,.2)}
.stat-item{text-align:center}
.stat-number{font-size:42px;font-weight:800;color:var(--secondary);text-shadow:1px 1px 4px rgba(0,0,0,.4)}
.stat-label{font-size:14px;opacity:.8;text-transform:uppercase;letter-spacing:1px;text-shadow:1px 1px 3px rgba(0,0,0,.3)}

/* Services */
.services-section{padding:120px 0;background:var(--bg-light)}
.services-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
.service-card{background:#fff;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow);transition:var(--transition);position:relative}
.service-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--secondary),var(--secondary-light));transform:scaleX(0);transition:var(--transition)}
.service-card:hover{transform:translateY(-10px);box-shadow:var(--shadow-lg)}
.service-card:hover::before{transform:scaleX(1)}
.service-image{height:220px;overflow:hidden}
.service-image img{width:100%;height:100%;object-fit:cover;transition:var(--transition-slow)}
.service-card:hover .service-image img{transform:scale(1.1)}
.service-content{padding:28px}
.service-content h3{font-size:22px;margin-bottom:12px}
.service-content p{color:var(--text-light);font-size:15px;line-height:1.7;margin-bottom:20px}
.service-link{display:inline-flex;align-items:center;gap:8px;color:var(--teal);font-weight:600;font-size:15px}
.service-link i{transition:var(--transition)}
.service-card:hover .service-link i{transform:translateX(5px)}

/* Values */
.values-section{padding:120px 0;background:#fff}
.values-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:40px}
.value-card{text-align:center;padding:50px 40px;background:var(--bg-light);border-radius:var(--radius-lg);transition:var(--transition);position:relative;overflow:hidden}
.value-card::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,var(--primary),var(--primary-dark));opacity:0;transition:var(--transition)}
.value-card:hover{transform:translateY(-10px)}
.value-card:hover::before{opacity:1}
.value-card>*{position:relative;z-index:1}
.value-icon{width:90px;height:90px;background:linear-gradient(135deg,var(--teal),var(--teal-dark));border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:36px;color:#fff;box-shadow:0 10px 30px rgba(0,118,144,.3);transition:var(--transition)}
.value-card:hover .value-icon{transform:scale(1.1)}
.value-card h3{font-size:24px;margin-bottom:16px;transition:var(--transition)}
.value-card:hover h3{color:#fff}
.value-card p{color:var(--text-light);font-size:15px;line-height:1.8;transition:var(--transition)}
.value-card:hover p{color:rgba(255,255,255,.85)}

/* Why Different / Benefits */
.why-different{padding:120px 0;background:linear-gradient(180deg,var(--bg-gray),var(--bg-light))}
.benefits-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:30px}
.benefit-card{background:#fff;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow);transition:var(--transition)}
.benefit-card:hover{transform:translateY(-10px);box-shadow:var(--shadow-lg)}
.benefit-image{height:280px;overflow:hidden;position:relative}
.benefit-image::after{content:'';position:absolute;bottom:0;left:0;right:0;height:60%;background:linear-gradient(to top,rgba(26,54,93,.4),transparent);pointer-events:none;transition:var(--transition)}
.benefit-card:hover .benefit-image::after{opacity:0}
.benefit-image img{width:100%;height:100%;object-fit:cover;transition:var(--transition-slow)}
.benefit-card:hover .benefit-image img{transform:scale(1.08)}
.benefit-overlay{position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,rgba(26,54,93,.85),rgba(0,118,144,.75));display:flex;align-items:center;justify-content:center;opacity:0;transition:var(--transition)}
.benefit-card:hover .benefit-overlay{opacity:1}
.benefit-overlay i{font-size:48px;color:#fff;transform:scale(0) rotate(-10deg);transition:var(--transition)}
.benefit-card:hover .benefit-overlay i{transform:scale(1) rotate(0)}
.benefit-content{padding:30px;position:relative}
.benefit-icon{width:64px;height:64px;background:linear-gradient(135deg,var(--teal),var(--teal-dark));border-radius:var(--radius);display:flex;align-items:center;justify-content:center;color:#fff;font-size:26px;position:absolute;top:-32px;right:30px;box-shadow:0 10px 30px rgba(0,118,144,.4);border:3px solid #fff;transition:var(--transition)}
.benefit-card:hover .benefit-icon{transform:scale(1.1) rotate(5deg)}
.benefit-content h3{font-size:22px;margin-bottom:12px;padding-right:70px}
.benefit-content p{color:var(--text-light);font-size:15px;line-height:1.7}

/* Testimonials */
.testimonials{padding:120px 0;background:linear-gradient(135deg,var(--primary),var(--primary-dark))}
.testimonials .section-badge{background:rgba(255,255,255,.15);color:var(--secondary-light)}
.testimonials .section-header h2{color:#fff;-webkit-text-fill-color:#fff}
.testimonials .section-desc{color:rgba(255,255,255,.8)}
.reviews-widget-container{margin-top:40px;border-radius:var(--radius-lg);overflow:hidden;background:#fff;padding:20px;box-shadow:var(--shadow-lg)}
.reviews-widget-container iframe{min-height:400px;border:none}

/* CTA */
.cta-section{padding:120px 0;position:relative;background-size:cover;background-position:center;background-attachment:fixed}
.cta-overlay{position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,rgba(26,54,93,.95),rgba(13,31,60,.9))}
.cta-content{position:relative;z-index:1;text-align:center;max-width:700px;margin:0 auto;color:#fff}
.cta-badge{display:inline-block;padding:8px 20px;background:rgba(201,162,39,.2);border:1px solid rgba(201,162,39,.3);color:var(--secondary-light);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;border-radius:50px;margin-bottom:24px}
.cta-content h2{font-size:clamp(32px,5vw,48px);color:#fff;margin-bottom:20px}
.cta-content p{font-size:18px;opacity:.9;margin-bottom:40px;line-height:1.8}
.cta-buttons{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}

/* About */
.about-section{padding:120px 0;overflow:hidden}
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.about-image-main{border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);width:100%}
.about-image-secondary{position:absolute;bottom:-40px;right:-40px;width:60%;border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);border:6px solid #fff}
.about-content h2{font-size:clamp(32px,4vw,44px);margin-bottom:24px}
.about-content p{font-size:17px;color:var(--text-light);line-height:1.8;margin-bottom:20px}
.about-features{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:32px 0}
.about-feature{display:flex;align-items:center;gap:12px}
.about-feature i{width:40px;height:40px;background:linear-gradient(135deg,rgba(201,162,39,.15),rgba(201,162,39,.05));border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--secondary);font-size:16px}
.about-feature span{font-weight:600;color:var(--text)}

/* Page Hero */
.page-hero{padding:180px 0 100px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));position:relative;overflow:hidden}
.page-hero::before{content:'';position:absolute;top:-50%;right:-20%;width:80%;height:200%;background:radial-gradient(circle,rgba(201,162,39,.1),transparent 70%)}
.page-hero .container{position:relative;z-index:1;text-align:center}
.page-hero .section-badge{background:rgba(255,255,255,.15);color:var(--secondary-light)}
.page-hero h1{font-size:clamp(36px,6vw,56px);color:#fff;margin-bottom:20px}
.page-hero p{font-size:18px;color:rgba(255,255,255,.85);max-width:600px;margin:0 auto}

/* Contact */
.contact-section{padding:120px 0}
.contact-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:60px}
.contact-info h3{font-size:32px;margin-bottom:20px}
.contact-info>p{color:var(--text-light);font-size:17px;margin-bottom:40px;line-height:1.8}
.contact-item{display:flex;gap:20px;margin-bottom:30px}
.contact-item-icon{width:60px;height:60px;background:linear-gradient(135deg,var(--teal),var(--teal-dark));border-radius:var(--radius);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;flex-shrink:0}
.contact-item-text h4{font-size:18px;margin-bottom:6px;font-weight:600}
.contact-item-text p,.contact-item-text a{color:var(--text-light);font-size:16px}
.contact-item-text a:hover{color:var(--teal)}
.contact-form{background:var(--bg-light);padding:50px;border-radius:var(--radius-lg);box-shadow:var(--shadow)}
.contact-form h3{font-size:28px;margin-bottom:30px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.form-group{margin-bottom:24px}
.form-group label{display:block;font-weight:600;margin-bottom:10px;color:var(--text);font-size:15px}
.form-group input,.form-group textarea,.form-group select{width:100%;padding:16px 20px;border:2px solid var(--bg-gray);border-radius:var(--radius);font-size:16px;font-family:inherit;transition:var(--transition);background:#fff}
.form-group input:focus,.form-group textarea:focus,.form-group select:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 4px rgba(0,118,144,.15)}
.form-group textarea{min-height:160px;resize:vertical}

/* Service Areas */
.service-areas{padding:100px 0;background:var(--bg-light)}
.areas-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin-top:50px}
.area-item{background:#fff;padding:20px 24px;border-radius:var(--radius);text-align:center;font-weight:600;color:var(--primary);box-shadow:var(--shadow-sm);transition:var(--transition);display:flex;align-items:center;justify-content:center;gap:10px}
.area-item:hover{transform:translateY(-5px);box-shadow:var(--shadow-md);color:var(--teal)}
.area-item i{color:var(--secondary);font-size:14px}

/* Trust Badges */
.trust-badges{padding:80px 0;background:linear-gradient(135deg,var(--primary),var(--primary-dark))}
.badges-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:30px}
.badge-item{text-align:center;color:#fff}
.badge-item i{font-size:48px;color:var(--secondary);margin-bottom:16px}
.badge-item h4{color:#fff;font-size:20px;margin-bottom:8px}
.badge-item p{color:rgba(255,255,255,.8);font-size:14px}

/* FAQ */
.faq-section{padding:120px 0}
.faq-grid{max-width:900px;margin:50px auto 0}
.faq-item{background:#fff;border-radius:var(--radius);margin-bottom:16px;box-shadow:var(--shadow-sm);overflow:hidden;border:1px solid var(--bg-gray)}
.faq-question{padding:24px 30px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:17px;color:var(--primary);transition:var(--transition)}
.faq-question:hover{background:var(--bg-light)}
.faq-question i{color:var(--teal);transition:var(--transition)}
.faq-item.active .faq-question i{transform:rotate(180deg)}
.faq-answer{padding:0 30px 24px;color:var(--text-light);line-height:1.8;display:none}
.faq-item.active .faq-answer{display:block}

/* Footer */
.footer{background:var(--bg-dark);color:#fff}
.footer-top{padding:80px 0 60px}
.footer-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1.2fr;gap:40px}
.footer-logo{height:60px;width:auto;margin-bottom:20px}
.footer-tagline{color:rgba(255,255,255,.7);font-size:15px;line-height:1.7;margin-bottom:20px}
.license-badge{display:inline-flex;align-items:center;gap:10px;padding:10px 18px;background:rgba(201,162,39,.15);border-radius:50px;font-size:14px;font-weight:600;color:var(--secondary);margin-bottom:20px}
.social-links{display:flex;gap:12px}
.social-links a{width:44px;height:44px;background:rgba(255,255,255,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;transition:var(--transition)}
.social-links a:hover{background:var(--secondary);transform:translateY(-3px)}
.footer-links h4,.footer-contact h4{color:#fff;font-size:18px;margin-bottom:24px;font-weight:700}
.footer-links ul,.footer-contact ul{list-style:none}
.footer-links li{margin-bottom:14px}
.footer-links a{color:rgba(255,255,255,.7);font-size:15px;transition:var(--transition)}
.footer-links a:hover{color:var(--secondary);padding-left:5px}
.footer-contact li{display:flex;gap:14px;margin-bottom:18px;color:rgba(255,255,255,.7);font-size:15px}
.footer-contact li i{color:var(--secondary);font-size:18px;margin-top:3px}
.footer-contact a{color:rgba(255,255,255,.7)}
.footer-contact a:hover{color:var(--secondary)}
.footer-bottom{padding:24px 0;border-top:1px solid rgba(255,255,255,.1);text-align:center}
.footer-bottom p{color:rgba(255,255,255,.5);font-size:14px}
.footer-bottom a{color:rgba(255,255,255,.5)}
.footer-bottom a:hover{color:var(--secondary)}

/* Map */
.map-section{padding:0}
.map-container{position:relative}
.map-info{position:absolute;top:50%;left:50px;transform:translateY(-50%);background:#fff;padding:40px;border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);max-width:400px;z-index:10}
.map-info h3{font-size:24px;margin-bottom:20px}
.map-info-item{display:flex;align-items:flex-start;gap:15px;margin-bottom:16px}
.map-info-item i{color:var(--teal);font-size:18px;margin-top:3px}
.map-info-item p{color:var(--text-light);font-size:15px;line-height:1.6}
.map-info-item a{color:var(--teal);font-weight:600}
.map-iframe{width:100%;height:450px;border:0}

/* Kitchen features / steps */
.kitchen-features{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:30px;margin-top:50px}
.kitchen-feature{text-align:center;padding:40px 30px;background:var(--bg-light);border-radius:var(--radius-lg);transition:var(--transition)}
.kitchen-feature:hover{transform:translateY(-8px);box-shadow:var(--shadow-md)}
.kitchen-feature i{font-size:48px;color:var(--secondary);margin-bottom:24px}
.kitchen-feature h3{font-size:20px;margin-bottom:12px}
.kitchen-feature p{color:var(--text-light);font-size:15px;line-height:1.7}
.kitchen-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:30px;margin-top:50px}
.step-card{text-align:center;padding:50px 35px;background:#fff;border-radius:var(--radius-lg);box-shadow:var(--shadow);transition:var(--transition)}
.step-card:hover{transform:translateY(-10px);box-shadow:var(--shadow-lg)}
.step-number{width:70px;height:70px;background:linear-gradient(135deg,var(--teal),var(--teal-dark));border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:800;margin:0 auto 24px;box-shadow:0 10px 30px rgba(0,118,144,.3)}
.step-card h3{font-size:20px;margin-bottom:12px}
.step-card p{color:var(--text-light);font-size:15px;line-height:1.7}

/* Service detail */
.service-detail-section{padding:120px 0}
.service-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.service-features-list{list-style:none;margin:30px 0}
.service-features-list li{display:flex;align-items:center;gap:12px;padding:12px 0;font-size:16px;color:var(--text);border-bottom:1px solid var(--bg-gray)}
.service-features-list li i{color:var(--teal);font-size:18px}

/* HOA */
.hoa-section{padding:120px 0}
.hoa-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.hoa-list{list-style:none;margin:30px 0}
.hoa-list li{padding:14px 0 14px 36px;position:relative;color:var(--text);font-size:16px;border-bottom:1px solid var(--bg-gray)}
.hoa-list li::before{content:'\\f00c';font-family:'Font Awesome 6 Free';font-weight:900;position:absolute;left:0;color:var(--teal);font-size:14px}
.hoa-services-section{padding:120px 0;background:var(--bg-light)}
.services-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:50px}
.services-list-item{background:#fff;padding:30px;border-radius:var(--radius-lg);box-shadow:var(--shadow);display:flex;align-items:center;gap:20px;transition:var(--transition)}
.services-list-item:hover{transform:translateY(-5px);box-shadow:var(--shadow-md)}
.services-list-item i{width:60px;height:60px;background:linear-gradient(135deg,var(--teal),var(--teal-dark));border-radius:var(--radius);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;flex-shrink:0}
.services-list-item span{font-weight:600;font-size:16px;color:var(--text)}

/* Responsive */
@media(max-width:1200px){.services-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:992px){
  .nav-links{display:none}.mobile-menu-btn{display:block}
  .phone-btn span{display:none}.phone-btn{width:44px;height:44px;padding:0;justify-content:center}
  .hero .container{text-align:center}
  .hero-buttons,.hero-stats{justify-content:center}
  .services-grid,.values-grid,.benefits-grid{grid-template-columns:1fr}
  .about-grid,.contact-grid,.hoa-grid,.service-detail-grid{grid-template-columns:1fr;gap:40px}
  .about-image-secondary{position:relative;bottom:auto;right:auto;width:100%;margin-top:-60px}
  .footer-grid{grid-template-columns:repeat(3,1fr)}
  .footer-brand{grid-column:span 3}
  .form-row{grid-template-columns:1fr}
  .map-info{position:relative;top:auto;left:auto;transform:none;margin:0 24px 30px;max-width:none}
}
@media(max-width:640px){
  .hero h1{font-size:32px}
  .hero-stats{flex-direction:column;gap:20px}
  .hero-buttons{flex-direction:column}
  .hero-buttons .btn{width:100%}
  .cta-buttons{flex-direction:column}
  .cta-buttons .btn{width:100%}
  .footer-grid{grid-template-columns:1fr 1fr;gap:30px}
  .footer-brand{grid-column:span 2}
  .contact-form{padding:30px 24px}
  .about-image-secondary{display:none}
  .page-hero::before{display:none}
  section{overflow-x:hidden}
  .container{padding:0 16px;max-width:100%}
  .areas-grid{grid-template-columns:repeat(2,1fr);gap:12px}
  .area-item{padding:12px 16px;font-size:14px}
}
@media(max-width:480px){
  .footer-grid{grid-template-columns:1fr}.footer-brand{grid-column:span 1}
  .hero h1{font-size:28px}.section-header h2{font-size:24px}
  .areas-grid{grid-template-columns:1fr}
}
</style>`;
}

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------
function renderHead(site: Record<string, any>, page: Record<string, any>, schemaJson?: string): string {
  const biz = site.business_name || DEFAULTS.businessName;
  const title = (page.meta_title as string) || (page.title as string) || biz;
  const desc = (page.meta_description as string) || `${biz} - Professional painting services. Licensed, insured, free estimates.`;
  const logoUrl = site.logo_url || IMG.logo;
  const phone = site.phone || DEFAULTS.phone;
  const addr = getAddr(site);
  const domain = site.domain || 'aranapainting.com';
  const slug = (page.slug as string) || '';
  const canonical = `https://${domain}${slug ? '/' + slug.replace(/^\/+/, '') : ''}`;
  const geo = site.geo || DEFAULTS.geo;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${esc(title)} | ${esc(biz)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <meta name="author" content="${esc(biz)}">
  <meta name="geo.region" content="US-${esc(addr.state || 'CA')}">
  <meta name="geo.placename" content="${esc(addr.city || 'Burlingame')}, ${esc(addr.state || 'California')}">
  <meta name="geo.position" content="${esc(geo.lat || '37.5841')};${esc(geo.lng || '-122.3661')}">
  <meta name="ICBM" content="${esc(geo.lat || '37.5841')}, ${esc(geo.lng || '-122.3661')}">
  <link rel="canonical" href="${esc(canonical)}">

  <meta property="og:type" content="website">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:title" content="${esc(title)} | ${esc(biz)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${esc(logoUrl)}">
  <meta property="og:locale" content="en_US">
  <meta property="og:site_name" content="${esc(biz)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)} | ${esc(biz)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(logoUrl)}">

  <meta name="theme-color" content="#1a365d">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="https://unpkg.com/aos@2.3.1/dist/aos.css">
  ${renderCSS()}
  ${schemaJson ? `<script type="application/ld+json">${schemaJson}</script>` : ''}
</head>`;
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
function renderNavbar(site: Record<string, any>, page: Record<string, any>, allPages: Record<string, any>[]): string {
  const biz = site.business_name || DEFAULTS.businessName;
  const phone = site.phone || DEFAULTS.phone;
  const logoUrl = site.logo_url || IMG.logo;
  const currentSlug = ((page.slug as string) || '').replace(/^\/+/, '') || 'home';

  // Build nav links from allPages or use defaults
  const navItems = allPages.length > 0
    ? allPages.filter(p => {
        const s = ((p.slug as string) || '').replace(/^\/+/, '');
        return ['home', '', 'index', 'services', 'about', 'portfolio', 'blog', 'contact'].includes(s);
      }).map(p => ({
        slug: ((p.slug as string) || '').replace(/^\/+/, '') || 'home',
        title: p.title as string,
      }))
    : [
        { slug: 'home', title: 'Home' },
        { slug: 'services', title: 'Services' },
        { slug: 'about', title: 'About' },
        { slug: 'portfolio', title: 'Portfolio' },
        { slug: 'blog', title: 'Blog' },
        { slug: 'contact', title: 'Contact' },
      ];

  // Map long page titles to short nav labels
  const NAV_LABELS: Record<string, string> = {
    'home': 'Home', 'index': 'Home', 'services': 'Services', 'about': 'About',
    'portfolio': 'Portfolio', 'blog': 'Blog', 'contact': 'Contact',
  };
  const linkHtml = navItems.map(n => {
    const active = (n.slug === currentSlug || (n.slug === 'home' && currentSlug === '') || (n.slug === 'index' && currentSlug === '')) ? ' active' : '';
    const label = NAV_LABELS[n.slug] || n.title;
    return `<a href="${navLink(n.slug)}" class="${active}">${esc(label)}</a>`;
  }).join('\n          ');

  const mobileLinkHtml = navItems.map(n => {
    const active = (n.slug === currentSlug || (n.slug === 'home' && currentSlug === '')) ? ' active' : '';
    return `<a href="${navLink(n.slug)}" class="${active}" onclick="closeMobileMenu()">${esc(n.title)}</a>`;
  }).join('\n        ');

  return `
  <header class="header" id="header">
    <div class="container">
      <nav class="nav">
        <a href="/" class="logo" aria-label="${esc(biz)} Home">
          <img src="${esc(logoUrl)}" alt="${esc(biz)}" class="logo-img">
        </a>
        <div class="nav-links" id="navLinks">
          ${linkHtml}
        </div>
        <div class="nav-actions">
          <a href="${phoneHref(phone)}" class="phone-btn">
            <i class="fas fa-phone-alt"></i>
            <span>${esc(phone)}</span>
          </a>
          <button class="mobile-menu-btn" onclick="toggleMobileMenu()" aria-label="Toggle menu">
            <span class="hamburger"></span>
          </button>
        </div>
      </nav>
    </div>
    <div class="mobile-menu" id="mobileMenu">
      <div class="mobile-menu-inner">
        ${mobileLinkHtml}
        <a href="${phoneHref(phone)}" class="mobile-phone" onclick="closeMobileMenu()">
          <i class="fas fa-phone-alt"></i> ${esc(phone)}
        </a>
      </div>
    </div>
  </header>`;
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function renderFooter(site: Record<string, any>): string {
  const biz = site.business_name || DEFAULTS.businessName;
  const dba = site.dba || site.owner_company || DEFAULTS.dba;
  const phone = site.phone || DEFAULTS.phone;
  const email = site.email || DEFAULTS.email;
  const logoUrl = site.logo_url || IMG.logo;
  const tagline = site.tagline || DEFAULTS.tagline;
  const license = normalizeLicense(site.license || DEFAULTS.license);
  const addr = getAddr(site);
  const services = getServices(site);
  const cities = getCities(site);
  const googlePlaceId = site.google_place_id || DEFAULTS.googlePlaceId;

  return `
  <footer class="footer">
    <div class="footer-top">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <img src="${esc(logoUrl)}" alt="${esc(biz)}" class="footer-logo">
            <p class="footer-tagline">${esc(tagline)}</p>
            ${license ? `<div class="license-badge"><i class="fas fa-certificate"></i><span>CA LIC: ${esc(license)}</span></div>` : ''}
            <div class="social-links">
              <a href="#" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
              <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
              <a href="#" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
              <a href="https://search.google.com/local/writereview?placeid=${esc(googlePlaceId)}" target="_blank" aria-label="Google"><i class="fab fa-google"></i></a>
            </div>
          </div>
          <div class="footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About Us</a></li>
              <li><a href="/services">Services</a></li>
              <li><a href="/portfolio">Portfolio</a></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>
          <div class="footer-links">
            <h4>Services</h4>
            <ul>
              ${services.slice(0, 5).map(s => `<li><a href="/services/${esc(s.slug)}">${esc(s.name)}</a></li>`).join('\n              ')}
            </ul>
          </div>
          <div class="footer-links">
            <h4>Service Areas</h4>
            <ul>
              ${cities.slice(0, 5).map(c => `<li><a href="/locations/${esc(c.slug)}">${esc(c.name)}</a></li>`).join('\n              ')}
            </ul>
          </div>
          <div class="footer-contact">
            <h4>Contact Us</h4>
            <ul>
              <li><i class="fas fa-map-marker-alt"></i><span>${esc(addr.street)}<br>${esc(addr.city)}, ${esc(addr.state)} ${esc(addr.zip)}</span></li>
              <li><i class="fas fa-phone-alt"></i><a href="${phoneHref(phone)}">${esc(phone)}</a></li>
              <li><i class="fas fa-envelope"></i><a href="mailto:${esc(email)}">${esc(email)}</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container">
        <p>&copy; ${new Date().getFullYear()} ${esc(dba)}. All rights reserved. | <a href="/terms">Terms &amp; Conditions</a> | <a href="/privacy">Privacy Policy</a></p>
      </div>
    </div>
  </footer>`;
}

// ---------------------------------------------------------------------------
// Shared sections
// ---------------------------------------------------------------------------
function renderCTA(site: Record<string, any>): string {
  const phone = site.phone || DEFAULTS.phone;
  return `
  <section class="cta-section" style="background-image:url('${IMG.googleReview}')">
    <div class="cta-overlay"></div>
    <div class="container">
      <div class="cta-content" data-aos="fade-up">
        <span class="cta-badge">Free Consultation</span>
        <h2>GET A FREE CUSTOM QUOTE!</h2>
        <p>Book a no-cost 1 on 1 discovery call to get your custom quote. Let's transform your space together.</p>
        <div class="cta-buttons">
          <a href="/contact" class="btn btn-primary btn-large"><i class="fas fa-calendar-check"></i> Schedule Consultation</a>
          <a href="${phoneHref(phone)}" class="btn btn-outline btn-large"><i class="fas fa-phone-alt"></i> Call Now</a>
        </div>
      </div>
    </div>
  </section>`;
}

function renderCoreValues(): string {
  return `
  <section class="values-section">
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <span class="section-badge">Our Core Values</span>
        <h2>Committed to Excellence and Satisfaction</h2>
        <p class="section-desc">What sets us apart from the competition</p>
      </div>
      <div class="values-grid">
        <div class="value-card" data-aos="fade-up" data-aos-delay="100">
          <div class="value-icon"><i class="fas fa-gem"></i></div>
          <h3>Quality Craftsmanship</h3>
          <p>We take pride in our meticulous attention to detail, using the finest materials and techniques to ensure top-quality results that exceed our clients' expectations.</p>
        </div>
        <div class="value-card" data-aos="fade-up" data-aos-delay="200">
          <div class="value-icon"><i class="fas fa-users"></i></div>
          <h3>Customer Focus</h3>
          <p>Our clients are at the heart of everything we do. We strive to understand their vision, provide personalized solutions, and deliver exceptional customer service.</p>
        </div>
        <div class="value-card" data-aos="fade-up" data-aos-delay="300">
          <div class="value-icon"><i class="fas fa-shield-alt"></i></div>
          <h3>Reliability</h3>
          <p>With ${esc(DEFAULTS.businessName)}, you can rely on our skilled team to deliver prompt and professional service, complete projects on time, and maintain open communication.</p>
        </div>
      </div>
    </div>
  </section>`;
}

function renderWhyDifferent(): string {
  return `
  <section class="why-different">
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <span class="section-badge">Why Choose Us</span>
        <h2>Transform Your Space with ${esc(DEFAULTS.businessName)}</h2>
        <p class="section-desc">Experience the difference of working with true professionals</p>
      </div>
      <div class="benefits-grid">
        <div class="benefit-card" data-aos="fade-up" data-aos-delay="100">
          <div class="benefit-image">
            <img src="${IMG.craftsmanship}" alt="Expert Craftsmanship" loading="lazy">
            <div class="benefit-overlay"><i class="fas fa-search-plus"></i></div>
          </div>
          <div class="benefit-content">
            <div class="benefit-icon"><i class="fas fa-paint-brush"></i></div>
            <h3>Expert Craftsmanship</h3>
            <p>Our team of skilled painters ensures every project is completed with meticulous attention to detail, delivering flawless finishes that enhance the beauty and value of your property.</p>
          </div>
        </div>
        <div class="benefit-card" data-aos="fade-up" data-aos-delay="200">
          <div class="benefit-image">
            <img src="${IMG.seamless}" alt="Seamless Process" loading="lazy">
            <div class="benefit-overlay"><i class="fas fa-search-plus"></i></div>
          </div>
          <div class="benefit-content">
            <div class="benefit-icon"><i class="fas fa-clipboard-check"></i></div>
            <h3>Seamless Process</h3>
            <p>From consultation to completion, we manage every aspect of the project, providing a smooth, hassle-free process that saves you time and stress.</p>
          </div>
        </div>
        <div class="benefit-card" data-aos="fade-up" data-aos-delay="300">
          <div class="benefit-image">
            <img src="${IMG.satisfaction}" alt="Customer Satisfaction" loading="lazy">
            <div class="benefit-overlay"><i class="fas fa-search-plus"></i></div>
          </div>
          <div class="benefit-content">
            <div class="benefit-icon"><i class="fas fa-heart"></i></div>
            <h3>Customer Satisfaction</h3>
            <p>We prioritize your satisfaction by offering personalized service, clear communication, and results that exceed expectations, making sure you're delighted with the outcome.</p>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function renderTestimonials(site: Record<string, any>): string {
  return `
  <section class="testimonials">
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <span class="section-badge">Testimonials</span>
        <h2>What Our Happy Customers Say</h2>
        <p class="section-desc">Real reviews from real clients</p>
      </div>
      <div class="reviews-widget-container" data-aos="fade-up">
        <script type="text/javascript" src="https://reputationhub.site/reputation/assets/review-widget.js"></script>
        <iframe class="lc_reviews_widget" src="https://reputationhub.site/reputation/widgets/review_widget/eH9EceMluUOqJLXfRPf1" frameborder="0" scrolling="no" style="min-width:100%;width:100%;"></iframe>
      </div>
    </div>
  </section>`;
}

function renderTrustBadges(site: Record<string, any>): string {
  const license = normalizeLicense(site.license || DEFAULTS.license);
  const reviewCount = site.reviewCount || DEFAULTS.reviewCount;
  const years = site.yearsInBusiness || DEFAULTS.yearsInBusiness;
  return `
  <section class="trust-badges">
    <div class="container">
      <div class="badges-grid" data-aos="fade-up">
        <div class="badge-item"><i class="fas fa-certificate"></i><h4>Licensed Contractor</h4><p>CA LIC #${esc(license)}</p></div>
        <div class="badge-item"><i class="fas fa-shield-alt"></i><h4>Fully Insured</h4><p>Liability &amp; Workers Comp</p></div>
        <div class="badge-item"><i class="fas fa-star"></i><h4>5-Star Rated</h4><p>${esc(reviewCount)}+ Google Reviews</p></div>
        <div class="badge-item"><i class="fas fa-clock"></i><h4>${esc(years)}+ Years</h4><p>Industry Experience</p></div>
        <div class="badge-item"><i class="fas fa-handshake"></i><h4>100+ Projects</h4><p>Completed Successfully</p></div>
      </div>
    </div>
  </section>`;
}

function renderServiceAreas(site: Record<string, any>): string {
  const cities = getCities(site);
  return `
  <section class="service-areas">
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <span class="section-badge">Service Areas</span>
        <h2>Proudly Serving the Bay Area</h2>
        <p class="section-desc">Professional painting services throughout San Mateo County and surrounding communities</p>
      </div>
      <div class="areas-grid" data-aos="fade-up">
        ${cities.map(c => `<a href="/locations/${esc(c.slug)}" class="area-item"><i class="fas fa-map-marker-alt"></i> ${esc(c.name)}</a>`).join('\n        ')}
      </div>
    </div>
  </section>`;
}

function renderFAQ(faq: { question: string; answer: string }[]): string {
  if (!faq.length) return '';
  return `
  <section class="faq-section">
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <span class="section-badge">FAQ</span>
        <h2>Frequently Asked Questions</h2>
        <p class="section-desc">Get answers to common questions about our services</p>
      </div>
      <div class="faq-grid" data-aos="fade-up">
        ${faq.map((f, i) => `
        <div class="faq-item${i === 0 ? ' active' : ''}">
          <div class="faq-question" onclick="toggleFaq(this)">
            <span>${esc(f.question)}</span>
            <i class="fas fa-chevron-down"></i>
          </div>
          <div class="faq-answer">${esc(f.answer)}</div>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}

function renderMapSection(site: Record<string, any>): string {
  const phone = site.phone || DEFAULTS.phone;
  const email = site.email || DEFAULTS.email;
  const addr = getAddr(site);
  return `
  <section class="map-section">
    <div class="map-container">
      <div class="map-info" data-aos="fade-right">
        <h3>Visit Our Location</h3>
        <div class="map-info-item"><i class="fas fa-map-marker-alt"></i><p>${esc(addr.street)}<br>${esc(addr.city)}, ${esc(addr.state)} ${esc(addr.zip)}</p></div>
        <div class="map-info-item"><i class="fas fa-phone-alt"></i><p><a href="${phoneHref(phone)}">${esc(phone)}</a></p></div>
        <div class="map-info-item"><i class="fas fa-envelope"></i><p><a href="mailto:${esc(email)}">${esc(email)}</a></p></div>
        <div class="map-info-item"><i class="fas fa-clock"></i><p>Mon-Fri: 7AM - 6PM<br>Sat: 8AM - 4PM</p></div>
        <a href="/contact" class="btn btn-primary" style="margin-top:20px;width:100%"><i class="fas fa-calendar-check"></i> Get Free Quote</a>
      </div>
      <iframe class="map-iframe" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3162.5!2d-122.366!3d37.584!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808f9!2sBurlingame%2C%20CA!5e0!3m2!1sen!2sus!4v1" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="${esc(site.business_name || DEFAULTS.businessName)} Location"></iframe>
    </div>
  </section>`;
}

function renderContactForm(site: Record<string, any>): string {
  const biz = site.business_name || DEFAULTS.businessName;
  const clientId = site.widget_client_id || '';
  const services = getServices(site);
  return `
  <div class="contact-form" data-aos="fade-left">
    <h3>Request a Free Quote</h3>
    <form onsubmit="handleContactSubmit(event)">
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input type="text" name="name" required placeholder="Your name"></div>
        <div class="form-group"><label>Phone *</label><input type="tel" name="phone" required placeholder="(555) 555-5555"></div>
      </div>
      <div class="form-group"><label>Email</label><input type="email" name="email" placeholder="your@email.com"></div>
      <div class="form-group">
        <label>Service Needed</label>
        <select name="service">
          <option value="">Select a service...</option>
          ${services.map(s => `<option value="${esc(s.name)}">${esc(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Message</label><textarea name="message" placeholder="Tell us about your project..."></textarea></div>
      <button type="submit" class="btn btn-primary" style="width:100%"><i class="fas fa-paper-plane"></i> Send Request</button>
    </form>
  </div>`;
}

// ---------------------------------------------------------------------------
// Scripts
// ---------------------------------------------------------------------------
function renderScripts(site: Record<string, any>): string {
  const widgetClientId = site.widget_client_id || '';
  const biz = site.business_name || DEFAULTS.businessName;
  const widgetScript = widgetClientId
    ? `<script src="https://kyra.conversionsystem.com/api/widget/${esc(widgetClientId)}/script?v=2" defer></script>`
    : '';
  return `
  <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
  <script>
    AOS.init({ duration: 800, once: true, offset: 50 });

    var header = document.getElementById('header');
    window.addEventListener('scroll', function() {
      if (window.scrollY > 50) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    });

    function toggleMobileMenu() {
      document.getElementById('mobileMenu').classList.toggle('active');
      document.querySelector('.mobile-menu-btn').classList.toggle('active');
    }
    function closeMobileMenu() {
      document.getElementById('mobileMenu').classList.remove('active');
      document.querySelector('.mobile-menu-btn').classList.remove('active');
    }
    function toggleFaq(el) {
      var item = el.parentElement;
      var wasActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(function(i) { i.classList.remove('active'); });
      if (!wasActive) item.classList.add('active');
    }

    function handleContactSubmit(e) {
      e.preventDefault();
      var form = e.target;
      var btn = form.querySelector('button[type=submit]');
      var origText = btn.innerHTML;
      btn.innerHTML = 'Sending...';
      btn.disabled = true;

      var data = {
        name: form.querySelector('[name=name]').value,
        phone: form.querySelector('[name=phone]').value,
        email: form.querySelector('[name=email]') ? form.querySelector('[name=email]').value : '',
        service: form.querySelector('[name=service]') ? form.querySelector('[name=service]').value : '',
        message: form.querySelector('[name=message]') ? form.querySelector('[name=message]').value : '',
        clientId: '${esc(widgetClientId)}',
        businessName: '${esc(biz)}',
        source: 'website_form'
      };

      fetch('https://kyra.conversionsystem.com/api/sites/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function(res) {
        if (res.ok) {
          form.innerHTML = '<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:16px">✅</div><h3 style="color:var(--primary);margin-bottom:8px">Quote Request Received!</h3><p style="color:var(--text-light)">We\\'ll get back to you within 1 hour during business hours.</p></div>';
        } else { btn.innerHTML = origText; btn.disabled = false; alert('Something went wrong. Please call us directly.'); }
      }).catch(function() { btn.innerHTML = origText; btn.disabled = false; alert('Something went wrong. Please call us directly.'); });
    }
  </script>
  ${widgetScript}`;
}

// ---------------------------------------------------------------------------
// Schema / JSON-LD
// ---------------------------------------------------------------------------
function buildLocalBusinessSchema(site: Record<string, any>): string {
  const biz = site.business_name || DEFAULTS.businessName;
  const dba = site.dba || DEFAULTS.dba;
  const phone = site.phone || DEFAULTS.phone;
  const email = site.email || DEFAULTS.email;
  const addr = getAddr(site);
  const logoUrl = site.logo_url || IMG.logo;
  const domain = site.domain || 'aranapainting.com';
  const geo = site.geo || DEFAULTS.geo;
  const services = getServices(site);
  const cities = getCities(site);
  const rating = site.rating || DEFAULTS.rating;
  const reviewCount = site.reviewCount || DEFAULTS.reviewCount;
  const license = normalizeLicense(site.license || DEFAULTS.license);
  const yearFounded = site.year_founded || DEFAULTS.yearFounded;

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://${domain}/#business`,
    "name": biz,
    "alternateName": dba,
    "description": `Professional residential and commercial painting services in ${addr.city}, ${addr.state}.`,
    "url": `https://${domain}`,
    "telephone": `+1-${phone.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}`,
    "email": email,
    "image": logoUrl,
    "logo": logoUrl,
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": addr.street,
      "addressLocality": addr.city,
      "addressRegion": addr.state,
      "postalCode": addr.zip,
      "addressCountry": "US"
    },
    "geo": { "@type": "GeoCoordinates", "latitude": geo.lat, "longitude": geo.lng },
    "areaServed": cities.map(c => ({ "@type": "City", "name": c.name })),
    "openingHoursSpecification": [
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "07:00", "closes": "18:00" },
      { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "08:00", "closes": "16:00" }
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Painting Services",
      "itemListElement": services.map(s => ({
        "@type": "Offer",
        "itemOffered": { "@type": "Service", "name": s.name, "description": s.description || '' }
      }))
    },
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": rating, "reviewCount": reviewCount, "bestRating": "5", "worstRating": "1" },
    "foundingDate": yearFounded,
    "hasCredential": license ? {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "license",
      "name": "California Contractor License",
      "identifier": license
    } : undefined
  });
}

// ---------------------------------------------------------------------------
// PAGE CONTENT FUNCTIONS
// ---------------------------------------------------------------------------

function homeContent(site: Record<string, any>, page: Record<string, any>): string {
  const biz = site.business_name || DEFAULTS.businessName;
  const phone = site.phone || DEFAULTS.phone;
  const license = normalizeLicense(site.license || DEFAULTS.license);
  const rating = site.rating || DEFAULTS.rating;
  const reviewCount = site.reviewCount || DEFAULTS.reviewCount;
  const years = site.yearsInBusiness || DEFAULTS.yearsInBusiness;
  const services = getServices(site);
  const addr = getAddr(site);

  // Read from content_sections
  const sections = (page.content_sections || []) as { heading: string; body: string; bullets?: string[] }[];

  const heroH1 = (page.hero_h1 as string) || `Premium <span>Painting Services</span> for Bay Area Homes & Businesses`;
  const heroSub = (page.hero_subtitle as string) || `Transform your property with ${addr.city || "Burlingame"}'s most trusted painting professionals. Licensed, insured, and serving San Mateo County for over ${years} years.`;

  return `
    <section class="hero">
      <div class="hero-bg" style="background-image:url('${IMG.heroBg}')"></div>
      <div class="hero-overlay"></div>
      <div class="container">
        <div class="hero-content" data-aos="fade-up">
          <div class="hero-badge"><i class="fas fa-star"></i><span>${esc(rating)} ★ Google Rating</span></div>
          <h1>${heroH1}</h1>
          <p class="hero-text">${esc(heroSub)}</p>
          <div class="hero-buttons">
            <a href="/contact" class="btn btn-primary btn-large"><i class="fas fa-calendar-check"></i> Get Free Estimate</a>
            <a href="${phoneHref(phone)}" class="btn btn-secondary btn-large"><i class="fas fa-phone-alt"></i> ${esc(phone)}</a>
          </div>
          <div class="hero-stats">
            <div class="stat-item"><div class="stat-number">100+</div><div class="stat-label">Projects Completed</div></div>
            <div class="stat-item"><div class="stat-number">${esc(years)}+</div><div class="stat-label">Years Experience</div></div>
            <div class="stat-item"><div class="stat-number">${getCities(site).length}</div><div class="stat-label">Cities Served</div></div>
            <div class="stat-item"><div class="stat-number"><i class="fas fa-certificate" style="font-size:28px"></i></div><div class="stat-label">CA LIC #${esc(license)}</div></div>
          </div>
        </div>
      </div>
    </section>

    <section class="services-section">
      <div class="container">
        <div class="section-header" data-aos="fade-up">
          <span class="section-badge">Our Services</span>
          <h2>Comprehensive Painting Solutions</h2>
          <p class="section-desc">Professional painting services tailored to your unique needs</p>
        </div>
        <div class="services-grid">
          ${services.map((s, i) => `
          <div class="service-card" data-aos="fade-up" data-aos-delay="${(i + 1) * 100}">
            <div class="service-image"><img src="${esc((s as any).image || IMG.residential)}" alt="${esc(s.name)}" loading="lazy"></div>
            <div class="service-content">
              <h3>${esc(s.name)}</h3>
              <p>${esc(s.description)}</p>
              <a href="/services/${esc(s.slug)}" class="service-link">Learn More <i class="fas fa-arrow-right"></i></a>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </section>

    ${renderCoreValues()}

    <section class="about-section">
      <div class="container">
        <div class="about-grid">
          <div class="about-images" data-aos="fade-right" style="position:relative;overflow:hidden">
            <img src="${IMG.about1}" alt="${esc(biz)} Team" class="about-image-main">
            <img src="${IMG.about2}" alt="Professional Painters" class="about-image-secondary">
          </div>
          <div class="about-content" data-aos="fade-left">
            <span class="section-badge">About Us</span>
            <h2>Transforming Spaces with Vision &amp; Expertise</h2>
            <p>${esc(biz)}, a leading service provider in ${esc(addr.city || 'Burlingame')}, is renowned for exceptional quality and unmatched customer satisfaction. With years of expertise in both residential and commercial painting, our highly skilled team delivers flawless results.</p>
            <p>Whether you're refreshing your home or revamping a commercial space, we take pride in transforming your vision into reality with precision and care.</p>
            <div class="about-features">
              <div class="about-feature"><i class="fas fa-check-circle"></i><span>Licensed &amp; Insured</span></div>
              <div class="about-feature"><i class="fas fa-check-circle"></i><span>Premium Materials</span></div>
              <div class="about-feature"><i class="fas fa-check-circle"></i><span>Free Estimates</span></div>
              <div class="about-feature"><i class="fas fa-check-circle"></i><span>On-Time Completion</span></div>
            </div>
            <a href="/about" class="btn btn-secondary">Learn More About Us <i class="fas fa-arrow-right"></i></a>
          </div>
        </div>
      </div>
    </section>

    ${renderTestimonials(site)}
    ${renderWhyDifferent()}
    ${renderTrustBadges(site)}
    ${renderServiceAreas(site)}
    ${renderFAQ(((page.faq && (page.faq as any[]).length > 0) ? page.faq : DEFAULT_FAQ) as { question: string; answer: string }[])}
    ${renderMapSection(site)}
    ${renderCTA(site)}`;
}

function aboutContent(site: Record<string, any>, page: Record<string, any>): string {
  const biz = site.business_name || DEFAULTS.businessName;
  const addr = getAddr(site);
  const license = normalizeLicense(site.license || DEFAULTS.license);
  const years = site.yearsInBusiness || DEFAULTS.yearsInBusiness;
  const heroH1 = (page.hero_h1 as string) || 'Transforming Spaces with Vision';
  const heroSub = (page.hero_subtitle as string) || 'All the trusted painting services you need for your property.';

  return `
    <section class="page-hero">
      <div class="container">
        <span class="section-badge">About Us</span>
        <h1>${esc(heroH1)}</h1>
        <p>${esc(heroSub)}</p>
      </div>
    </section>

    <section class="about-section">
      <div class="container">
        <div class="about-grid">
          <div class="about-images" data-aos="fade-right" style="position:relative;overflow:hidden">
            <img src="${IMG.about1}" alt="${esc(biz)} Team" class="about-image-main">
            <img src="${IMG.about2}" alt="Professional Painters" class="about-image-secondary">
          </div>
          <div class="about-content" data-aos="fade-left">
            <span class="section-badge">Who We Are</span>
            <h2>About ${esc(biz)}</h2>
            <p>${esc(biz)} is a leading painting service provider in ${esc(addr.city || 'Burlingame')}, known for delivering exceptional quality and customer satisfaction.</p>
            <p>Founded with a passion for bringing beauty and vibrance to spaces. What started as a small business has now grown into a trusted name in the painting industry.</p>
            <div class="about-features">
              <div class="about-feature"><i class="fas fa-check-circle"></i><span>CA LIC: ${esc(license)}</span></div>
              <div class="about-feature"><i class="fas fa-check-circle"></i><span>Fully Insured</span></div>
              <div class="about-feature"><i class="fas fa-check-circle"></i><span>${esc(years)}+ Years Experience</span></div>
              <div class="about-feature"><i class="fas fa-check-circle"></i><span>100+ Projects</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    ${renderCoreValues()}
    ${renderWhyDifferent()}
    ${renderCTA(site)}`;
}

function servicesContent(site: Record<string, any>, page: Record<string, any>): string {
  const services = getServices(site);
  const heroH1 = (page.hero_h1 as string) || 'Expert Painting Solutions';
  return `
    <section class="page-hero">
      <div class="container">
        <span class="section-badge">Our Services</span>
        <h1>${esc(heroH1)}</h1>
        <p>Bringing life to your walls with skill, passion, and professionalism.</p>
      </div>
    </section>

    <section class="services-section" style="background:#fff">
      <div class="container">
        <div class="section-header" data-aos="fade-up">
          <span class="section-badge">What We Offer</span>
          <h2>Our Comprehensive Painting Solutions</h2>
          <p class="section-desc">Professional services tailored to meet your unique needs</p>
        </div>
        <div class="services-grid" style="grid-template-columns:repeat(3,1fr)">
          ${services.map((s, i) => `
          <div class="service-card" data-aos="fade-up" data-aos-delay="${(i + 1) * 100}">
            <div class="service-image"><img src="${esc((s as any).image || IMG.residential)}" alt="${esc(s.name)}" loading="lazy"></div>
            <div class="service-content">
              <h3>${esc(s.name)}</h3>
              <p>${esc(s.description)}</p>
              <a href="/services/${esc(s.slug)}" class="service-link">Get a Quote <i class="fas fa-arrow-right"></i></a>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </section>

    ${renderCoreValues()}
    ${renderCTA(site)}`;
}

function contactContent(site: Record<string, any>, page: Record<string, any>): string {
  const phone = site.phone || DEFAULTS.phone;
  const email = site.email || DEFAULTS.email;
  const license = normalizeLicense(site.license || DEFAULTS.license);
  const addr = getAddr(site);
  const heroH1 = (page.hero_h1 as string) || 'Get in Touch';

  return `
    <section class="page-hero">
      <div class="container">
        <span class="section-badge">Contact Us</span>
        <h1>${esc(heroH1)}</h1>
        <p>Ready to transform your space? Contact us today for a free consultation and quote.</p>
      </div>
    </section>

    <section class="contact-section">
      <div class="container">
        <div class="contact-grid">
          <div class="contact-info" data-aos="fade-right">
            <h3>Contact Information</h3>
            <p>Have questions about our services? We're here to help!</p>
            <div class="contact-item">
              <div class="contact-item-icon"><i class="fas fa-map-marker-alt"></i></div>
              <div class="contact-item-text"><h4>Our Location</h4><p>${esc(addr.street)}<br>${esc(addr.city)}, ${esc(addr.state)} ${esc(addr.zip)}</p></div>
            </div>
            <div class="contact-item">
              <div class="contact-item-icon"><i class="fas fa-phone-alt"></i></div>
              <div class="contact-item-text"><h4>Phone Number</h4><a href="${phoneHref(phone)}">${esc(phone)}</a></div>
            </div>
            <div class="contact-item">
              <div class="contact-item-icon"><i class="fas fa-envelope"></i></div>
              <div class="contact-item-text"><h4>Email Address</h4><a href="mailto:${esc(email)}">${esc(email)}</a></div>
            </div>
            ${license ? `
            <div class="contact-item">
              <div class="contact-item-icon"><i class="fas fa-certificate"></i></div>
              <div class="contact-item-text"><h4>License Number</h4><p>CA LIC: ${esc(license)}</p></div>
            </div>` : ''}
          </div>
          ${renderContactForm(site)}
        </div>
      </div>
    </section>

    ${renderTestimonials(site)}`;
}

function portfolioContent(site: Record<string, any>, page: Record<string, any>): string {
  const heroH1 = (page.hero_h1 as string) || 'Portfolio Gallery';
  return `
    <section class="page-hero">
      <div class="container">
        <span class="section-badge">Our Work</span>
        <h1>${esc(heroH1)}</h1>
        <p>Browse through our collection of completed projects showcasing our craftsmanship.</p>
      </div>
    </section>

    <section style="padding:80px 0;background:var(--bg-light)">
      <div class="container">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px" data-aos="fade-up">
          ${[IMG.kitchen, IMG.about1, IMG.about2, IMG.residential, IMG.commercial, IMG.hoa].map((img, i) => `
          <div style="border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow)">
            <img src="${img}" alt="Project ${i + 1}" loading="lazy" style="width:100%;height:280px;object-fit:cover">
          </div>`).join('')}
        </div>
      </div>
    </section>

    ${renderCTA(site)}`;
}

function serviceDetailContent(site: Record<string, any>, page: Record<string, any>): string {
  const biz = site.business_name || DEFAULTS.businessName;
  const heroH1 = (page.hero_h1 as string) || (page.service_name as string) || (page.title as string) || 'Our Services';
  const heroSub = (page.hero_subtitle as string) || `Professional ${heroH1.toLowerCase()} services for homes and businesses.`;
  const sections = (page.content_sections || []) as { heading: string; body: string; bullets?: string[] }[];

  let bodyContent = '';
  for (const sec of sections) {
    const bullets = (sec.bullets || []).map(b => `<li><i class="fas fa-check-circle"></i> ${esc(b)}</li>`).join('');
    bodyContent += `
    <section style="padding:80px 0">
      <div class="container">
        <div class="section-header" data-aos="fade-up">
          <h2>${esc(sec.heading)}</h2>
          <p class="section-desc">${esc(sec.body)}</p>
        </div>
        ${bullets ? `<ul class="service-features-list" style="max-width:800px;margin:0 auto" data-aos="fade-up">${bullets}</ul>` : ''}
      </div>
    </section>`;
  }

  return `
    <section class="page-hero">
      <div class="container">
        <span class="section-badge">Our Services</span>
        <h1>${esc(heroH1)}</h1>
        <p>${esc(heroSub)}</p>
      </div>
    </section>
    ${bodyContent || `
    <section style="padding:80px 0">
      <div class="container">
        <div class="section-header" data-aos="fade-up">
          <h2>${esc(heroH1)}</h2>
          <p class="section-desc">${esc(heroSub)}</p>
        </div>
      </div>
    </section>`}
    ${renderCoreValues()}
    ${renderTestimonials(site)}
    ${renderCTA(site)}`;
}

function cityContent(site: Record<string, any>, page: Record<string, any>): string {
  const biz = site.business_name || DEFAULTS.businessName;
  const phone = site.phone || DEFAULTS.phone;
  const cityName = (page.city_name as string) || (page.title as string) || '';
  const heroH1 = (page.hero_h1 as string) || `Professional Painting Services in ${cityName}, CA`;
  const heroSub = (page.hero_subtitle as string) || `Trusted painting contractor serving ${cityName} and surrounding areas.`;
  const sections = (page.content_sections || []) as { heading: string; body: string; bullets?: string[] }[];
  const faq = (page.faq || []) as { question: string; answer: string }[];

  let bodyContent = '';
  for (const sec of sections) {
    const bullets = (sec.bullets || []).map(b => `<li><i class="fas fa-check-circle"></i> ${esc(b)}</li>`).join('');
    bodyContent += `
    <section style="padding:60px 0">
      <div class="container">
        <h2 style="font-size:28px;margin-bottom:16px" data-aos="fade-up">${esc(sec.heading)}</h2>
        <p style="font-size:17px;color:var(--text-light);line-height:1.8;margin-bottom:20px" data-aos="fade-up">${esc(sec.body)}</p>
        ${bullets ? `<ul class="service-features-list" data-aos="fade-up">${bullets}</ul>` : ''}
      </div>
    </section>`;
  }

  return `
    <section class="page-hero">
      <div class="container">
        <span class="section-badge">${esc(cityName)} Painting</span>
        <h1>${esc(heroH1)}</h1>
        <p>${esc(heroSub)}</p>
      </div>
    </section>
    ${bodyContent}
    ${renderTrustBadges(site)}
    ${renderWhyDifferent()}
    ${renderFAQ(faq)}
    ${renderServiceAreas(site)}
    ${renderTestimonials(site)}
    ${renderCTA(site)}`;
}

function cityServiceContent(site: Record<string, any>, page: Record<string, any>): string {
  const cityName = (page.city_name as string) || '';
  const serviceName = (page.service_name as string) || '';
  const heroH1 = (page.hero_h1 as string) || `${serviceName} in ${cityName}, CA`;
  const heroSub = (page.hero_subtitle as string) || `Professional ${serviceName.toLowerCase()} services in ${cityName} and surrounding areas.`;
  const sections = (page.content_sections || []) as { heading: string; body: string; bullets?: string[] }[];
  const faq = (page.faq || []) as { question: string; answer: string }[];

  let bodyContent = '';
  for (const sec of sections) {
    const bullets = (sec.bullets || []).map(b => `<li><i class="fas fa-check-circle"></i> ${esc(b)}</li>`).join('');
    bodyContent += `
    <section style="padding:60px 0">
      <div class="container">
        <h2 style="font-size:28px;margin-bottom:16px" data-aos="fade-up">${esc(sec.heading)}</h2>
        <p style="font-size:17px;color:var(--text-light);line-height:1.8;margin-bottom:20px" data-aos="fade-up">${esc(sec.body)}</p>
        ${bullets ? `<ul class="service-features-list" data-aos="fade-up">${bullets}</ul>` : ''}
      </div>
    </section>`;
  }

  return `
    <section class="page-hero">
      <div class="container">
        <span class="section-badge">${esc(cityName)} ${esc(serviceName)}</span>
        <h1>${esc(heroH1)}</h1>
        <p>${esc(heroSub)}</p>
      </div>
    </section>
    ${bodyContent}
    ${renderTrustBadges(site)}
    ${renderFAQ(faq)}
    ${renderCTA(site)}`;
}

function genericContent(site: Record<string, any>, page: Record<string, any>): string {
  const heroH1 = (page.hero_h1 as string) || (page.title as string) || 'Page';
  const heroSub = (page.hero_subtitle as string) || '';
  const sections = (page.content_sections || []) as { heading: string; body: string; bullets?: string[] }[];

  let bodyContent = '';
  for (const sec of sections) {
    const bullets = (sec.bullets || []).map(b => `<li>${esc(b)}</li>`).join('');
    bodyContent += `
    <section style="padding:60px 0">
      <div class="container" style="max-width:900px">
        <h2 style="font-size:28px;margin-bottom:16px">${esc(sec.heading)}</h2>
        <p style="font-size:17px;color:var(--text-light);line-height:1.8;margin-bottom:20px">${esc(sec.body)}</p>
        ${bullets ? `<ul style="padding-left:24px;font-size:16px;line-height:2">${bullets}</ul>` : ''}
      </div>
    </section>`;
  }

  return `
    <section class="page-hero">
      <div class="container">
        <h1>${esc(heroH1)}</h1>
        ${heroSub ? `<p>${esc(heroSub)}</p>` : ''}
      </div>
    </section>
    ${bodyContent || '<section style="padding:80px 0"><div class="container"><p>Content coming soon.</p></div></section>'}
    ${renderCTA(site)}`;
}

// ---------------------------------------------------------------------------
// WRAP PAGE
// ---------------------------------------------------------------------------
function wrapPage(site: Record<string, any>, page: Record<string, any>, allPages: Record<string, any>[], body: string): string {
  const schemaJson = buildLocalBusinessSchema(site);
  return [
    renderHead(site, page, schemaJson),
    '<body>',
    renderNavbar(site, page, allPages),
    '<main>',
    body,
    '</main>',
    renderFooter(site),
    renderScripts(site),
    '</body>',
    '</html>',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// MAIN EXPORT
// ---------------------------------------------------------------------------
export function assembleAranaPaintingPage(
  site: Record<string, any>,
  page: Record<string, any>,
  allPages: Record<string, any>[],
): string {
  const slug = (page.slug as string) || '';
  const pageType = (page.page_type as string) || '';
  const normalizedSlug = slug.replace(/^\/+/, '').replace(/\/+$/, '') || 'home';

  let body: string;

  if (normalizedSlug === 'home' || normalizedSlug === '' || normalizedSlug === 'index' || pageType === 'home' || pageType === 'homepage') {
    body = homeContent(site, page);
  } else if (normalizedSlug === 'about' || pageType === 'about') {
    body = aboutContent(site, page);
  } else if (normalizedSlug === 'services' || pageType === 'services') {
    body = servicesContent(site, page);
  } else if (normalizedSlug === 'portfolio' || pageType === 'portfolio' || normalizedSlug === 'gallery') {
    body = portfolioContent(site, page);
  } else if (normalizedSlug === 'contact' || pageType === 'contact') {
    body = contactContent(site, page);
  } else if (pageType === 'city_service') {
    body = cityServiceContent(site, page);
  } else if (pageType === 'city') {
    body = cityContent(site, page);
  } else if (pageType === 'service' || normalizedSlug.startsWith('services/')) {
    body = serviceDetailContent(site, page);
  } else {
    body = genericContent(site, page);
  }

  return wrapPage(site, page, allPages, body);
}
