// ============================================================================
// Design Quality Checker — AI Slop Detection + Visual Quality Scoring
//
// Inspired by gstack's /design-review methodology (Garry Tan's design checklist).
// Catches the patterns that make AI-generated sites look generic:
// - Purple/indigo gradient overuse
// - 3-column icon grids (the #1 AI slop pattern)
// - "Centered everything" syndrome
// - Generic hero copy
// - Missing interaction states
// - Layout width issues
//
// Runs after HTML assembly, before deploy. Produces a 0-100 design score
// that complements the structural quality score from html-quality-checker.ts.
// ============================================================================

export interface DesignQualityResult {
  score: number;          // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: DesignIssue[];
  slopScore: number;      // 0-100 (lower = more AI slop detected)
  passedChecks: string[];  // What's good about this page
}

export interface DesignIssue {
  category: 'ai-slop' | 'typography' | 'layout' | 'interaction' | 'content' | 'accessibility';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestion: string;
}

// ---------- AI Slop Patterns (adapted from gstack's design-checklist.md) ----------

const GENERIC_HERO_PHRASES = [
  'welcome to',
  'unlock the power',
  'your all-in-one solution',
  'revolutionize your',
  'streamline your workflow',
  'take your .* to the next level',
  'in today\'s fast-paced',
  'trusted by thousands',
  'the future of',
  'experience the difference',
  'discover the',
  'transform your .* today',
  'empower your',
];

const SLOP_PHRASES = [
  'we pride ourselves',
  'your satisfaction is our priority',
  'don\'t hesitate to contact',
  'dedicated to excellence',
  'state-of-the-art',
  'second to none',
  'look no further',
  'one-stop shop',
  'cutting-edge',
  'leverage our expertise',
  'industry-leading',
  'best-in-class',
  'world-class',
  'unparalleled',
  'seamless experience',
  'holistic approach',
];

// ---------- Main Checker ----------

export function checkDesignQuality(html: string): DesignQualityResult {
  const issues: DesignIssue[] = [];
  const passedChecks: string[] = [];
  let score = 100;
  let slopScore = 100;

  const lower = html.toLowerCase();

  // =============================================
  // 1. AI SLOP DETECTION (highest priority)
  // =============================================

  // 1a. Purple/indigo gradient overuse
  const purpleGradients = (html.match(/linear-gradient[^;]*(?:#6366f1|#8b5cf6|#7c3aed|#a855f7|#9333ea|indigo|violet|purple)[^;]*/gi) || []).length;
  if (purpleGradients >= 3) {
    issues.push({
      category: 'ai-slop',
      severity: 'warning',
      message: `${purpleGradients} purple/indigo gradients detected — this is the #1 AI-generated design pattern`,
      suggestion: 'Use the business brand colors instead. Purple gradients are a telltale sign of AI-generated UI.',
    });
    slopScore -= 15;
    score -= 5;
  } else {
    passedChecks.push('No purple gradient overuse');
  }

  // 1b. 3-column icon grid pattern
  // Look for exactly 3 similar card/grid children with icon + heading + paragraph
  const gridMatches = html.match(/grid-cols-3|grid grid-cols-1 sm:grid-cols-3/gi) || [];
  const iconCircles = (html.match(/border-radius:\s*50%|rounded-full.*(?:bg-|background)/gi) || []).length;
  if (gridMatches.length >= 2 && iconCircles >= 6) {
    issues.push({
      category: 'ai-slop',
      severity: 'info',
      message: 'Multiple 3-column icon grids with circular icons detected — common AI pattern',
      suggestion: 'Vary grid columns (2, 4, or asymmetric). Use non-circular icon containers or inline icons.',
    });
    slopScore -= 10;
  }

  // 1c. "Centered everything" syndrome
  const textCenterCount = (html.match(/text-center|text-align:\s*center/gi) || []).length;
  const totalTextBlocks = (html.match(/<(?:p|h[1-6]|div|section)[^>]*>/gi) || []).length;
  const centerRatio = totalTextBlocks > 0 ? textCenterCount / totalTextBlocks : 0;
  if (centerRatio > 0.6 && textCenterCount > 10) {
    issues.push({
      category: 'ai-slop',
      severity: 'warning',
      message: `${Math.round(centerRatio * 100)}% of text containers are center-aligned — AI-generated UIs center everything`,
      suggestion: 'Left-align body text and service descriptions. Center only headings and CTAs.',
    });
    slopScore -= 10;
    score -= 3;
  } else {
    passedChecks.push('Good text alignment variety');
  }

  // 1d. Generic hero copy
  for (const phrase of GENERIC_HERO_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    if (regex.test(lower)) {
      issues.push({
        category: 'ai-slop',
        severity: 'warning',
        message: `Generic hero phrase detected: "${phrase}"`,
        suggestion: 'Replace with business-specific language that mentions the actual service or location.',
      });
      slopScore -= 8;
      score -= 2;
      break; // Only flag once
    }
  }

  // 1e. Slop phrases in body copy
  let slopCount = 0;
  for (const phrase of SLOP_PHRASES) {
    if (lower.includes(phrase)) slopCount++;
  }
  if (slopCount >= 3) {
    issues.push({
      category: 'ai-slop',
      severity: 'warning',
      message: `${slopCount} generic AI-copywriting phrases found in content`,
      suggestion: 'Rewrite with specific details about the business. "We pride ourselves" → mention the actual thing they do well.',
    });
    slopScore -= slopCount * 3;
    score -= slopCount;
  } else if (slopCount === 0) {
    passedChecks.push('No generic AI copy phrases detected');
  }

  // =============================================
  // 2. TYPOGRAPHY
  // =============================================

  // 2a. Heading hierarchy
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  const h3Count = (html.match(/<h3[\s>]/gi) || []).length;

  if (h1Count === 1 && h2Count >= 2) {
    passedChecks.push('Proper heading hierarchy (1 H1, multiple H2s)');
  }
  if (h1Count > 1) {
    issues.push({
      category: 'typography',
      severity: 'warning',
      message: `${h1Count} H1 headings found — should be exactly 1 per page`,
      suggestion: 'Demote extra H1s to H2. A page should have one primary heading.',
    });
    score -= 3;
  }

  // 2b. Skip heading levels (h1 → h3 without h2)
  // Note: h1 count is also checked by html-quality-checker.ts (structural check).
  // This design checker focuses on hierarchy/skip patterns which are design concerns.
  if (h1Count > 0 && h3Count > 0 && h2Count === 0) {
    issues.push({
      category: 'typography',
      severity: 'warning',
      message: 'Heading hierarchy skips H2 (jumps from H1 to H3)',
      suggestion: 'Add H2 headings between H1 and H3 for proper document structure.',
    });
    score -= 3;
  }

  // =============================================
  // 3. LAYOUT
  // =============================================

  // 3a. Narrow max-width (the minimal style bug we fixed)
  const narrowWidths = (html.match(/max-width:\s*(?:3[0-9]|4[0-2])rem/gi) || []).length;
  if (narrowWidths > 0) {
    issues.push({
      category: 'layout',
      severity: 'critical',
      message: `${narrowWidths} element(s) with max-width under 42rem — will appear very narrow on desktop`,
      suggestion: 'Use max-width: 64rem (1024px) or wider for main content sections.',
    });
    score -= 10;
  } else {
    passedChecks.push('No overly narrow layout constraints');
  }

  // 3b. Check for responsive design
  const hasSmBreakpoint = html.includes('sm:');
  const hasMdBreakpoint = html.includes('md:');
  const hasLgBreakpoint = html.includes('lg:');
  const responsiveCount = [hasSmBreakpoint, hasMdBreakpoint, hasLgBreakpoint].filter(Boolean).length;

  if (responsiveCount >= 2) {
    passedChecks.push('Multiple responsive breakpoints detected');
  } else if (responsiveCount === 0) {
    issues.push({
      category: 'layout',
      severity: 'critical',
      message: 'No responsive breakpoints found — site may not be mobile-friendly',
      suggestion: 'Add sm:, md:, lg: Tailwind prefixes for responsive layouts.',
    });
    score -= 10;
  }

  // =============================================
  // 4. INTERACTION & ACCESSIBILITY
  // =============================================

  // 4a. Phone number is clickable
  const hasPhoneLink = lower.includes('tel:');
  if (hasPhoneLink) {
    passedChecks.push('Phone number is clickable (tel: link)');
  } else if (html.match(/\d{3}[-.)\s]\d{3}[-.)\s]\d{4}/)) {
    issues.push({
      category: 'interaction',
      severity: 'warning',
      message: 'Phone number found but not wrapped in a tel: link',
      suggestion: 'Wrap phone numbers in <a href="tel:+1XXXXXXXXXX"> for mobile tap-to-call.',
    });
    score -= 3;
  }

  // 4b. CTA buttons exist
  const ctaLinks = (html.match(/(?:book|call|schedule|contact|get.*(?:quote|estimate|started))/gi) || []).length;
  if (ctaLinks >= 2) {
    passedChecks.push('Multiple call-to-action elements found');
  } else if (ctaLinks === 0) {
    issues.push({
      category: 'interaction',
      severity: 'critical',
      message: 'No clear call-to-action elements found (book, call, schedule, contact)',
      suggestion: 'Add prominent CTAs above the fold and after each section.',
    });
    score -= 10;
  }

  // 4c. ARIA labels on sections
  const sectionCount = (html.match(/<section/gi) || []).length;
  const ariaLabeledSections = (html.match(/<section[^>]*aria-label/gi) || []).length;
  if (sectionCount > 0 && ariaLabeledSections === sectionCount) {
    passedChecks.push('All sections have aria-label attributes');
  } else if (sectionCount > 0 && ariaLabeledSections < sectionCount / 2) {
    issues.push({
      category: 'accessibility',
      severity: 'info',
      message: `Only ${ariaLabeledSections}/${sectionCount} sections have aria-labels`,
      suggestion: 'Add aria-label to all <section> elements for screen reader navigation.',
    });
    score -= 2;
  }

  // =============================================
  // 5. CONTENT QUALITY
  // =============================================

  // 5a. Page has enough content (not thin)
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = textContent.split(' ').length;
  if (wordCount < 200) {
    issues.push({
      category: 'content',
      severity: 'warning',
      message: `Page has only ~${wordCount} words — too thin for SEO and user trust`,
      suggestion: 'Aim for 500+ words on homepage, 300+ on service pages.',
    });
    score -= 8;
  } else if (wordCount >= 500) {
    passedChecks.push(`Good content depth (${wordCount} words)`);
  }

  // 5b. Page mentions business name at least 3 times
  // We can't check this without knowing the business name, so skip

  // 5c. Has FAQ section
  if (lower.includes('faq') || lower.includes('frequently asked') || lower.includes('<details')) {
    passedChecks.push('FAQ section present');
  }

  // 5d. Has schema markup
  if (lower.includes('application/ld+json')) {
    passedChecks.push('Schema markup (JSON-LD) present');
  }

  // =============================================
  // SCORING
  // =============================================

  slopScore = Math.max(0, Math.min(100, slopScore));
  score = Math.max(0, Math.min(100, score));

  const grade: DesignQualityResult['grade'] =
    score >= 90 ? 'A' :
    score >= 75 ? 'B' :
    score >= 60 ? 'C' :
    score >= 40 ? 'D' : 'F';

  return {
    score,
    grade,
    issues,
    slopScore,
    passedChecks,
  };
}
