'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface ClientMe {
  scope: 'client';
  client: {
    id: string;
    name: string;
    type: string;
    country: string;
    city: string | null;
    status: string;
    creditTermsDays: number | null;
    contacts: Array<{ id: string; name: string; email: string | null; phone: string | null }>;
  };
  kpis: { openSalesOrders: number; totalSalesOrders: number; documents: number };
}

export default function ClientPortalHome() {
  const [data, setData] = useState<ClientMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/portal/me`, { headers: token ? { authorization: 'Bearer ' + token } : {} })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? 'Failed'); return r.json(); })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-brand-neutral-500">Loading…</p>;

  const { client, kpis } = data;

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">{client.name}</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">
        Welcome back. Browse our catalog, track your orders, and review compliance documents.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Open Orders" value={kpis.openSalesOrders} href="/portal/client/sales-orders" />
        <Kpi label="Total Orders" value={kpis.totalSalesOrders} href="/portal/client/sales-orders" />
        <Kpi label="Documents" value={kpis.documents} href="/portal/client/documents" />
      </div>

      <div className="mt-10 rounded-lg border border-brand-neutral-100 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">Account</h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between"><dt className="text-brand-neutral-500">Type</dt><dd>{client.type}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-neutral-500">Country</dt><dd>{client.country}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-neutral-500">City</dt><dd>{client.city ?? '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-neutral-500">Status</dt><dd>{client.status}</dd></div>
          <div className="flex justify-between"><dt className="text-brand-neutral-500">Credit terms (days)</dt><dd>{client.creditTermsDays ?? '—'}</dd></div>
        </dl>
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
