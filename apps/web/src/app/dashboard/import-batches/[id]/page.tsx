'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

const STATUS_FLOW = ['PENDING', 'DOCS_SUBMITTED', 'AUTHORIZED', 'IN_TRANSIT', 'ARRIVED', 'CUSTOMS_CLEARANCE', 'CLEARED'];
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

interface IBLine {
  id: string;
  qty: number;
  product: { id: string; name: string; form: string | null; strength: string | null };
}

interface ImportBatch {
  id: string;
  batchNumber: string;
  status: string;
  importAuthNumber: string | null;
  arrivalDate: string | null;
  customsClearanceDate: string | null;
  notes: string | null;
  createdAt: string;
  purchaseOrder: { id: string; poNumber: string; supplier: { name: string } } | null;
  lines: IBLine[];
}

export default function ImportBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ib, setIb] = useState<ImportBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  function load() {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/import-batches/${id}`, { headers: token ? { authorization: 'Bearer ' + token } : {} })
      .then(async r => { if (!r.ok) throw new Error((await r.json()).error ?? 'Failed'); return r.json(); })
      .then(setIb)
      .catch(e => setError(e.message));
  }

  useEffect(() => { load(); }, [id]);

  async function advanceStatus() {
    if (!ib) return;
    const idx = STATUS_FLOW.indexOf(ib.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    setUpdating(true);
    const token = window.localStorage.getItem('sahelwaga.access');
    try {
      const r = await fetch(`${API_URL}/import-batches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ status: STATUS_FLOW[idx + 1] }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed');
      load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setUpdating(false); }
  }

  if (error) return (
    <div>
      <p className="text-sm text-red-600">{error}</p>
      <Link href="/dashboard/import-batches" className="mt-2 inline-block text-sm text-brand-green-700">← Back</Link>
    </div>
  );
  if (!ib) return <p className="text-sm text-brand-neutral-500">Loading…</p>;

  const canAdvance = STATUS_FLOW.indexOf(ib.status) >= 0 && STATUS_FLOW.indexOf(ib.status) < STATUS_FLOW.length - 1;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/import-batches" className="text-sm text-brand-green-700 hover:underline">← Import Batches</Link>
          <h1 className="mt-1 font-serif text-3xl font-semibold">{ib.batchNumber}</h1>
        </div>
        {canAdvance && (
          <button onClick={advanceStatus} disabled={updating}
            className="rounded-md bg-brand-green-700 px-4 py-2 text-sm text-white hover:bg-brand-green-800 disabled:opacity-50">
            {updating ? 'Updating…' : `Mark as ${(STATUS_FLOW[STATUS_FLOW.indexOf(ib.status) + 1] ?? '').replace(/_/g, ' ')}`}
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Status</dt><dd>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ib.status] ?? ''}`}>{ib.status.replace(/_/g, ' ')}</span>
            </dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">PO</dt><dd>
              {ib.purchaseOrder ? <Link href={`/dashboard/purchase-orders/${ib.purchaseOrder.id}`} className="text-brand-green-700 hover:underline">{ib.purchaseOrder.poNumber}</Link> : '—'}
            </dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Supplier</dt><dd>{ib.purchaseOrder?.supplier.name ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Import auth #</dt><dd>{ib.importAuthNumber ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Arrival date</dt><dd>{ib.arrivalDate ? new Date(ib.arrivalDate).toLocaleDateString() : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Customs cleared</dt><dd>{ib.customsClearanceDate ? new Date(ib.customsClearanceDate).toLocaleDateString() : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Created</dt><dd>{new Date(ib.createdAt).toLocaleDateString()}</dd></div>
          </dl>
          {ib.notes && <p className="mt-3 text-sm text-brand-neutral-500">{ib.notes}</p>}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-brand-neutral-100 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Lines</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-brand-neutral-500">
            <tr>
              <th className="pb-2">Product</th>
              <th className="pb-2">Form / Strength</th>
              <th className="pb-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {ib.lines.map(l => (
              <tr key={l.id} className="border-t border-brand-neutral-100">
                <td className="py-2">{l.product.name}</td>
                <td className="py-2">{[l.product.form, l.product.strength].filter(Boolean).join(' / ') || '—'}</td>
                <td className="py-2 text-right">{l.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
