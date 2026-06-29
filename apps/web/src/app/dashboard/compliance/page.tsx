'use client';

import { useEffect, useState } from 'react';

import { API_BASE_URL as API_URL } from '../../../lib/api';

interface ExpiryAlert {
  id: string;
  createdAt: string;
  documentId: string;
  payload: {
    type?: string;
    title?: string;
    expiryDate?: string;
    status?: 'EXPIRED' | 'EXPIRING_SOON';
    windowDays?: number;
  } | null;
  document: {
    id: string;
    type: string;
    title: string;
    expiryDate: string | null;
  } | null;
}

interface ScanResult {
  scannedAt: string;
  windowDays: number;
  alertsCreated: number;
  expiredCount: number;
  expiringCount: number;
}

export default function CompliancePage() {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);

  function load() {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/compliance/expiry-alerts?limit=100`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then((data: { items: ExpiryAlert[] }) => setAlerts(data.items))
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function runScan() {
    setRunning(true);
    setError(null);
    try {
      const token = window.localStorage.getItem('sahelwaga.access');
      const res = await fetch(`${API_URL}/compliance/expiry-scan/run`, {
        method: 'POST',
        headers: token ? { authorization: 'Bearer ' + token } : {},
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Scan failed');
      const result = (await res.json()) as ScanResult;
      setLastScan(result);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold">Compliance</h1>
        <button
          onClick={runScan}
          disabled={running}
          className="rounded-md bg-brand-green-700 px-4 py-2 text-sm text-white hover:bg-brand-green-800 disabled:opacity-60"
        >
          {running ? 'Scanning…' : 'Run expiry scan'}
        </button>
      </div>
      <p className="mt-2 text-sm text-brand-neutral-500">
        Compliance documents (COA, stability, import permits, GMP certificates) approaching or past
        their expiry date.
      </p>

      {lastScan && (
        <div className="mt-4 rounded-md border border-brand-green-100 bg-brand-green-50 px-4 py-3 text-sm">
          Last scan at {new Date(lastScan.scannedAt).toLocaleString()} —{' '}
          {lastScan.alertsCreated} new alert(s), {lastScan.expiredCount} expired and{' '}
          {lastScan.expiringCount} expiring within {lastScan.windowDays} days.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-brand-neutral-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-neutral-100 text-xs uppercase text-brand-neutral-500">
            <tr>
              <th className="px-4 py-3">Alerted</th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => {
              const status = alert.payload?.status ?? '—';
              return (
                <tr key={alert.id} className="border-b border-brand-neutral-100">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-brand-neutral-500">
                    {new Date(alert.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {alert.document?.title ?? alert.payload?.title ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {alert.document?.type ?? alert.payload?.type ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {alert.document?.expiryDate
                      ? new Date(alert.document.expiryDate).toLocaleDateString()
                      : alert.payload?.expiryDate
                        ? new Date(alert.payload.expiryDate).toLocaleDateString()
                        : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        'rounded px-2 py-0.5 text-xs font-medium ' +
                        (status === 'EXPIRED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800')
                      }
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-neutral-500">
                  No expiry alerts. Click <em>Run expiry scan</em> to refresh.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
