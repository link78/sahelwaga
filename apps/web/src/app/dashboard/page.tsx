'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface DashboardStats {
  kpis: {
    activeSuppliers: number;
    activeProducts: number;
    openPOs: number;
    openSalesOrders: number;
    shipmentsInTransit: number;
  };
  alerts: {
    expiringCOAs: number;
    expiringStability: number;
    lowStockProducts: number;
  };
}

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/dashboard/stats`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  const kpis = [
    { label: 'Active Suppliers', value: stats?.kpis.activeSuppliers },
    { label: 'Active Products', value: stats?.kpis.activeProducts },
    { label: 'Open POs to India', value: stats?.kpis.openPOs },
    { label: 'Open Orders (BF)', value: stats?.kpis.openSalesOrders },
    { label: 'Shipments in Transit', value: stats?.kpis.shipmentsInTransit },
  ];

  const alerts = [
    { label: 'Expiring COAs (30 days)', value: stats?.alerts.expiringCOAs, color: 'text-amber-600' },
    { label: 'Expiring Stability Data', value: stats?.alerts.expiringStability, color: 'text-amber-600' },
    { label: 'Low Stock Items', value: stats?.alerts.lowStockProducts, color: 'text-red-600' },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold text-brand-neutral-900">Overview</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">
        Real-time KPIs and alerts for Sahel Pharma operations.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-lg border border-brand-neutral-100 bg-white p-5 shadow-sm"
          >
            <div className="text-xs uppercase tracking-wide text-brand-neutral-500">{k.label}</div>
            <div className="mt-2 font-serif text-3xl text-brand-neutral-900">
              {k.value != null ? k.value : '—'}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-serif text-xl font-semibold text-brand-neutral-900">Alerts</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {alerts.map((a) => (
          <div
            key={a.label}
            className="rounded-lg border border-brand-neutral-100 bg-white p-5 shadow-sm"
          >
            <div className="text-xs uppercase tracking-wide text-brand-neutral-500">{a.label}</div>
            <div className={`mt-2 font-serif text-2xl ${a.value && a.value > 0 ? a.color : 'text-brand-green-700'}`}>
              {a.value != null ? a.value : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
