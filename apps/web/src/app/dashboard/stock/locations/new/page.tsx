'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function NewStockLocationPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get('name'),
      country: form.get('country'),
    };

    try {
      const token = window.localStorage.getItem('sahelwaga.access');
      const res = await fetch(`${API_URL}/stock/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to create');
      }
      router.push('/dashboard/stock/locations');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl font-semibold text-brand-neutral-900">New Stock Location</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">Name *</label>
          <input name="name" required className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">Country *</label>
          <input name="country" required className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" placeholder="Burkina Faso" />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Location'}
        </button>
      </form>
    </div>
  );
}
