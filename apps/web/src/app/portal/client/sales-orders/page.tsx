'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { API_BASE_URL as API_URL } from '../../../../lib/api';

interface SalesOrder {
  id: string;
  soNumber: string;
  status: string;
  currency: string;
  total: string;
  createdAt: string;
  client: { id: string; name: string };
  _count: { lines: number };
}

interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number }

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PICKED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-purple-100 text-purple-800',
  PAID: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function ClientPortalSalesOrdersPage() {
  const [data, setData] = useState<Paginated<SalesOrder> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    fetch(`${API_URL}/sales-orders?${params}`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load'); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [page]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">My Orders</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">
        Every order placed on your account, with their current status.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-lg border border-brand-neutral-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-neutral-50 text-left text-xs uppercase tracking-wide text-brand-neutral-500">
            <tr>
              <th className="px-4 py-3">SO #</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((so) => (
              <tr key={so.id} className="border-t border-brand-neutral-100">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/portal/client/sales-orders/${so.id}`} className="text-brand-green-700 hover:underline">
                    {so.soNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{so._count.lines}</td>
                <td className="px-4 py-3">{so.currency} {Number(so.total).toLocaleString()}</td>
                <td className="px-4 py-3">{new Date(so.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[so.status] ?? 'bg-gray-100 text-gray-800'}`}>
                    {so.status.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-neutral-500">No orders yet.</td></tr>
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
