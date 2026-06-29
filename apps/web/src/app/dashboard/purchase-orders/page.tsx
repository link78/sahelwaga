'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { API_BASE_URL as API_URL } from '../../../lib/api';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  currency: string;
  total: string;
  targetShipmentDate: string | null;
  createdAt: string;
  supplier: { id: string; name: string };
  _count: { lines: number };
}

interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-indigo-100 text-indigo-800',
  IN_PRODUCTION: 'bg-yellow-100 text-yellow-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function PurchaseOrdersPage() {
  const [data, setData] = useState<Paginated<PurchaseOrder> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('q', search);

    fetch(`${API_URL}/purchase-orders?${params}`, {
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
        <h1 className="font-serif text-3xl font-semibold">Purchase Orders</h1>
        <Link
          href="/dashboard/purchase-orders/new"
          className="rounded-md bg-brand-green-700 px-4 py-2 text-white hover:bg-brand-green-800"
        >
          New PO
        </Link>
      </div>

      <div className="mt-4">
        <input
          type="text"
          placeholder="Search by PO number…"
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
              <th className="px-4 py-3">PO #</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Ship date</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((po) => (
              <tr key={po.id} className="border-t border-brand-neutral-100">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/dashboard/purchase-orders/${po.id}`} className="text-brand-green-700 hover:underline">
                    {po.poNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{po.supplier.name}</td>
                <td className="px-4 py-3">{po._count.lines}</td>
                <td className="px-4 py-3">{po.currency} {Number(po.total).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {po.targetShipmentDate ? new Date(po.targetShipmentDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[po.status] ?? 'bg-gray-100 text-gray-800'}`}>
                    {po.status.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-neutral-500">
                  No purchase orders yet.
                </td>
              </tr>
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
