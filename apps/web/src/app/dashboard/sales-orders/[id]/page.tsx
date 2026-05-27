'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const STATUS_FLOW = ['DRAFT', 'CONFIRMED', 'PICKED', 'DELIVERED', 'PAID'];
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PICKED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-purple-100 text-purple-800',
  PAID: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

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
  subtotal: string;
  total: string;
  notes: string | null;
  createdAt: string;
  client: { id: string; name: string; type: string };
  lines: SOLine[];
}

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [so, setSo] = useState<SalesOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  function load() {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/sales-orders/${id}`, { headers: token ? { authorization: 'Bearer ' + token } : {} })
      .then(async r => { if (!r.ok) throw new Error((await r.json()).error ?? 'Failed'); return r.json(); })
      .then(setSo)
      .catch(e => setError(e.message));
  }

  useEffect(() => { load(); }, [id]);

  async function advanceStatus() {
    if (!so) return;
    const idx = STATUS_FLOW.indexOf(so.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    setUpdating(true);
    const token = window.localStorage.getItem('sahelwaga.access');
    try {
      const r = await fetch(`${API_URL}/sales-orders/${id}`, {
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
      <Link href="/dashboard/sales-orders" className="mt-2 inline-block text-sm text-brand-green-700">← Back</Link>
    </div>
  );
  if (!so) return <p className="text-sm text-brand-neutral-500">Loading…</p>;

  const canAdvance = STATUS_FLOW.indexOf(so.status) >= 0 && STATUS_FLOW.indexOf(so.status) < STATUS_FLOW.length - 1;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/sales-orders" className="text-sm text-brand-green-700 hover:underline">← Sales Orders</Link>
          <h1 className="mt-1 font-serif text-3xl font-semibold">{so.soNumber}</h1>
        </div>
        {canAdvance && (
          <button onClick={advanceStatus} disabled={updating}
            className="rounded-md bg-brand-green-700 px-4 py-2 text-sm text-white hover:bg-brand-green-800 disabled:opacity-50">
            {updating ? 'Updating…' : `Mark as ${STATUS_FLOW[STATUS_FLOW.indexOf(so.status) + 1]}`}
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Client</dt><dd>{so.client.name}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Client type</dt><dd>{so.client.type}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Status</dt><dd>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[so.status] ?? ''}`}>{so.status}</span>
            </dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Currency</dt><dd>{so.currency}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Subtotal</dt><dd>{so.currency} {Number(so.subtotal).toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Total</dt><dd>{so.currency} {Number(so.total).toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Created</dt><dd>{new Date(so.createdAt).toLocaleDateString()}</dd></div>
          </dl>
          {so.notes && <p className="mt-3 text-sm text-brand-neutral-500">{so.notes}</p>}
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
            {so.lines.map(l => (
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
