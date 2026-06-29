'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { API_BASE_URL as API_URL } from '../../../../lib/api';

interface PO { id: string; poNumber: string }
interface Product { id: string; name: string; strength: string | null }
interface LineInput { productId: string; qty: number }

export default function NewImportBatchPage() {
  const router = useRouter();
  const [pos, setPos] = useState<PO[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [importAuthNumber, setImportAuthNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineInput[]>([{ productId: '', qty: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    const headers: HeadersInit = token ? { authorization: 'Bearer ' + token } : {};
    Promise.all([
      fetch(`${API_URL}/purchase-orders?pageSize=200`, { headers }).then(r => r.json()),
      fetch(`${API_URL}/products?pageSize=500`, { headers }).then(r => r.json()),
    ]).then(([p, pr]) => {
      setPos(p.items ?? []);
      setProducts(pr.items ?? []);
    });
  }, []);

  function addLine() { setLines([...lines, { productId: '', qty: 1 }]); }
  function removeLine(i: number) { setLines(lines.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, field: keyof LineInput, value: string | number) {
    setLines(lines.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const token = window.localStorage.getItem('sahelwaga.access');
    try {
      const r = await fetch(`${API_URL}/import-batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({
          purchaseOrderId: purchaseOrderId || undefined,
          importAuthNumber: importAuthNumber || undefined,
          notes: notes || undefined,
          lines: lines.filter(l => l.productId).map(l => ({ productId: l.productId, qty: l.qty })),
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to create');
      const ib = await r.json();
      router.push(`/dashboard/import-batches/${ib.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold">New Import Batch</h1>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={submit} className="mt-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-brand-neutral-700">Purchase Order</label>
            <select value={purchaseOrderId} onChange={e => setPurchaseOrderId(e.target.value)}
              className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm">
              <option value="">None (standalone)</option>
              {pos.map(p => <option key={p.id} value={p.id}>{p.poNumber}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-neutral-700">Import Auth # (DGPML)</label>
            <input type="text" value={importAuthNumber} onChange={e => setImportAuthNumber(e.target.value)}
              className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-brand-neutral-700">Lines</h2>
            <button type="button" onClick={addLine} className="text-sm text-brand-green-700 hover:underline">+ Add line</button>
          </div>
          <div className="mt-2 space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={line.productId} onChange={e => updateLine(i, 'productId', e.target.value)}
                  className="flex-1 rounded-md border border-brand-neutral-200 px-2 py-1.5 text-sm">
                  <option value="">Select product…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.strength ?? ''}</option>)}
                </select>
                <input type="number" min={1} value={line.qty} onChange={e => updateLine(i, 'qty', Number(e.target.value))}
                  className="w-20 rounded-md border border-brand-neutral-200 px-2 py-1.5 text-sm" />
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700 text-sm">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={submitting}
          className="rounded-md bg-brand-green-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-green-800 disabled:opacity-50">
          {submitting ? 'Creating…' : 'Create Import Batch'}
        </button>
      </form>
    </div>
  );
}
