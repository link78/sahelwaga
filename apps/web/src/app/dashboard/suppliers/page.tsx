'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

const STATUS_COLORS: Record<string, string> = {
  PROSPECT: 'bg-gray-100 text-gray-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-red-50 text-red-600',
};

const GMP_COLORS: Record<string, string> = {
  UNKNOWN: 'text-brand-neutral-500',
  PENDING: 'text-amber-600',
  VERIFIED: 'text-green-700',
  EXPIRED: 'text-red-600',
};

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
        <Link
          href="/dashboard/suppliers/new"
          className="rounded-md bg-brand-green-700 px-4 py-2 text-white hover:bg-brand-green-800"
        >
          New supplier
        </Link>
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
              <tr key={s.id} className="border-t border-brand-neutral-100 hover:bg-brand-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/suppliers/${s.id}`} className="font-medium text-brand-green-700 hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{s.country}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status] ?? ''}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                </td>
                <td className={`px-4 py-3 text-xs font-medium ${GMP_COLORS[s.whoGmpStatus] ?? ''}`}>
                  {s.whoGmpStatus}
                </td>
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
