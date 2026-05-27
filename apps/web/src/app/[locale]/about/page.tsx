import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '../_components/SiteHeader';
import { SiteFooter } from '../_components/SiteFooter';

export default function AboutPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = useTranslations('about');

  return (
    <main className="min-h-screen bg-white text-brand-neutral-900">
      <SiteHeader active="about" />

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="font-serif text-4xl font-semibold">{t('title')}</h1>
        <p className="mt-6 max-w-3xl text-lg text-brand-neutral-500">{t('intro')}</p>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-neutral-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-2xl font-semibold">{t('region_title')}</h2>
          <p className="mt-4 max-w-3xl text-brand-neutral-500">{t('region_body')}</p>
          <div className="mt-8 rounded-lg border border-brand-neutral-100 bg-white p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold text-brand-green-700">{t('us_title')}</h3>
                <p className="mt-2 text-sm text-brand-neutral-500">{t('us_body')}</p>
              </div>
              <div>
                <h3 className="font-semibold text-brand-green-700">{t('bf_title')}</h3>
                <p className="mt-2 text-sm text-brand-neutral-500">{t('bf_body')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-2xl font-semibold">{t('compliance_title')}</h2>
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {(['who_gmp', 'dgpml', 'qa'] as const).map((key) => (
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
