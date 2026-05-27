'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface StockLocation {
  id: string;
  name: string;
  country: string;
  isActive: boolean;
}

export default function StockLocationsPage() {
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/stock/locations`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then((data) => setLocations(data.items))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-brand-neutral-900">Stock Locations</h1>
          <p className="mt-1 text-sm text-brand-neutral-500">Warehouses and storage facilities.</p>
        </div>
        <Link
          href="/dashboard/stock/locations/new"
          className="rounded-md bg-brand-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-700"
        >
          New location
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-brand-neutral-100 text-brand-neutral-500">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Country</th>
            <th className="pb-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((loc) => (
            <tr key={loc.id} className="border-b border-brand-neutral-50 hover:bg-brand-neutral-50">
              <td className="py-3">
                <Link href={`/dashboard/stock/locations/${loc.id}`} className="text-brand-green-700 hover:underline">
                  {loc.name}
                </Link>
              </td>
              <td className="py-3 text-brand-neutral-500">{loc.country}</td>
              <td className="py-3">
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${loc.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {loc.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
