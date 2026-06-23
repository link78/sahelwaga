import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '../_components/SiteHeader';
import { SiteFooter } from '../_components/SiteFooter';
import { CatalogClient } from './CatalogClient';
import { getServerApiBaseUrl } from '../../../lib/api';

interface CatalogProduct {
  id: string;
  name: string;
  inn: string | null;
  category:
    | 'ANTIBIOTIC'
    | 'ANTIMALARIAL'
    | 'PAINKILLER'
    | 'PEDIATRIC_SYRUP'
    | 'IV_FLUID'
    | 'CONSUMABLE'
    | 'OTHER';
  form: string | null;
  strength: string | null;
  packSize: string | null;
  storageConditions: string | null;
  manufacturer: string | null;
  manufacturerCountry: string | null;
}

async function fetchCatalog(): Promise<{ items: CatalogProduct[]; error: string | null }> {
  const base = getServerApiBaseUrl();
  const url = `${base}/public/products`;
  try {
    const res = await fetch(url, {
      // The marketing catalog changes rarely — cache briefly at the edge.
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      // Surface non-2xx responses in server logs so deployment failures
      // (e.g. API host not reachable, 502 from reverse proxy) are
      // diagnosable instead of silently showing the generic error string.
      // eslint-disable-next-line no-console
      console.error(
        `[products] catalog fetch ${url} returned HTTP ${res.status}`,
      );
      return { items: [], error: 'http-error' };
    }
    const data = (await res.json()) as { items: CatalogProduct[] };
    return { items: data.items, error: null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[products] catalog fetch ${url} threw`, err);
    return { items: [], error: 'fetch-error' };
  }
}

export default async function ProductsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('products');
  const { items, error } = await fetchCatalog();

  return (
    <main className="min-h-screen bg-white text-brand-neutral-900">
      <SiteHeader active="products" />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="font-serif text-4xl font-semibold">{t('title')}</h1>
        <p className="mt-4 max-w-2xl text-brand-neutral-500">{t('subtitle')}</p>
        <CatalogClient initialItems={items} initialError={error ? t('error') : null} />
      </section>

      <SiteFooter />
    </main>
  );
}
