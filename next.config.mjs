/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: serverExternalPackages may not fully work on Cloudflare Workers
  // but OpenNext has better Node.js compat than next-on-pages
  serverExternalPackages: ['ws'],

  experimental: {
    // Prevent build errors from dynamic routes
  },
};

export default nextConfig;
