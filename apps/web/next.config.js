const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a self-contained server bundle (`.next/standalone`) so the
  // production container ships only the files it needs and starts with a
  // much smaller memory footprint. This avoids the out-of-memory restarts
  // that surface as a Railway 502 (no healthy upstream) on constrained
  // plans. In a pnpm monorepo Next must trace files from the workspace root
  // so the hoisted `node_modules` are included.
  output: 'standalone',
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
  experimental: {
    typedRoutes: false,
  },
  async redirects() {
    return [
      // Ensure the bare root path always lands on the default locale.
      // next-intl's middleware normally handles this, but defining an
      // explicit redirect guarantees a proper HTTP 308 with a Location
      // header for clients that bypass middleware (e.g. some proxies
      // or static-cache hits).
      {
        source: '/',
        destination: '/en',
        permanent: false,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
