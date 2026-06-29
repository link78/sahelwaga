'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { API_BASE_URL as API_URL } from '../../../../lib/api';

const CATEGORIES = [
  'ANTIBIOTIC',
  'ANTIMALARIAL',
  'PAINKILLER',
  'PEDIATRIC_SYRUP',
  'IV_FLUID',
  'CONSUMABLE',
  'OTHER',
] as const;

const STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE'] as const;

export interface ProductFormData {
  name: string;
  inn: string;
  category: string;
  form: string;
  strength: string;
  packSize: string;
  shelfLifeMonths: string;
  storageConditions: string;
  status: string;
}

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  productId?: string;
  mode: 'create' | 'edit';
}

export function ProductForm({ initialData, productId, mode }: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name ?? '',
    inn: initialData?.inn ?? '',
    category: initialData?.category ?? 'OTHER',
    form: initialData?.form ?? '',
    strength: initialData?.strength ?? '',
    packSize: initialData?.packSize ?? '',
    shelfLifeMonths: initialData?.shelfLifeMonths ?? '',
    storageConditions: initialData?.storageConditions ?? '',
    status: initialData?.status ?? 'DRAFT',
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
      category: formData.category,
      status: formData.status,
    };
    if (formData.inn) body.inn = formData.inn;
    if (formData.form) body.form = formData.form;
    if (formData.strength) body.strength = formData.strength;
    if (formData.packSize) body.packSize = formData.packSize;
    if (formData.shelfLifeMonths) body.shelfLifeMonths = Number(formData.shelfLifeMonths);
    if (formData.storageConditions) body.storageConditions = formData.storageConditions;

    const url =
      mode === 'create' ? `${API_URL}/products` : `${API_URL}/products/${productId}`;
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
      router.push(`/dashboard/products/${saved.id}`);
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
          <label htmlFor="category" className="block text-sm font-medium text-brand-neutral-700">
            Category *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={onChange}
            className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
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
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="inn" className="block text-sm font-medium text-brand-neutral-700">
          INN (International Nonproprietary Name)
        </label>
        <input
          id="inn"
          name="inn"
          value={formData.inn}
          onChange={onChange}
          className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="form" className="block text-sm font-medium text-brand-neutral-700">
            Form
          </label>
          <input
            id="form"
            name="form"
            value={formData.form}
            onChange={onChange}
            placeholder="e.g. Tablet"
            className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
          />
        </div>

        <div>
          <label htmlFor="strength" className="block text-sm font-medium text-brand-neutral-700">
            Strength
          </label>
          <input
            id="strength"
            name="strength"
            value={formData.strength}
            onChange={onChange}
            placeholder="e.g. 500mg"
            className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
          />
        </div>

        <div>
          <label htmlFor="packSize" className="block text-sm font-medium text-brand-neutral-700">
            Pack size
          </label>
          <input
            id="packSize"
            name="packSize"
            value={formData.packSize}
            onChange={onChange}
            placeholder="e.g. 10x10"
            className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="shelfLifeMonths" className="block text-sm font-medium text-brand-neutral-700">
          Shelf life (months)
        </label>
        <input
          id="shelfLifeMonths"
          name="shelfLifeMonths"
          type="number"
          min="1"
          value={formData.shelfLifeMonths}
          onChange={onChange}
          className="mt-1 w-40 rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
        />
      </div>

      <div>
        <label htmlFor="storageConditions" className="block text-sm font-medium text-brand-neutral-700">
          Storage conditions
        </label>
        <textarea
          id="storageConditions"
          name="storageConditions"
          rows={2}
          value={formData.storageConditions}
          onChange={onChange}
          className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-green-700 px-4 py-2 text-sm text-white hover:bg-brand-green-800 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : mode === 'create' ? 'Create product' : 'Save changes'}
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
