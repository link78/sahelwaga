'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

interface AuditEntry {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; email: string; role: string } | null;
}

interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  TRANSITION: 'bg-purple-100 text-purple-800',
  RECEIVE: 'bg-indigo-100 text-indigo-800',
  CONFIRM: 'bg-amber-100 text-amber-800',
  DELIVER: 'bg-teal-100 text-teal-800',
  EXPIRY_ALERT: 'bg-red-100 text-red-800',
  LEAD_SUBMITTED: 'bg-gray-100 text-gray-800',
};

export default function AuditLogsPage() {
  const [data, setData] = useState<Paginated<AuditEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    const params = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (entityFilter) params.set('entity', entityFilter);
    if (actionFilter) params.set('action', actionFilter);
    fetch(`${API_URL}/audit-logs?${params}`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [page, entityFilter, actionFilter]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Audit log</h1>
      <p className="mt-2 text-sm text-brand-neutral-500">
        Immutable record of write actions and compliance events across the platform.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Entity (e.g. SalesOrder)"
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
        />
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
        >
          <option value="">All actions</option>
          {Object.keys(ACTION_BADGE).map((a) => (
            <option key={a} value={a}>
              {a}
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
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((entry) => (
              <tr key={entry.id} className="border-b border-brand-neutral-100 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-brand-neutral-500">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs">
                  {entry.actor ? (
                    <>
                      <div className="font-medium text-brand-neutral-900">{entry.actor.name}</div>
                      <div className="text-brand-neutral-500">{entry.actor.role}</div>
                    </>
                  ) : (
                    <span className="text-brand-neutral-500">system</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="font-medium">{entry.entity}</div>
                  <div className="font-mono text-[10px] text-brand-neutral-500">{entry.entityId}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      'rounded px-2 py-0.5 text-xs font-medium ' +
                      (ACTION_BADGE[entry.action] ?? 'bg-gray-100 text-gray-800')
                    }
                  >
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {(entry.beforeJson || entry.afterJson) && (
                    <pre className="max-w-md overflow-x-auto whitespace-pre-wrap rounded bg-brand-neutral-50 p-2 text-[10px] text-brand-neutral-500">
                      {JSON.stringify(
                        { before: entry.beforeJson, after: entry.afterJson },
                        null,
                        2,
                      )}
                    </pre>
                  )}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-neutral-500">
                  No audit log entries.
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
            Page {page} of {totalPages} ({data?.total} total entries)
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
