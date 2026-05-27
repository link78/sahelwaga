const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
