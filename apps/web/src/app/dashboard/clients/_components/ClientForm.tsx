'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const CLIENT_TYPES = [
  'CLINIC',
  'PHARMACY',
  'NGO',
  'DISTRIBUTOR',
  'GOVERNMENT',
] as const;

const STATUSES = ['ACTIVE', 'INACTIVE', 'ON_HOLD'] as const;

export interface ClientFormData {
  name: string;
  type: string;
  country: string;
  city: string;
  address: string;
  creditTermsDays: string;
  status: string;
}

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  clientId?: string;
  mode: 'create' | 'edit';
}

export function ClientForm({ initialData, clientId, mode }: ClientFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    name: initialData?.name ?? '',
    type: initialData?.type ?? 'PHARMACY',
    country: initialData?.country ?? '',
    city: initialData?.city ?? '',
    address: initialData?.address ?? '',
    creditTermsDays: initialData?.creditTermsDays ?? '',
    status: initialData?.status ?? 'ACTIVE',
  });

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const token = window.localStorage.getItem('sahelwaga.access');
    const body: Record<string, unknown> = {
      name: formData.name,
      type: formData.type,
      country: formData.country,
      status: formData.status,
    };
    if (formData.city) body.city = formData.city;
    if (formData.address) body.address = formData.address;
    if (formData.creditTermsDays) body.creditTermsDays = Number(formData.creditTermsDays);

    const url =
      mode === 'create' ? `${API_URL}/clients` : `${API_URL}/clients/${clientId}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    try {
      const r = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const data = await r.json();
        throw new Error(data.error ?? 'Failed to save');
      }
      const saved = await r.json();
      router.push(`/dashboard/clients/${saved.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-brand-neutral-700">
          Name *
        </label>
        <input
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={onChange}
          className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-brand-neutral-700">
            Type *
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
          >
            {CLIENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-brand-neutral-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-brand-neutral-700">
            Country *
          </label>
          <input
            id="country"
            name="country"
            required
            value={formData.country}
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-brand-neutral-700">
            City
          </label>
          <input
            id="city"
            name="city"
            value={formData.city}
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-brand-neutral-700">
          Address
        </label>
        <textarea
          id="address"
          name="address"
          rows={2}
          value={formData.address}
          onChange={onChange}
          className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
        />
      </div>

      <div>
        <label htmlFor="creditTermsDays" className="block text-sm font-medium text-brand-neutral-700">
          Credit terms (days)
        </label>
        <input
          id="creditTermsDays"
          name="creditTermsDays"
          type="number"
          min="0"
          value={formData.creditTermsDays}
          onChange={onChange}
          className="mt-1 w-40 rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-green-700 px-4 py-2 text-sm text-white hover:bg-brand-green-800 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : mode === 'create' ? 'Create client' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-brand-neutral-200 px-4 py-2 text-sm hover:bg-brand-neutral-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
