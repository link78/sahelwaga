'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

interface SupplierContact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

interface SupplierVetting {
  id: string;
  whoGmpVerified: boolean;
  coaReceived: boolean;
  stabilityHotClimate: boolean;
  westAfricaReferences: boolean;
  notes: string | null;
}

interface SupplierExportRecord {
  id: string;
  country: string;
  year: number;
  volume: string | null;
  notes: string | null;
}

interface ProductLink {
  id: string;
  product: { id: string; name: string; category: string; form: string | null; strength: string | null };
  isPrimary: boolean;
}

interface PriceTier {
  id: string;
  productId: string;
  product?: { name: string };
  minQty: number;
  unitPrice: string;
  currency: string;
  incoterm: string | null;
}

interface SupplierDetail {
  id: string;
  name: string;
  country: string;
  status: string;
  whoGmpStatus: string;
  rating: string | null;
  notes: string | null;
  contacts: SupplierContact[];
  vetting: SupplierVetting | null;
  exportRecords: SupplierExportRecord[];
  productLinks: ProductLink[];
  priceTiers: PriceTier[];
}

const STATUS_COLORS: Record<string, string> = {
  PROSPECT: 'bg-gray-100 text-gray-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-red-50 text-red-600',
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/suppliers/${params.id}`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(setSupplier)
      .catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!supplier) return <p className="text-sm text-brand-neutral-500">Loading...</p>;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold">{supplier.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[supplier.status] ?? ''}`}>
              {supplier.status.replace('_', ' ')}
            </span>
            <span className="text-sm text-brand-neutral-500">{supplier.country}</span>
            {supplier.rating && (
              <span className="text-sm font-medium text-brand-green-700">Rating: {supplier.rating}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/suppliers/${supplier.id}/edit`}
            className="rounded-md border border-brand-neutral-100 px-4 py-2 text-sm hover:bg-brand-neutral-50"
          >
            Edit
          </Link>
          <button
            onClick={() => {
              if (!confirm('Delete this supplier?')) return;
              const token = window.localStorage.getItem('sahelwaga.access');
              fetch(`${API_URL}/suppliers/${supplier.id}`, {
                method: 'DELETE',
                headers: token ? { authorization: 'Bearer ' + token } : {},
              }).then(() => router.push('/dashboard/suppliers'));
            }}
            className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Company Info */}
      <section>
        <h2 className="font-serif text-xl font-semibold">Company Information</h2>
        <div className="mt-4 rounded-lg border border-brand-neutral-100 bg-white p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs uppercase text-brand-neutral-500">Country</dt>
              <dd className="mt-1 text-sm font-medium">{supplier.country}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-brand-neutral-500">WHO-GMP Status</dt>
              <dd className="mt-1 text-sm font-medium">{supplier.whoGmpStatus}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-brand-neutral-500">Rating</dt>
              <dd className="mt-1 text-sm font-medium">{supplier.rating ?? 'Not rated'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-brand-neutral-500">Status</dt>
              <dd className="mt-1 text-sm font-medium">{supplier.status.replace('_', ' ')}</dd>
            </div>
          </dl>
          {supplier.notes && (
            <div className="mt-4 border-t border-brand-neutral-100 pt-4">
              <dt className="text-xs uppercase text-brand-neutral-500">Notes</dt>
              <dd className="mt-1 text-sm whitespace-pre-wrap">{supplier.notes}</dd>
            </div>
          )}
        </div>
      </section>

      {/* Contact Persons */}
      <section>
        <h2 className="font-serif text-xl font-semibold">Contact Persons</h2>
        <div className="mt-4 rounded-lg border border-brand-neutral-100 bg-white">
          {supplier.contacts.length === 0 ? (
            <p className="p-6 text-sm text-brand-neutral-500">No contacts added yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-brand-neutral-50 text-left text-xs uppercase text-brand-neutral-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Primary</th>
                </tr>
              </thead>
              <tbody>
                {supplier.contacts.map((c) => (
                  <tr key={c.id} className="border-t border-brand-neutral-100">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.role ?? '—'}</td>
                    <td className="px-4 py-3">{c.email ?? '—'}</td>
                    <td className="px-4 py-3">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3">{c.isPrimary ? '✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Vetting Workflow */}
      <section>
        <h2 className="font-serif text-xl font-semibold">Vetting Checklist</h2>
        <div className="mt-4 rounded-lg border border-brand-neutral-100 bg-white p-6">
          {supplier.vetting ? (
            <div className="space-y-3">
              <VettingItem label="WHO-GMP verified?" checked={supplier.vetting.whoGmpVerified} />
              <VettingItem label="COA samples received?" checked={supplier.vetting.coaReceived} />
              <VettingItem label="Stability data for hot climates?" checked={supplier.vetting.stabilityHotClimate} />
              <VettingItem label="Reference clients in West Africa?" checked={supplier.vetting.westAfricaReferences} />
              {supplier.vetting.notes && (
                <div className="mt-4 border-t border-brand-neutral-100 pt-4">
                  <p className="text-xs uppercase text-brand-neutral-500">Vetting Notes</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{supplier.vetting.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-brand-neutral-500">
              No vetting record yet. Edit the supplier to start the vetting workflow.
            </p>
          )}
        </div>
      </section>

      {/* Product Lines */}
      <section>
        <h2 className="font-serif text-xl font-semibold">Product Lines</h2>
        <div className="mt-4 rounded-lg border border-brand-neutral-100 bg-white">
          {supplier.productLinks.length === 0 ? (
            <p className="p-6 text-sm text-brand-neutral-500">No products linked yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-brand-neutral-50 text-left text-xs uppercase text-brand-neutral-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Form</th>
                  <th className="px-4 py-3">Strength</th>
                  <th className="px-4 py-3">Primary</th>
                </tr>
              </thead>
              <tbody>
                {supplier.productLinks.map((pl) => (
                  <tr key={pl.id} className="border-t border-brand-neutral-100">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/dashboard/products/${pl.product.id}`} className="text-brand-green-700 hover:underline">
                        {pl.product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{pl.product.category}</td>
                    <td className="px-4 py-3">{pl.product.form ?? '—'}</td>
                    <td className="px-4 py-3">{pl.product.strength ?? '—'}</td>
                    <td className="px-4 py-3">{pl.isPrimary ? '✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Export History */}
      <section>
        <h2 className="font-serif text-xl font-semibold">Export History to West Africa</h2>
        <div className="mt-4 rounded-lg border border-brand-neutral-100 bg-white">
          {supplier.exportRecords.length === 0 ? (
            <p className="p-6 text-sm text-brand-neutral-500">No export records yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-brand-neutral-50 text-left text-xs uppercase text-brand-neutral-500">
                <tr>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Volume</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {supplier.exportRecords.map((r) => (
                  <tr key={r.id} className="border-t border-brand-neutral-100">
                    <td className="px-4 py-3">{r.country}</td>
                    <td className="px-4 py-3">{r.year}</td>
                    <td className="px-4 py-3">{r.volume ?? '—'}</td>
                    <td className="px-4 py-3">{r.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* MOQs & Pricing Tiers */}
      <section>
        <h2 className="font-serif text-xl font-semibold">MOQs &amp; Pricing Tiers</h2>
        <div className="mt-4 rounded-lg border border-brand-neutral-100 bg-white">
          {supplier.priceTiers.length === 0 ? (
            <p className="p-6 text-sm text-brand-neutral-500">No pricing tiers defined yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-brand-neutral-50 text-left text-xs uppercase text-brand-neutral-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Min Qty</th>
                  <th className="px-4 py-3">Unit Price</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Incoterm</th>
                </tr>
              </thead>
              <tbody>
                {supplier.priceTiers.map((t) => (
                  <tr key={t.id} className="border-t border-brand-neutral-100">
                    <td className="px-4 py-3">{t.productId}</td>
                    <td className="px-4 py-3">{t.minQty.toLocaleString()}</td>
                    <td className="px-4 py-3">{t.unitPrice}</td>
                    <td className="px-4 py-3">{t.currency}</td>
                    <td className="px-4 py-3">{t.incoterm ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function VettingItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-5 w-5 items-center justify-center rounded ${checked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
        {checked ? '✓' : '✗'}
      </span>
      <span className="text-sm">{label}</span>
    </div>
  );
}
