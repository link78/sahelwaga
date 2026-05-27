'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

interface POLine {
  id: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
  product: { id: string; name: string; form: string | null; strength: string | null };
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  currency: string;
  incoterm: string | null;
  targetShipmentDate: string | null;
  subtotal: string;
  total: string;
  notes: string | null;
  createdAt: string;
  supplier: { id: string; name: string };
  lines: POLine[];
  importBatches: Array<{ id: string; batchNumber: string; status: string }>;
}

export default function SupplierPortalPurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/purchase-orders/${id}`, { headers: token ? { authorization: 'Bearer ' + token } : {} })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? 'Failed'); return r.json(); })
      .then(setPo)
      .catch((e) => setError(e.message));
  }, [id]);

  async function downloadPdf() {
    if (!po) return;
    const token = window.localStorage.getItem('sahelwaga.access');
    const res = await fetch(`${API_URL}/purchase-orders/${po.id}/pdf`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  if (error) return (
    <div>
      <p className="text-sm text-red-600">{error}</p>
      <Link href="/portal/supplier/purchase-orders" className="mt-2 inline-block text-sm text-brand-green-700">← Back</Link>
    </div>
  );
  if (!po) return <p className="text-sm text-brand-neutral-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/portal/supplier/purchase-orders" className="text-sm text-brand-green-700 hover:underline">← Purchase Orders</Link>
          <h1 className="mt-1 font-serif text-3xl font-semibold">{po.poNumber}</h1>
        </div>
        <button
          type="button"
          onClick={downloadPdf}
          className="rounded-md border border-brand-neutral-100 px-4 py-2 text-sm hover:bg-brand-neutral-50"
        >
          Download PDF
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Status</dt><dd>{po.status}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Currency</dt><dd>{po.currency}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Incoterm</dt><dd>{po.incoterm ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Target shipment</dt>
              <dd>{po.targetShipmentDate ? new Date(po.targetShipmentDate).toLocaleDateString() : '—'}</dd>
            </div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Subtotal</dt><dd>{po.currency} {Number(po.subtotal).toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Total</dt><dd>{po.currency} {Number(po.total).toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Created</dt><dd>{new Date(po.createdAt).toLocaleDateString()}</dd></div>
          </dl>
          {po.notes && <p className="mt-3 text-sm text-brand-neutral-500">{po.notes}</p>}
        </div>

        <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Linked import batches</h2>
          {po.importBatches.length === 0 ? (
            <p className="mt-3 text-sm text-brand-neutral-500">No import batch yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {po.importBatches.map((b) => (
                <li key={b.id} className="flex justify-between">
                  <span>{b.batchNumber}</span>
                  <span className="text-brand-neutral-500">{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-brand-neutral-100 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Order lines</h2>
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
