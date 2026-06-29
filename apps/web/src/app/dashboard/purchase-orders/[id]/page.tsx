'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { API_BASE_URL as API_URL } from '../../../../lib/api';

const STATUS_FLOW = ['DRAFT', 'SENT', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'RECEIVED'];
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-indigo-100 text-indigo-800',
  IN_PRODUCTION: 'bg-yellow-100 text-yellow-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

interface POLine {
  id: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
  product: { id: string; name: string; form: string | null; strength: string | null };
}

interface ImportBatchRef {
  id: string;
  batchNumber: string;
  status: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  currency: string;
  incoterm: string | null;
  targetShipmentDate: string | null;
  notes: string | null;
  subtotal: string;
  total: string;
  createdAt: string;
  supplier: { id: string; name: string };
  lines: POLine[];
  importBatches: ImportBatchRef[];
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  function loadPo() {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/purchase-orders/${id}`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(setPo)
      .catch((e) => setError(e.message));
  }

  useEffect(() => { loadPo(); }, [id]);

  async function advanceStatus() {
    if (!po) return;
    const currentIdx = STATUS_FLOW.indexOf(po.status);
    if (currentIdx < 0 || currentIdx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[currentIdx + 1];
    setUpdating(true);
    const token = window.localStorage.getItem('sahelwaga.access');
    try {
      const r = await fetch(`${API_URL}/purchase-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to update');
      loadPo();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  }

  if (error) return (
    <div>
      <p className="text-sm text-red-600">{error}</p>
      <Link href="/dashboard/purchase-orders" className="mt-2 inline-block text-sm text-brand-green-700">← Back</Link>
    </div>
  );

  if (!po) return <p className="text-sm text-brand-neutral-500">Loading…</p>;

  const canAdvance = STATUS_FLOW.indexOf(po.status) >= 0 && STATUS_FLOW.indexOf(po.status) < STATUS_FLOW.length - 1;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/purchase-orders" className="text-sm text-brand-green-700 hover:underline">← Purchase Orders</Link>
          <h1 className="mt-1 font-serif text-3xl font-semibold">{po.poNumber}</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              const token = window.localStorage.getItem('sahelwaga.access');
              const res = await fetch(`${API_URL}/purchase-orders/${po.id}/pdf`, {
                headers: token ? { authorization: 'Bearer ' + token } : {},
              });
              if (!res.ok) return;
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
              setTimeout(() => URL.revokeObjectURL(url), 30_000);
            }}
            className="rounded-md border border-brand-neutral-100 px-4 py-2 text-sm hover:bg-brand-neutral-50"
          >
            Download PDF
          </button>
          {canAdvance && (
            <button onClick={advanceStatus} disabled={updating}
              className="rounded-md bg-brand-green-700 px-4 py-2 text-sm text-white hover:bg-brand-green-800 disabled:opacity-50">
              {updating ? 'Updating…' : `Mark as ${(STATUS_FLOW[STATUS_FLOW.indexOf(po.status) + 1] ?? '').replace(/_/g, ' ')}`}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Supplier</dt><dd>{po.supplier.name}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Status</dt><dd>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[po.status] ?? ''}`}>{po.status.replace(/_/g, ' ')}</span>
            </dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Currency</dt><dd>{po.currency}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Incoterm</dt><dd>{po.incoterm ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Target ship date</dt><dd>{po.targetShipmentDate ? new Date(po.targetShipmentDate).toLocaleDateString() : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Total</dt><dd>{po.currency} {Number(po.total).toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Created</dt><dd>{new Date(po.createdAt).toLocaleDateString()}</dd></div>
          </dl>
          {po.notes && <p className="mt-3 text-sm text-brand-neutral-500">{po.notes}</p>}
        </div>

        <div className="space-y-6">
          {po.importBatches.length > 0 && (
            <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
              <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Import Batches</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {po.importBatches.map((ib) => (
                  <li key={ib.id} className="flex justify-between">
                    <Link href={`/dashboard/import-batches/${ib.id}`} className="text-brand-green-700 hover:underline">{ib.batchNumber}</Link>
                    <span className="text-brand-neutral-400">{ib.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-brand-neutral-100 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Order Lines</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-brand-neutral-500">
            <tr>
              <th className="pb-2">Product</th>
              <th className="pb-2">Form / Strength</th>
              <th className="pb-2 text-right">Qty</th>
              <th className="pb-2 text-right">Unit price</th>
              <th className="pb-2 text-right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {po.lines.map((l) => (
              <tr key={l.id} className="border-t border-brand-neutral-100">
                <td className="py-2">{l.product.name}</td>
                <td className="py-2">{[l.product.form, l.product.strength].filter(Boolean).join(' / ') || '—'}</td>
                <td className="py-2 text-right">{l.qty}</td>
                <td className="py-2 text-right">{Number(l.unitPrice).toLocaleString()}</td>
                <td className="py-2 text-right">{Number(l.lineTotal).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
