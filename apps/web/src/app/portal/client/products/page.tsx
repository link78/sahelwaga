'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Product {
  id: string;
  name: string;
  inn: string | null;
  category: string;
  form: string | null;
  strength: string | null;
  packSize: string | null;
  status: string;
}

interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number }

export default function ClientPortalCatalogPage() {
  const [data, setData] = useState<Paginated<Product> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('q', search);
    fetch(`${API_URL}/products?${params}`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? 'Failed'); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [page, search]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Catalog</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">
        Browse products Sahel Pharma can supply. Contact your account manager to add a line to your next order.
      </p>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-sm rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-lg border border-brand-neutral-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-neutral-50 text-left text-xs uppercase tracking-wide text-brand-neutral-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">INN</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Form / Strength</th>
              <th className="px-4 py-3">Pack</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id} className="border-t border-brand-neutral-100">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.inn ?? '—'}</td>
                <td className="px-4 py-3">{p.category.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3">{[p.form, p.strength].filter(Boolean).join(' / ') || '—'}</td>
                <td className="px-4 py-3">{p.packSize ?? '—'}</td>
                <td className="px-4 py-3">{p.status}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-neutral-500">No products available.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="rounded-md border border-brand-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
          <span className="text-sm text-brand-neutral-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="rounded-md border border-brand-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
