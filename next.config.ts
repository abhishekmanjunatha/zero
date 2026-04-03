import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for Capacitor static export builds
  // Comment this out for standard Vercel / server deployments
  // output: 'export',

  // Keep Puppeteer + Chromium as external Node modules — they use native
  // binaries and cannot be bundled by webpack. Required for PDF generation
  // to work correctly on Vercel serverless functions.
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],

  turbopack: {
    // Silence workspace root detection warning
    root: __dirname,
  },

  images: {
    // Allow Supabase storage images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'twoesyyxaypygyajhdtd.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig


