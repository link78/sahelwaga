'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const STATUSES = ['PROSPECT', 'UNDER_REVIEW', 'APPROVED', 'BLOCKED', 'REJECTED'] as const;
const GMP_STATUSES = ['UNKNOWN', 'PENDING', 'VERIFIED', 'EXPIRED'] as const;
const RATINGS = ['A', 'B', 'C'] as const;

interface SupplierFormData {
  name: string;
  country: string;
  status: string;
  whoGmpStatus: string;
  rating: string | null;
  notes: string;
}

interface SupplierFormProps {
  initialData?: SupplierFormData & { id: string };
  mode: 'create' | 'edit';
}

export default function SupplierForm({ initialData, mode }: SupplierFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<SupplierFormData>({
    name: initialData?.name ?? '',
    country: initialData?.country ?? '',
    status: initialData?.status ?? 'PROSPECT',
    whoGmpStatus: initialData?.whoGmpStatus ?? 'UNKNOWN',
    rating: initialData?.rating ?? null,
    notes: initialData?.notes ?? '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const token = window.localStorage.getItem('sahelwaga.access');
    const url = mode === 'create'
      ? `${API_URL}/suppliers`
      : `${API_URL}/suppliers/${initialData?.id}`;
    const method = mode === 'create' ? 'POST' : 'PATCH';

    try {
      const body = {
        ...form,
        rating: form.rating || null,
        notes: form.notes || null,
      };
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
      router.push(`/dashboard/suppliers/${saved.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <label htmlFor="supplier-name" className="block text-sm font-medium">Name *</label>
        <input
          id="supplier-name"
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="supplier-country" className="block text-sm font-medium">Country *</label>
        <input
          id="supplier-country"
          type="text"
          required
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="supplier-status" className="block text-sm font-medium">Status</label>
          <select
            id="supplier-status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="supplier-gmp" className="block text-sm font-medium">WHO-GMP Status</label>
          <select
            id="supplier-gmp"
            value={form.whoGmpStatus}
            onChange={(e) => setForm({ ...form, whoGmpStatus: e.target.value })}
            className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
          >
            {GMP_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="supplier-rating" className="block text-sm font-medium">Rating</label>
          <select
            id="supplier-rating"
            value={form.rating ?? ''}
            onChange={(e) => setForm({ ...form, rating: e.target.value || null })}
            className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
          >
            <option value="">Not rated</option>
            {RATINGS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="supplier-notes" className="block text-sm font-medium">Notes</label>
        <textarea
          id="supplier-notes"
          rows={4}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-green-700 px-6 py-2 text-white hover:bg-brand-green-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : mode === 'create' ? 'Create Supplier' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-brand-neutral-100 px-6 py-2 text-sm hover:bg-brand-neutral-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
