'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

const CATEGORIES = [
  'ANTIBIOTIC',
  'ANTIMALARIAL',
  'PAINKILLER',
  'PEDIATRIC_SYRUP',
  'IV_FLUID',
  'CONSUMABLE',
  'OTHER',
] as const;

interface CatalogProduct {
  id: string;
  name: string;
  inn: string | null;
  category: (typeof CATEGORIES)[number];
  form: string | null;
  strength: string | null;
  packSize: string | null;
  storageConditions: string | null;
  manufacturer: string | null;
  manufacturerCountry: string | null;
}

interface CatalogClientProps {
  initialItems: CatalogProduct[];
  initialError?: string | null;
}

export function CatalogClient({ initialItems, initialError }: CatalogClientProps) {
  const t = useTranslations('products');
  const [items, setItems] = useState<CatalogProduct[]>(initialItems);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [category, setCategory] = useState<'ALL' | (typeof CATEGORIES)[number]>('ALL');
  const [form, setForm] = useState<string>('ALL');

  // Re-fetch when the category filter changes so search hits the API.
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (category !== 'ALL') params.set('category', category);
    fetch(`/public/products?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { items: CatalogProduct[] }) => {
        if (!cancelled) {
          setItems(data.items);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError(t('error'));
      });
    return () => {
      cancelled = true;
    };
  }, [category, t]);

  const forms = useMemo(() => {
    const set = new Set<string>();
    for (const p of items) if (p.form) set.add(p.form);
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(
    () => items.filter((p) => form === 'ALL' || p.form === form),
    [items, form],
  );

  return (
    <>
      <div className="mt-10 flex flex-wrap gap-4">
        <div>
          <label htmlFor="category-filter" className="block text-xs font-medium text-brand-neutral-500">
            {t('filter_category')}
          </label>
          <select
            id="category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value as 'ALL' | (typeof CATEGORIES)[number])}
            className="mt-1 rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
          >
            <option value="ALL">{t('all')}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`category.${c}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="form-filter" className="block text-xs font-medium text-brand-neutral-500">
            {t('filter_form')}
          </label>
          <select
            id="form-filter"
            value={form}
            onChange={(e) => setForm(e.target.value)}
            className="mt-1 rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
          >
            <option value="ALL">{t('all')}</option>
            {forms.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-neutral-100 text-xs uppercase text-brand-neutral-500">
            <tr>
              <th className="px-3 py-3">{t('col_name')}</th>
              <th className="px-3 py-3">{t('col_strength')}</th>
              <th className="px-3 py-3">{t('col_form')}</th>
              <th className="px-3 py-3">{t('col_packSize')}</th>
              <th className="px-3 py-3">{t('col_category')}</th>
              <th className="px-3 py-3">{t('col_manufacturer')}</th>
              <th className="px-3 py-3">{t('col_storage')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id} className="border-b border-brand-neutral-100">
                <td className="px-3 py-3 font-medium">{product.name}</td>
                <td className="px-3 py-3">{product.strength ?? '—'}</td>
                <td className="px-3 py-3">{product.form ?? '—'}</td>
                <td className="px-3 py-3">{product.packSize ?? '—'}</td>
                <td className="px-3 py-3">{t(`category.${product.category}`)}</td>
                <td className="px-3 py-3">{product.manufacturer ?? '—'}</td>
                <td className="px-3 py-3 text-xs text-brand-neutral-500">
                  {product.storageConditions ?? '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-brand-neutral-500">
                  {t('empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
