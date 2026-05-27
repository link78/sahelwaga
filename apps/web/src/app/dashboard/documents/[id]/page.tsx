'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface DocumentLink {
  id: string;
  supplier?: { id: string; name: string } | null;
  product?: { id: string; name: string } | null;
  client?: { id: string; name: string } | null;
  purchaseOrder?: { id: string; poNumber: string } | null;
  importBatch?: { id: string; batchNumber: string } | null;
  salesOrder?: { id: string; soNumber: string } | null;
}

interface Document {
  id: string;
  type: string;
  title: string;
  s3Key: string;
  mimeType: string | null;
  sizeBytes: number | null;
  issueDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  uploadedBy: { id: string; name: string } | null;
  links: DocumentLink[];
  createdAt: string;
  updatedAt: string;
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/documents/${id}`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(setDoc)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!doc) return <p className="text-brand-neutral-500">Loading…</p>;

  function linkedEntityLabel(link: DocumentLink): string {
    if (link.supplier) return `Supplier: ${link.supplier.name}`;
    if (link.product) return `Product: ${link.product.name}`;
    if (link.client) return `Client: ${link.client.name}`;
    if (link.purchaseOrder) return `PO: ${link.purchaseOrder.poNumber}`;
    if (link.importBatch) return `IB: ${link.importBatch.batchNumber}`;
    if (link.salesOrder) return `SO: ${link.salesOrder.soNumber}`;
    return 'Unknown';
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/documents" className="text-sm text-brand-green-700 hover:underline">
        ← Back to Documents
      </Link>

      <h1 className="mt-4 font-serif text-3xl font-semibold text-brand-neutral-900">{doc.title}</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-brand-neutral-500">Type</span>
          <p className="mt-1">{doc.type.replace(/_/g, ' ')}</p>
        </div>
        <div>
          <span className="font-medium text-brand-neutral-500">S3 Key</span>
          <p className="mt-1 break-all font-mono text-xs">{doc.s3Key}</p>
        </div>
        <div>
          <span className="font-medium text-brand-neutral-500">MIME Type</span>
          <p className="mt-1">{doc.mimeType ?? '—'}</p>
        </div>
        <div>
          <span className="font-medium text-brand-neutral-500">Size</span>
          <p className="mt-1">{doc.sizeBytes != null ? `${(doc.sizeBytes / 1024).toFixed(1)} KB` : '—'}</p>
        </div>
        <div>
          <span className="font-medium text-brand-neutral-500">Issue Date</span>
          <p className="mt-1">{doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : '—'}</p>
        </div>
        <div>
          <span className="font-medium text-brand-neutral-500">Expiry Date</span>
          <p className="mt-1">{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '—'}</p>
        </div>
        <div>
          <span className="font-medium text-brand-neutral-500">Uploaded By</span>
          <p className="mt-1">{doc.uploadedBy?.name ?? '—'}</p>
        </div>
        <div>
          <span className="font-medium text-brand-neutral-500">Created</span>
          <p className="mt-1">{new Date(doc.createdAt).toLocaleString()}</p>
        </div>
      </div>

      {doc.notes && (
        <div className="mt-6">
          <span className="text-sm font-medium text-brand-neutral-500">Notes</span>
          <p className="mt-1 text-sm whitespace-pre-wrap">{doc.notes}</p>
        </div>
      )}

      {doc.links.length > 0 && (
        <div className="mt-8">
          <h2 className="font-serif text-lg font-semibold text-brand-neutral-900">Linked Entities</h2>
          <ul className="mt-3 space-y-2">
            {doc.links.map((link) => (
              <li key={link.id} className="rounded border border-brand-neutral-100 px-3 py-2 text-sm">
                {linkedEntityLabel(link)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
