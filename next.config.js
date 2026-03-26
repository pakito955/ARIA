/** @type {import('next').NextConfig} */

const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? (() => { try { return require('@next/bundle-analyzer')({ enabled: true }) } catch { return (c) => c } })()
  : (c) => c

const nextConfig = {
  serverExternalPackages: ['@prisma/client'],

  // Compress all responses with gzip/brotli
  compress: true,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
    // Serve optimized WebP/AVIF automatically
    formats: ['image/avif', 'image/webp'],
  },

  // Remove console.* in production (keeps console.error)
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error'] }
        : false,
  },

  experimental: {
    // Tree-shake only imported items from large packages
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
    ],
  },

  // HTTP security + perf headers for all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // Aggressively cache static assets — they're content-hashed
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache public fonts/images for 7 days
        source: '/fonts/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
    ]
  },
}

module.exports = withBundleAnalyzer(nextConfig)
