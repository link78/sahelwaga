'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { API_BASE_URL as API_URL } from '../../../lib/api';

interface OrgRef {
  id: string;
  name: string;
}

interface Invitation {
  id: string;
  email: string;
  name: string;
  role: 'SUPPLIER_PORTAL' | 'CLIENT_PORTAL';
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  supplier: OrgRef | null;
  client: OrgRef | null;
  invitedBy: { id: string; name: string; email: string } | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastSentAt: string;
  createdAt: string;
}

interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

type StatusFilter = 'ALL' | Invitation['status'];

const STATUS_OPTIONS: Invitation['status'][] = ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'];

const STATUS_BADGE: Record<Invitation['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REVOKED: 'bg-gray-200 text-gray-700',
  EXPIRED: 'bg-red-100 text-red-700',
};

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('sahelwaga.access');
  return token ? { authorization: 'Bearer ' + token } : {};
}

export default function PortalInvitationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-brand-neutral-500">Loading...</p>}>
      <PortalInvitationsView />
    </Suspense>
  );
}

function PortalInvitationsView() {
  const searchParams = useSearchParams();
  const presetSupplierId = searchParams.get('supplierId');
  const presetClientId = searchParams.get('clientId');

  const [data, setData] = useState<Paginated<Invitation> | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [error, setError] = useState<string | null>(null);

  // Form state — opens automatically when the page is opened with a deep-link.
  const [showForm, setShowForm] = useState<boolean>(
    Boolean(presetSupplierId) || Boolean(presetClientId),
  );
  const [formRole, setFormRole] = useState<Invitation['role']>(
    presetClientId ? 'CLIENT_PORTAL' : 'SUPPLIER_PORTAL',
  );
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formSupplierId, setFormSupplierId] = useState<string>(presetSupplierId ?? '');
  const [formClientId, setFormClientId] = useState<string>(presetClientId ?? '');
  const [suppliers, setSuppliers] = useState<OrgRef[]>([]);
  const [clients, setClients] = useState<OrgRef[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  const reload = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    fetch(`${API_URL}/portal-invitations?${params}`, { headers: authHeaders() })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [page, statusFilter]);

  useEffect(() => reload(), [reload]);

  // Load org options for the form once.
  useEffect(() => {
    fetch(`${API_URL}/suppliers?pageSize=100`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => setSuppliers(j.items?.map((s: OrgRef) => ({ id: s.id, name: s.name })) ?? []))
      .catch(() => undefined);
    fetch(`${API_URL}/clients?pageSize=100`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => setClients(j.items?.map((c: OrgRef) => ({ id: c.id, name: c.name })) ?? []))
      .catch(() => undefined);
  }, []);

  const presetOrgLabel = useMemo(() => {
    if (presetSupplierId) {
      return suppliers.find((s) => s.id === presetSupplierId)?.name;
    }
    if (presetClientId) {
      return clients.find((c) => c.id === presetClientId)?.name;
    }
    return undefined;
  }, [presetSupplierId, presetClientId, suppliers, clients]);

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormNotice(null);
    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        email: formEmail.trim(),
        name: formName.trim(),
        role: formRole,
      };
      if (formRole === 'SUPPLIER_PORTAL') {
        if (!formSupplierId) throw new Error('Select a supplier');
        body.supplierId = formSupplierId;
      } else {
        if (!formClientId) throw new Error('Select a client');
        body.clientId = formClientId;
      }
      const res = await fetch(`${API_URL}/portal-invitations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Failed to create invitation');
      }
      setFormNotice('Invitation sent.');
      setFormEmail('');
      setFormName('');
      // Keep the org pre-selected so an admin can issue several invitations
      // for the same org in a row.
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this invitation? The recipient will no longer be able to use the link.')) return;
    const res = await fetch(`${API_URL}/portal-invitations/${id}/revoke`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? 'Failed to revoke');
      return;
    }
    reload();
  }

  async function resend(id: string) {
    const res = await fetch(`${API_URL}/portal-invitations/${id}/resend`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? 'Failed to resend');
      return;
    }
    alert('Invitation re-sent. The previous link is no longer valid.');
    reload();
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Portal invitations</h1>
          <p className="mt-2 text-sm text-brand-neutral-500">
            Invite a supplier or client contact to claim a portal account. They&apos;ll receive an
            email with a one-time link to set their password.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-800"
        >
          {showForm ? 'Hide form' : 'New invitation'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submitForm}
          className="mt-6 rounded-lg border border-brand-neutral-100 bg-white p-6"
        >
          {presetOrgLabel && (
            <div className="mb-4 rounded-md border border-brand-green-200 bg-brand-green-50 px-3 py-2 text-sm text-brand-green-800">
              Pre-selected: <strong>{presetOrgLabel}</strong>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="block text-xs uppercase text-brand-neutral-500">Role</span>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as Invitation['role'])}
                disabled={Boolean(presetSupplierId) || Boolean(presetClientId)}
                className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 disabled:bg-brand-neutral-50"
              >
                <option value="SUPPLIER_PORTAL">Supplier portal</option>
                <option value="CLIENT_PORTAL">Client portal</option>
              </select>
            </label>
            {formRole === 'SUPPLIER_PORTAL' ? (
              <label className="text-sm">
                <span className="block text-xs uppercase text-brand-neutral-500">Supplier</span>
                <select
                  value={formSupplierId}
                  onChange={(e) => setFormSupplierId(e.target.value)}
                  disabled={Boolean(presetSupplierId)}
                  className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 disabled:bg-brand-neutral-50"
                >
                  <option value="">Select a supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="text-sm">
                <span className="block text-xs uppercase text-brand-neutral-500">Client</span>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  disabled={Boolean(presetClientId)}
                  className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 disabled:bg-brand-neutral-50"
                >
                  <option value="">Select a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-sm">
              <span className="block text-xs uppercase text-brand-neutral-500">Recipient name</span>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs uppercase text-brand-neutral-500">Email</span>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2"
              />
            </label>
          </div>
          {formError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}
          {formNotice && (
            <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {formNotice}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-800 disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Send invitation'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
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
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Organisation</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((inv) => (
              <tr key={inv.id} className="border-b border-brand-neutral-100 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-brand-neutral-500">
                  {new Date(inv.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{inv.name}</div>
                  <div className="text-xs text-brand-neutral-500">{inv.email}</div>
                </td>
                <td className="px-4 py-3 text-xs">
                  {inv.role === 'SUPPLIER_PORTAL' ? 'Supplier' : 'Client'}
                </td>
                <td className="px-4 py-3">
                  {inv.supplier?.name ?? inv.client?.name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={'rounded px-2 py-0.5 text-xs font-medium ' + STATUS_BADGE[inv.status]}>
                    {inv.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-brand-neutral-500">
                  {new Date(inv.expiresAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {inv.status === 'PENDING' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => resend(inv.id)}
                        className="rounded border border-brand-neutral-100 px-2 py-1 text-xs hover:bg-brand-neutral-50"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => revoke(inv.id)}
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Revoke
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-brand-neutral-500">—</span>
                  )}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-brand-neutral-500">
                  No invitations found.
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
