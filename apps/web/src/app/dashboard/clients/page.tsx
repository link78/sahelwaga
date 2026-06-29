'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { API_BASE_URL as API_URL } from '../../../lib/api';

interface Client {
  id: string;
  name: string;
  type: string;
  country: string;
  city: string | null;
  status: string;
  creditTermsDays: number | null;
}

interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export default function ClientsPage() {
  const [data, setData] = useState<Paginated<Client> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('q', search);

    fetch(`${API_URL}/clients?${params}`, {
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
        <h1 className="font-serif text-3xl font-semibold">Clients</h1>
        <Link
          href="/dashboard/clients/new"
          className="rounded-md bg-brand-green-700 px-4 py-2 text-white hover:bg-brand-green-800"
        >
          New client
        </Link>
      </div>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Search clients…"
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
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Credit terms</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((c) => (
              <tr key={c.id} className="border-t border-brand-neutral-100">
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/dashboard/clients/${c.id}`}
                    className="text-brand-green-700 hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.type}</td>
                <td className="px-4 py-3">{c.country}</td>
                <td className="px-4 py-3">{c.city ?? '—'}</td>
                <td className="px-4 py-3">
                  {c.creditTermsDays != null ? `${c.creditTermsDays} days` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      'inline-block rounded-full px-2 py-0.5 text-xs font-medium ' +
                      (c.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : c.status === 'ON_HOLD'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800')
                    }
                  >
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-neutral-500">
                  No clients yet. Run <code>pnpm db:seed</code> to load demo data.
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
