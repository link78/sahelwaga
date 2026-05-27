'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface SOLine {
  id: string;
  qty: number;
  unitPrice: string;
  lineTotal: string;
  product: { id: string; name: string; form: string | null; strength: string | null };
}

interface SalesOrder {
  id: string;
  soNumber: string;
  status: string;
  currency: string;
  deliveryDate: string | null;
  subtotal: string;
  total: string;
  notes: string | null;
  createdAt: string;
  client: { id: string; name: string; type: string };
  lines: SOLine[];
}

export default function ClientPortalSalesOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [so, setSo] = useState<SalesOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/sales-orders/${id}`, { headers: token ? { authorization: 'Bearer ' + token } : {} })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? 'Failed'); return r.json(); })
      .then(setSo)
      .catch((e) => setError(e.message));
  }, [id]);

  async function downloadPdf() {
    if (!so) return;
    const token = window.localStorage.getItem('sahelwaga.access');
    const res = await fetch(`${API_URL}/sales-orders/${so.id}/pdf`, {
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
      <Link href="/portal/client/sales-orders" className="mt-2 inline-block text-sm text-brand-green-700">← Back</Link>
    </div>
  );
  if (!so) return <p className="text-sm text-brand-neutral-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/portal/client/sales-orders" className="text-sm text-brand-green-700 hover:underline">← My Orders</Link>
          <h1 className="mt-1 font-serif text-3xl font-semibold">{so.soNumber}</h1>
        </div>
        <button
          type="button"
          onClick={downloadPdf}
          className="rounded-md border border-brand-neutral-100 px-4 py-2 text-sm hover:bg-brand-neutral-50"
        >
          Download PDF
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-brand-neutral-100 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Summary</h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between"><dt className="text-brand-neutral-500">Status</dt><dd>{so.status}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-neutral-500">Currency</dt><dd>{so.currency}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-neutral-500">Delivery date</dt>
            <dd>{so.deliveryDate ? new Date(so.deliveryDate).toLocaleDateString() : '—'}</dd>
          </div>
          <div className="flex justify-between"><dt className="text-brand-neutral-500">Subtotal</dt><dd>{so.currency} {Number(so.subtotal).toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-neutral-500">Total</dt><dd>{so.currency} {Number(so.total).toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-neutral-500">Created</dt><dd>{new Date(so.createdAt).toLocaleDateString()}</dd></div>
        </dl>
        {so.notes && <p className="mt-3 text-sm text-brand-neutral-500">{so.notes}</p>}
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
            {so.lines.map((l) => (
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
