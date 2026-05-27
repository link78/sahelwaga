'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Product {
  id: string;
  name: string;
  category: string;
  status: string;
  form: string | null;
  strength: string | null;
  packSize: string | null;
}

interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export default function ProductsPage() {
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
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [page, search]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold">Products</h1>
        <Link
          href="/dashboard/products/new"
          className="rounded-md bg-brand-green-700 px-4 py-2 text-white hover:bg-brand-green-800"
        >
          New product
        </Link>
      </div>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full max-w-sm rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-lg border border-brand-neutral-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-neutral-50 text-left text-xs uppercase tracking-wide text-brand-neutral-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Form</th>
              <th className="px-4 py-3">Strength</th>
              <th className="px-4 py-3">Pack size</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id} className="border-t border-brand-neutral-100">
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/dashboard/products/${p.id}`}
                    className="text-brand-green-700 hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">{p.form ?? '—'}</td>
                <td className="px-4 py-3">{p.strength ?? '—'}</td>
                <td className="px-4 py-3">{p.packSize ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      'inline-block rounded-full px-2 py-0.5 text-xs font-medium ' +
                      (p.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : p.status === 'DRAFT'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800')
                    }
                  >
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-neutral-500">
                  No products yet. Run <code>pnpm db:seed</code> to load demo data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-brand-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-brand-neutral-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-brand-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
