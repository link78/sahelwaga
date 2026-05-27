'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const REASONS = ['IMPORT_RECEIPT', 'SALES_DELIVERY', 'ADJUSTMENT', 'RETURN'];

interface Product { id: string; name: string }
interface Location { id: string; name: string }

export default function NewStockMovementPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    const headers: Record<string, string> = {};
    if (token) headers.authorization = 'Bearer ' + token;

    Promise.all([
      fetch(`${API_URL}/products?pageSize=100`, { headers }).then((r) => r.json()),
      fetch(`${API_URL}/stock/locations?pageSize=100`, { headers }).then((r) => r.json()),
    ]).then(([prodData, locData]) => {
      setProducts(prodData.items ?? []);
      setLocations(locData.items ?? []);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      productId: form.get('productId'),
      locationId: form.get('locationId'),
      qty: Number(form.get('qty')),
      reason: form.get('reason'),
      lotNumber: form.get('lotNumber') || null,
      expiryDate: form.get('expiryDate') ? new Date(form.get('expiryDate') as string).toISOString() : null,
    };

    try {
      const token = window.localStorage.getItem('sahelwaga.access');
      const res = await fetch(`${API_URL}/stock/movements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to create');
      }
      router.push('/dashboard/stock');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl font-semibold text-brand-neutral-900">Record Stock Movement</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">Add inventory in (+qty) or remove it (−qty).</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">Product *</label>
          <select name="productId" required className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm">
            <option value="">Select product…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">Location *</label>
          <select name="locationId" required className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm">
            <option value="">Select location…</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">Quantity *</label>
          <input name="qty" type="number" required className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" placeholder="e.g. 500 or -100" />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">Reason *</label>
          <select name="reason" required className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm">
            {REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">Lot Number</label>
          <input name="lotNumber" className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">Expiry Date</label>
          <input name="expiryDate" type="date" className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-700 disabled:opacity-50"
        >
          {submitting ? 'Recording…' : 'Record Movement'}
        </button>
      </form>
    </div>
  );
}
