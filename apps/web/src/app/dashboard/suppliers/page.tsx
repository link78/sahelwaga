'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Supplier {
  id: string;
  name: string;
  country: string;
  status: string;
  whoGmpStatus: string;
  rating: string | null;
}

interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export default function SuppliersPage() {
  const [data, setData] = useState<Paginated<Supplier> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/suppliers`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold">Suppliers</h1>
        <button
          className="rounded-md bg-brand-green-700 px-4 py-2 text-white hover:bg-brand-green-800"
          disabled
          title="Create form lands in Phase 1"
        >
          New supplier
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-lg border border-brand-neutral-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-neutral-50 text-left text-xs uppercase tracking-wide text-brand-neutral-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">WHO-GMP</th>
              <th className="px-4 py-3">Rating</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((s) => (
              <tr key={s.id} className="border-t border-brand-neutral-100">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">{s.country}</td>
                <td className="px-4 py-3">{s.status}</td>
                <td className="px-4 py-3">{s.whoGmpStatus}</td>
                <td className="px-4 py-3">{s.rating ?? '—'}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-neutral-500">
                  No suppliers yet. Run <code>pnpm db:seed</code> to load demo data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
