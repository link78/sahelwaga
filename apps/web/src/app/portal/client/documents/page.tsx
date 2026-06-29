'use client';

import { useEffect, useState } from 'react';

import { API_BASE_URL as API_URL } from '../../../../lib/api';

interface DocItem {
  id: string;
  type: string;
  title: string;
  expiryDate: string | null;
  createdAt: string;
}

export default function ClientPortalDocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/documents?pageSize=50`, { headers: token ? { authorization: 'Bearer ' + token } : {} })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? 'Failed'); return r.json(); })
      .then((d) => setDocs(d.items))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Documents</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">
        Invoices, packing lists and other documents MedSupply has shared with you.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-lg border border-brand-neutral-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-neutral-50 text-left text-xs uppercase tracking-wide text-brand-neutral-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Shared</th>
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
              <tr><td colSpan={4} className="px-4 py-8 text-center text-brand-neutral-500">No documents shared yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
