'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface StockLocation {
  id: string;
  name: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Movement {
  id: string;
  qty: number;
  reason: string;
  product: { id: string; name: string };
  lotNumber: string | null;
  occurredAt: string;
}

export default function StockLocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useState<StockLocation | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    const headers: Record<string, string> = {};
    if (token) headers.authorization = 'Bearer ' + token;

    Promise.all([
      fetch(`${API_URL}/stock/locations/${id}`, { headers }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Not found');
        return r.json();
      }),
      fetch(`${API_URL}/stock/movements?locationId=${id}`, { headers }).then(async (r) => {
        if (!r.ok) return { items: [] };
        return r.json();
      }),
    ])
      .then(([loc, movData]) => {
        setLocation(loc);
        setMovements(movData.items);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!location) return <p className="text-brand-neutral-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/stock/locations" className="text-sm text-brand-green-700 hover:underline">
        ← Back to Locations
      </Link>

      <h1 className="mt-4 font-serif text-3xl font-semibold text-brand-neutral-900">{location.name}</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">{location.country} · {location.isActive ? 'Active' : 'Inactive'}</p>

      <h2 className="mt-8 font-serif text-lg font-semibold text-brand-neutral-900">Recent Movements</h2>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-brand-neutral-100 text-brand-neutral-500">
            <th className="pb-3 font-medium">Product</th>
            <th className="pb-3 font-medium">Qty</th>
            <th className="pb-3 font-medium">Reason</th>
            <th className="pb-3 font-medium">Lot</th>
            <th className="pb-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id} className="border-b border-brand-neutral-50">
              <td className="py-3">{m.product.name}</td>
              <td className={`py-3 font-medium ${m.qty > 0 ? 'text-green-700' : 'text-red-600'}`}>{m.qty > 0 ? '+' : ''}{m.qty}</td>
              <td className="py-3 text-brand-neutral-500">{m.reason.replace(/_/g, ' ')}</td>
              <td className="py-3 text-brand-neutral-500">{m.lotNumber ?? '—'}</td>
              <td className="py-3 text-brand-neutral-500">{new Date(m.occurredAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {movements.length === 0 && (
            <tr><td colSpan={5} className="py-6 text-center text-brand-neutral-400">No movements yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
