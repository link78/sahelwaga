import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'fr'] as const;
export const defaultLocale = 'en';
export type AppLocale = (typeof locales)[number];

// next-intl 3.22+ replaced the synchronous `{ locale }` argument with an
// async `requestLocale` promise (the middleware now sets it via a request
// header so it can be read in Server Components without prop drilling).
// See: https://next-intl.dev/blog/next-intl-3-22#await-request-locale
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = (locales as readonly string[]).includes(requested ?? '')
    ? (requested as AppLocale)
    : defaultLocale;
  if (!(locales as readonly string[]).includes(locale)) notFound();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
