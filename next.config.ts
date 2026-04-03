import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for Capacitor static export builds
  // Comment this out for standard Vercel / server deployments
  // output: 'export',

  // Keep Puppeteer + Chromium as external Node modules — they use native
  // binaries and cannot be bundled by webpack. Required for PDF generation
  // to work correctly on Vercel serverless functions.
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],

  // Force Next.js file tracing to include the Chromium binary assets (.br files)
  // for the PDF route. Without this, the bin/ directory is excluded from the
  // Vercel Lambda bundle and executablePath() fails at runtime.
  outputFileTracingIncludes: {
    '/api/pdf/generate': ['./node_modules/@sparticuz/chromium/**/*'],
  },

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


