'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { API_BASE_URL as API_URL } from '../../../../lib/api';

const DOCUMENT_TYPES = [
  'WHO_GMP', 'COA', 'STABILITY', 'IMPORT_PERMIT', 'INVOICE',
  'PACKING_LIST', 'BL_AWB', 'LICENSE', 'CONTRACT', 'OTHER',
];

export default function NewDocumentPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      type: form.get('type'),
      title: form.get('title'),
      s3Key: form.get('s3Key'),
      mimeType: form.get('mimeType') || null,
      notes: form.get('notes') || null,
      issueDate: form.get('issueDate') ? new Date(form.get('issueDate') as string).toISOString() : null,
      expiryDate: form.get('expiryDate') ? new Date(form.get('expiryDate') as string).toISOString() : null,
    };

    try {
      const token = window.localStorage.getItem('sahelwaga.access');
      const res = await fetch(`${API_URL}/documents`, {
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
      const created = await res.json();
      router.push(`/dashboard/documents/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-serif text-3xl font-semibold text-brand-neutral-900">New Document</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">Register a document in the compliance library.</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">Title *</label>
          <input name="title" required className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">Type *</label>
          <select name="type" required className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm">
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">S3 Key *</label>
          <input name="s3Key" required className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" placeholder="documents/2024/coa-supplier-x.pdf" />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">MIME Type</label>
          <input name="mimeType" className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" placeholder="application/pdf" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-neutral-700">Issue Date</label>
            <input name="issueDate" type="date" className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-neutral-700">Expiry Date</label>
            <input name="expiryDate" type="date" className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-neutral-700">Notes</label>
          <textarea name="notes" rows={3} className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Document'}
        </button>
      </form>
    </div>
  );
}
