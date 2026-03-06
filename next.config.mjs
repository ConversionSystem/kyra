/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: serverExternalPackages may not fully work on Cloudflare Workers
  // but OpenNext has better Node.js compat than next-on-pages
  serverExternalPackages: ['ws'],

  experimental: {
    // Prevent build errors from dynamic routes
  },

  // ─── Security Headers ────────────────────────────────────────────────────
  // Applied to all routes. Do not loosen without a security review.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Prevent MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // XSS protection (legacy browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Referrer policy — don't leak full URL to third parties
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Only send HTTPS (1 year, include subdomains)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Restrict browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Content Security Policy
          // 'unsafe-inline' and 'unsafe-eval' required for Next.js/React in production.
          // Tighten as the app matures (remove unsafe-eval once no eval deps remain).
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.openai.com https://api.anthropic.com https://*.kyra.conversionsystem.com wss://*.kyra.conversionsystem.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
