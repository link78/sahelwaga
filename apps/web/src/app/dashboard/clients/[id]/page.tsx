'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface ClientContact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  type: string;
  country: string;
  city: string | null;
  address: string | null;
  creditTermsDays: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  contacts: ClientContact[];
  salesOrders: SalesOrder[];
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/clients/${id}`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(setClient)
      .catch((e) => setError(e.message));
  }, [id]);

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this client?')) return;
    setDeleting(true);
    const token = window.localStorage.getItem('sahelwaga.access');
    try {
      const r = await fetch(`${API_URL}/clients/${id}`, {
        method: 'DELETE',
        headers: token ? { authorization: 'Bearer ' + token } : {},
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to delete');
      router.push('/dashboard/clients');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/dashboard/clients" className="mt-2 inline-block text-sm text-brand-green-700">
          ← Back to clients
        </Link>
      </div>
    );
  }

  if (!client) {
    return <p className="text-sm text-brand-neutral-500">Loading…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/clients" className="text-sm text-brand-green-700 hover:underline">
            ← Clients
          </Link>
          <h1 className="mt-1 font-serif text-3xl font-semibold">{client.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/clients/${id}/edit`}
            className="rounded-md border border-brand-neutral-200 px-4 py-2 text-sm hover:bg-brand-neutral-50"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">
            Details
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">Type</dt>
              <dd>{client.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">Country</dt>
              <dd>{client.country}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">City</dt>
              <dd>{client.city ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">Address</dt>
              <dd>{client.address ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">Credit terms</dt>
              <dd>{client.creditTermsDays != null ? `${client.creditTermsDays} days` : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">Status</dt>
              <dd>
                <span
                  className={
                    'inline-block rounded-full px-2 py-0.5 text-xs font-medium ' +
                    (client.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : client.status === 'ON_HOLD'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800')
                  }
                >
                  {client.status}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">
              Contacts
            </h2>
            {client.contacts.length === 0 ? (
              <p className="mt-3 text-sm text-brand-neutral-400">No contacts yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {client.contacts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{c.name}</span>
                      {c.role && (
                        <span className="ml-2 text-brand-neutral-400">({c.role})</span>
                      )}
                      {c.isPrimary && (
                        <span className="ml-2 rounded bg-brand-green-50 px-1.5 py-0.5 text-xs text-brand-green-700">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="text-brand-neutral-400">
                      {c.email && <span>{c.email}</span>}
                      {c.phone && <span className="ml-2">{c.phone}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">
              Recent sales orders
            </h2>
            {client.salesOrders.length === 0 ? (
              <p className="mt-3 text-sm text-brand-neutral-400">No sales orders yet.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {client.salesOrders.map((o) => (
                  <li key={o.id} className="flex justify-between">
                    <span>{o.orderNumber}</span>
                    <span className="text-brand-neutral-400">{o.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
