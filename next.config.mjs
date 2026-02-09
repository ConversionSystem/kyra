/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for OpenClaw WS client (uses Node.js http, crypto, events)
  serverExternalPackages: ['ws'],
  
  // Opt-in to dynamic rendering for auth and dashboard pages
  experimental: {
    // Prevent build errors from dynamic routes
  },
};

export default nextConfig;
