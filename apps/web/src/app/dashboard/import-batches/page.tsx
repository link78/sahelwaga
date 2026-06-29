'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { API_BASE_URL as API_URL } from '../../../lib/api';

interface ImportBatch {
  id: string;
  batchNumber: string;
  status: string;
  importAuthNumber: string | null;
  arrivalDate: string | null;
  createdAt: string;
  purchaseOrder: { id: string; poNumber: string } | null;
}

interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number }

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  DOCS_SUBMITTED: 'bg-blue-100 text-blue-800',
  AUTHORIZED: 'bg-indigo-100 text-indigo-800',
  IN_TRANSIT: 'bg-yellow-100 text-yellow-800',
  ARRIVED: 'bg-purple-100 text-purple-800',
  CUSTOMS_CLEARANCE: 'bg-orange-100 text-orange-800',
  CLEARED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function ImportBatchesPage() {
  const [data, setData] = useState<Paginated<ImportBatch> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('q', search);

    fetch(`${API_URL}/import-batches?${params}`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? 'Failed'); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [page, search]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold">Import Batches</h1>
        <Link href="/dashboard/import-batches/new" className="rounded-md bg-brand-green-700 px-4 py-2 text-white hover:bg-brand-green-800">New Import Batch</Link>
      </div>

      <div className="mt-4">
        <input type="text" placeholder="Search by batch number…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-sm rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500" />
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-lg border border-brand-neutral-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-neutral-50 text-left text-xs uppercase tracking-wide text-brand-neutral-500">
            <tr>
              <th className="px-4 py-3">Batch #</th>
              <th className="px-4 py-3">PO</th>
              <th className="px-4 py-3">Auth #</th>
              <th className="px-4 py-3">Arrival</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((ib) => (
              <tr key={ib.id} className="border-t border-brand-neutral-100">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/dashboard/import-batches/${ib.id}`} className="text-brand-green-700 hover:underline">{ib.batchNumber}</Link>
                </td>
                <td className="px-4 py-3">
                  {ib.purchaseOrder ? <Link href={`/dashboard/purchase-orders/${ib.purchaseOrder.id}`} className="text-brand-green-700 hover:underline">{ib.purchaseOrder.poNumber}</Link> : '—'}
                </td>
                <td className="px-4 py-3">{ib.importAuthNumber ?? '—'}</td>
                <td className="px-4 py-3">{ib.arrivalDate ? new Date(ib.arrivalDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ib.status] ?? 'bg-gray-100 text-gray-800'}`}>{ib.status.replace(/_/g, ' ')}</span>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-neutral-500">No import batches yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md border border-brand-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
          <span className="text-sm text-brand-neutral-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-md border border-brand-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
