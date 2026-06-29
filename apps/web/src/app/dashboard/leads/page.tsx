'use client';

import { useEffect, useState } from 'react';

import { API_BASE_URL as API_URL } from '../../../lib/api';

interface Lead {
  id: string;
  kind: 'PARTNERSHIP' | 'ACCOUNT' | 'CONTACT';
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'ARCHIVED';
  name: string;
  email: string;
  company: string | null;
  country: string | null;
  message: string | null;
  createdAt: string;
}

interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

const KIND_BADGE: Record<Lead['kind'], string> = {
  PARTNERSHIP: 'bg-blue-100 text-blue-800',
  ACCOUNT: 'bg-green-100 text-green-800',
  CONTACT: 'bg-gray-100 text-gray-800',
};

const STATUS_OPTIONS: Lead['status'][] = ['NEW', 'CONTACTED', 'QUALIFIED', 'ARCHIVED'];

export default function LeadsPage() {
  const [data, setData] = useState<Paginated<Lead> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | Lead['status']>('ALL');
  const [kindFilter, setKindFilter] = useState<'ALL' | Lead['kind']>('ALL');

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (kindFilter !== 'ALL') params.set('kind', kindFilter);
    fetch(`${API_URL}/leads?${params}`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [page, statusFilter, kindFilter]);

  async function updateStatus(id: string, status: Lead['status']) {
    const token = window.localStorage.getItem('sahelwaga.access');
    const res = await fetch(`${API_URL}/leads/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok && data) {
      setData({
        ...data,
        items: data.items.map((l) => (l.id === id ? { ...l, status } : l)),
      });
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Leads</h1>
      <p className="mt-2 text-sm text-brand-neutral-500">
        Inbound enquiries submitted from the public marketing site.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={kindFilter}
          onChange={(e) => {
            setKindFilter(e.target.value as 'ALL' | Lead['kind']);
            setPage(1);
          }}
          className="rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
        >
          <option value="ALL">All kinds</option>
          <option value="PARTNERSHIP">Partnership</option>
          <option value="ACCOUNT">Account</option>
          <option value="CONTACT">Contact</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | Lead['status']);
            setPage(1);
          }}
          className="rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
        >
          <option value="ALL">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-brand-neutral-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-neutral-100 text-xs uppercase text-brand-neutral-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((lead) => (
              <tr key={lead.id} className="border-b border-brand-neutral-100 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-brand-neutral-500">
                  {new Date(lead.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={'rounded px-2 py-0.5 text-xs font-medium ' + KIND_BADGE[lead.kind]}>
                    {lead.kind}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{lead.name}</td>
                <td className="px-4 py-3">
                  <a href={`mailto:${lead.email}`} className="text-brand-green-700 hover:underline">
                    {lead.email}
                  </a>
                </td>
                <td className="px-4 py-3">{lead.company ?? '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value as Lead['status'])}
                    className="rounded-md border border-brand-neutral-100 px-2 py-1 text-xs"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-neutral-500">
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border border-brand-neutral-100 px-3 py-1 disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded border border-brand-neutral-100 px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
