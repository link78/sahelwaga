import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '../_components/SiteHeader';
import { SiteFooter } from '../_components/SiteFooter';

export default function BuyersPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = useTranslations('buyers');
  const prefix = `/${locale}`;

  return (
    <main className="min-h-screen bg-white text-brand-neutral-900">
      <SiteHeader active="buyers" />

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="font-serif text-4xl font-semibold">{t('title')}</h1>
        <p className="mt-6 max-w-3xl text-lg text-brand-neutral-500">{t('intro')}</p>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-neutral-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-2xl font-semibold">{t('how_title')}</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-4">
            {(['step1', 'step2', 'step3', 'step4'] as const).map((key, i) => (
              <div key={key}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green-100 text-brand-green-700 font-semibold">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-sm font-semibold">{t(`${key}_title`)}</h3>
                <p className="mt-2 text-sm text-brand-neutral-500">{t(`${key}_body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-2xl font-semibold">{t('info_title')}</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {(['min_order', 'lead_times', 'docs'] as const).map((k) => (
            <div key={k} className="rounded-lg border border-brand-neutral-100 p-6">
              <h3 className="font-semibold text-brand-green-700">{t(`${k}_title`)}</h3>
              <p className="mt-3 text-sm text-brand-neutral-500">{t(`${k}_body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-green-50">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="font-serif text-2xl font-semibold">{t('cta_title')}</h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-neutral-500">{t('cta_body')}</p>
          <Link
            href={`${prefix}/contact?intent=buyer`}
            className="mt-8 inline-block rounded-md bg-brand-green-700 px-6 py-3 text-white hover:bg-brand-green-800"
          >
            {t('cta_button')}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
