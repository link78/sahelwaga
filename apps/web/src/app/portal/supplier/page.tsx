'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

interface SupplierMe {
  scope: 'supplier';
  supplier: {
    id: string;
    name: string;
    country: string;
    status: string;
    whoGmpStatus: string;
    rating: string | null;
    vetting: null | {
      whoGmpVerified: boolean;
      coaReceived: boolean;
      stabilityHotClimate: boolean;
      westAfricaReferences: boolean;
    };
    contacts: Array<{ id: string; name: string; email: string | null; phone: string | null }>;
  };
  kpis: { openPurchaseOrders: number; totalPurchaseOrders: number; documents: number };
}

export default function SupplierPortalHome() {
  const [data, setData] = useState<SupplierMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/portal/me`, { headers: token ? { authorization: 'Bearer ' + token } : {} })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-brand-neutral-500">Loading…</p>;

  const { supplier, kpis } = data;
  const vettingItems = supplier.vetting
    ? [
        { label: 'WHO-GMP verified', value: supplier.vetting.whoGmpVerified },
        { label: 'CoA received', value: supplier.vetting.coaReceived },
        { label: 'Stability (hot climate)', value: supplier.vetting.stabilityHotClimate },
        { label: 'West-Africa references', value: supplier.vetting.westAfricaReferences },
      ]
    : [];

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-brand-neutral-900">{supplier.name}</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">
        Welcome back. Here is the current status of your relationship with MedSupply.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Open Purchase Orders" value={kpis.openPurchaseOrders} href="/portal/supplier/purchase-orders" />
        <Kpi label="Total Purchase Orders" value={kpis.totalPurchaseOrders} href="/portal/supplier/purchase-orders" />
        <Kpi label="Documents" value={kpis.documents} href="/portal/supplier/documents" />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Profile</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Country</dt><dd>{supplier.country}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Status</dt><dd>{supplier.status}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">WHO-GMP</dt><dd>{supplier.whoGmpStatus}</dd></div>
            <div className="flex justify-between"><dt className="text-brand-neutral-500">Rating</dt><dd>{supplier.rating ?? '—'}</dd></div>
          </dl>
        </div>

        <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Vetting checklist</h2>
          {vettingItems.length === 0 ? (
            <p className="mt-3 text-sm text-brand-neutral-500">No vetting record yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {vettingItems.map((v) => (
                <li key={v.label} className="flex items-center justify-between">
                  <span>{v.label}</span>
                  <span className={v.value ? 'text-brand-green-700' : 'text-brand-neutral-500'}>
                    {v.value ? '✓' : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-brand-neutral-100 bg-white p-5 shadow-sm hover:border-brand-green-500"
    >
      <div className="text-xs uppercase tracking-wide text-brand-neutral-500">{label}</div>
      <div className="mt-2 font-serif text-3xl text-brand-neutral-900">{value}</div>
    </Link>
  );
}
