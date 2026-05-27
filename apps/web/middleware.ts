import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n';

export default createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
});

// Apply only to public marketing pages. Dashboard, login, API routes,
// Next internals and static assets are excluded.
export const config = {
  matcher: ['/((?!api|_next|_vercel|login|dashboard|favicon\\.ico|.*\\..*).*)'],
};
