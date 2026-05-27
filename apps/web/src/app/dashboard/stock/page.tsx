'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

interface StockLevel {
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  onHand: number;
}

export default function StockLevelsPage() {
  const [levels, setLevels] = useState<StockLevel[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/stock/levels`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then((data) => setLevels(data.items))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-brand-neutral-900">Stock Levels</h1>
          <p className="mt-1 text-sm text-brand-neutral-500">Current on-hand inventory by product and location.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/stock/locations"
            className="rounded-md border border-brand-neutral-200 px-4 py-2 text-sm font-medium hover:bg-brand-neutral-50"
          >
            Locations
          </Link>
          <Link
            href="/dashboard/stock/movements/new"
            className="rounded-md bg-brand-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-700"
          >
            Record Movement
          </Link>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-brand-neutral-100 text-brand-neutral-500">
            <th className="pb-3 font-medium">Product</th>
            <th className="pb-3 font-medium">Location</th>
            <th className="pb-3 font-medium text-right">On Hand</th>
          </tr>
        </thead>
        <tbody>
          {levels.map((l) => (
            <tr key={`${l.productId}-${l.locationId}`} className="border-b border-brand-neutral-50 hover:bg-brand-neutral-50">
              <td className="py-3">{l.productName}</td>
              <td className="py-3 text-brand-neutral-500">{l.locationName}</td>
              <td className={`py-3 text-right font-medium ${l.onHand <= 0 ? 'text-red-600' : 'text-brand-neutral-900'}`}>
                {l.onHand}
              </td>
            </tr>
          ))}
          {levels.length === 0 && (
            <tr>
              <td colSpan={3} className="py-8 text-center text-brand-neutral-400">
                No stock movements recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
