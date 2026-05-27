'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

interface DocItem {
  id: string;
  type: string;
  title: string;
  expiryDate: string | null;
  createdAt: string;
}

const DOCUMENT_TYPES = ['WHO_GMP', 'COA', 'STABILITY', 'LICENSE', 'CONTRACT', 'OTHER'];

export default function SupplierPortalDocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  function load() {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/documents?pageSize=50`, { headers: token ? { authorization: 'Bearer ' + token } : {} })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? 'Failed'); return r.json(); })
      .then((d) => setDocs(d.items))
      .catch((e) => setError(e.message));
  }
  useEffect(() => { load(); }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setCreating(true);
    const form = new FormData(e.currentTarget);
    const token = window.localStorage.getItem('sahelwaga.access');
    const userRaw = window.localStorage.getItem('sahelwaga.user');
    // The supplier portal layout already guarantees the role.
    try {
      // Resolve own supplierId via /portal/me (avoids trusting client-side storage for FK).
      const meRes = await fetch(`${API_URL}/portal/me`, { headers: token ? { authorization: 'Bearer ' + token } : {} });
      if (!meRes.ok) throw new Error((await meRes.json()).error ?? 'Failed to identify supplier');
      const me = await meRes.json();
      const supplierId = me.supplier?.id;
      if (!supplierId) throw new Error('Supplier scope missing');

      const docRes = await fetch(`${API_URL}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({
          type: form.get('type'),
          title: form.get('title'),
          s3Key: form.get('s3Key'),
          expiryDate: form.get('expiryDate') ? new Date(form.get('expiryDate') as string).toISOString() : null,
        }),
      });
      if (!docRes.ok) throw new Error((await docRes.json()).error ?? 'Failed to create document');
      const doc = await docRes.json();

      const linkRes = await fetch(`${API_URL}/documents/${doc.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ supplierId }),
      });
      if (!linkRes.ok) throw new Error((await linkRes.json()).error ?? 'Failed to link document');

      setInfo('Document uploaded.');
      (e.target as HTMLFormElement).reset();
      load();
      // Silence unused user var: layout owns auth.
      void userRaw;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Documents</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">
        Compliance documents you have shared with Sahel Pharma (WHO-GMP, CoA, stability, licences).
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {info && <p className="mt-4 text-sm text-brand-green-700">{info}</p>}

      <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-3 rounded-lg border border-brand-neutral-100 bg-white p-5 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase text-brand-neutral-500">Title</label>
          <input name="title" required className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-brand-neutral-500">Type</label>
          <select name="type" required defaultValue="WHO_GMP" className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm">
            {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-brand-neutral-500">S3 key</label>
          <input name="s3Key" required placeholder="suppliers/mumbai/coa-2025.pdf" className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-brand-neutral-500">Expiry date</label>
          <input name="expiryDate" type="date" className="mt-1 w-full rounded-md border border-brand-neutral-200 px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-brand-green-700 px-4 py-2 text-sm text-white hover:bg-brand-green-800 disabled:opacity-50"
          >
            {creating ? 'Uploading…' : 'Upload document'}
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-lg border border-brand-neutral-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-neutral-50 text-left text-xs uppercase tracking-wide text-brand-neutral-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-brand-neutral-100">
                <td className="px-4 py-3 font-medium">{d.title}</td>
                <td className="px-4 py-3">{d.type.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3">{d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">{new Date(d.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-brand-neutral-500">No documents yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
