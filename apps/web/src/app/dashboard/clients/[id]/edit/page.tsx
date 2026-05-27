'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClientForm, ClientFormData } from '../../_components/ClientForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const [initialData, setInitialData] = useState<Partial<ClientFormData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/clients/${id}`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then((client) => {
        setInitialData({
          name: client.name,
          type: client.type,
          country: client.country,
          city: client.city ?? '',
          address: client.address ?? '',
          creditTermsDays: client.creditTermsDays?.toString() ?? '',
          status: client.status,
        });
      })
      .catch((e) => setError(e.message));
  }, [id]);

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

  if (!initialData) {
    return <p className="text-sm text-brand-neutral-500">Loading…</p>;
  }

  return (
    <div>
      <Link href={`/dashboard/clients/${id}`} className="text-sm text-brand-green-700 hover:underline">
        ← Back to client
      </Link>
      <h1 className="mt-1 font-serif text-3xl font-semibold">Edit client</h1>
      <div className="mt-6">
        <ClientForm mode="edit" clientId={id} initialData={initialData} />
      </div>
    </div>
  );
}
