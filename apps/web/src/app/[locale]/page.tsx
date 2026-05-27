import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { SiteHeader } from './_components/SiteHeader';
import { SiteFooter } from './_components/SiteFooter';

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = useTranslations('home');
  const prefix = `/${locale}`;

  return (
    <main className="min-h-screen bg-white text-brand-neutral-900">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="whitespace-pre-line font-serif text-5xl font-semibold leading-tight text-brand-neutral-900">
          {t('title')}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-brand-neutral-500">{t('subtitle')}</p>
        <div className="mt-10 flex gap-4">
          <Link
            href={`${prefix}/contact?intent=partnership`}
            className="rounded-md bg-brand-green-700 px-6 py-3 text-white hover:bg-brand-green-800"
          >
            {t('cta_partnership')}
          </Link>
          <Link
            href={`${prefix}/products`}
            className="rounded-md border border-brand-neutral-100 px-6 py-3 text-brand-neutral-900 hover:bg-brand-neutral-50"
          >
            {t('cta_catalog')}
          </Link>
        </div>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-neutral-50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-20 md:grid-cols-3">
          {(['feature1', 'feature2', 'feature3'] as const).map((key) => (
            <div key={key}>
              <h3 className="font-semibold text-brand-green-700">{t(`${key}_title`)}</h3>
              <p className="mt-3 text-sm text-brand-neutral-500">{t(`${key}_body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
