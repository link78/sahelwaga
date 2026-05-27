import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '../_components/SiteHeader';
import { SiteFooter } from '../_components/SiteFooter';

export default function ManufacturersPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = useTranslations('manufacturers');
  const prefix = `/${locale}`;

  return (
    <main className="min-h-screen bg-white text-brand-neutral-900">
      <SiteHeader active="manufacturers" />

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="font-serif text-4xl font-semibold">{t('title')}</h1>
        <p className="mt-6 max-w-3xl text-lg text-brand-neutral-500">{t('intro')}</p>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-neutral-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-2xl font-semibold">{t('how_title')}</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            {(['step1', 'step2', 'step3'] as const).map((key, i) => (
              <div key={key}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green-100 text-brand-green-700 font-semibold">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-semibold">{t(`${key}_title`)}</h3>
                <p className="mt-2 text-sm text-brand-neutral-500">{t(`${key}_body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-2xl font-semibold">{t('criteria_title')}</h2>
        <ul className="mt-6 space-y-3 text-brand-neutral-500">
          {(['criteria1', 'criteria2', 'criteria3', 'criteria4', 'criteria5'] as const).map((k) => (
            <li key={k} className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-green-500" />
              {t(k)}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-green-50">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="font-serif text-2xl font-semibold">{t('cta_title')}</h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-neutral-500">{t('cta_body')}</p>
          <Link
            href={`${prefix}/contact?intent=supplier`}
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
