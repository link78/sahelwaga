'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Document {
  id: string;
  type: string;
  title: string;
  mimeType: string | null;
  expiryDate: string | null;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  WHO_GMP: 'text-green-700 bg-green-50',
  COA: 'text-blue-700 bg-blue-50',
  STABILITY: 'text-purple-700 bg-purple-50',
  IMPORT_PERMIT: 'text-amber-700 bg-amber-50',
  INVOICE: 'text-gray-700 bg-gray-50',
  OTHER: 'text-gray-500 bg-gray-50',
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/documents`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then((data) => {
        setDocs(data.items);
        setTotal(data.total);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-brand-neutral-900">Documents</h1>
          <p className="mt-1 text-sm text-brand-neutral-500">{total} document(s) in the library</p>
        </div>
        <Link
          href="/dashboard/documents/new"
          className="rounded-md bg-brand-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-700"
        >
          New document
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-brand-neutral-100 text-brand-neutral-500">
            <th className="pb-3 font-medium">Title</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">MIME</th>
            <th className="pb-3 font-medium">Expiry</th>
            <th className="pb-3 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((doc) => (
            <tr key={doc.id} className="border-b border-brand-neutral-50 hover:bg-brand-neutral-50">
              <td className="py-3">
                <Link href={`/dashboard/documents/${doc.id}`} className="text-brand-green-700 hover:underline">
                  {doc.title}
                </Link>
              </td>
              <td className="py-3">
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[doc.type] ?? TYPE_COLORS.OTHER}`}>
                  {doc.type.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="py-3 text-brand-neutral-500">{doc.mimeType ?? '—'}</td>
              <td className="py-3 text-brand-neutral-500">
                {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '—'}
              </td>
              <td className="py-3 text-brand-neutral-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
