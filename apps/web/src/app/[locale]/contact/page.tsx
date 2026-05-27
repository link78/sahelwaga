import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '../_components/SiteHeader';
import { SiteFooter } from '../_components/SiteFooter';
import { ContactForm } from './ContactForm';

export default async function ContactPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('contact');

  return (
    <main className="min-h-screen bg-white text-brand-neutral-900">
      <SiteHeader active="contact" />

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="font-serif text-4xl font-semibold">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-brand-neutral-500">{t('subtitle')}</p>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-neutral-50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 px-6 py-20 md:grid-cols-2">
          <div>
            <ContactForm />
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-brand-green-700">{t('us_hq')}</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-brand-neutral-500">
                {t('us_address')}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-brand-green-700">{t('bf_ops')}</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-brand-neutral-500">
                {t('bf_address')}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-brand-green-700">{t('hours_title')}</h3>
              <p className="mt-2 whitespace-pre-line text-sm text-brand-neutral-500">
                {t('hours_body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
