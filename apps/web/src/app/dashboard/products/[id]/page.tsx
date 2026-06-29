'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { API_BASE_URL as API_URL } from '../../../../lib/api';

interface SupplierLink {
  id: string;
  supplier: { id: string; name: string };
}

interface Pricing {
  id: string;
  unitPrice: string;
  currency: string;
  effectiveFrom: string;
}

interface Product {
  id: string;
  name: string;
  inn: string | null;
  category: string;
  form: string | null;
  strength: string | null;
  packSize: string | null;
  shelfLifeMonths: number | null;
  storageConditions: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  supplierLinks: SupplierLink[];
  pricing: Pricing[];
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/products/${id}`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then(setProduct)
      .catch((e) => setError(e.message));
  }, [id]);

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this product?')) return;
    setDeleting(true);
    const token = window.localStorage.getItem('sahelwaga.access');
    try {
      const r = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: token ? { authorization: 'Bearer ' + token } : {},
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to delete');
      router.push('/dashboard/products');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/dashboard/products" className="mt-2 inline-block text-sm text-brand-green-700">
          ← Back to products
        </Link>
      </div>
    );
  }

  if (!product) {
    return <p className="text-sm text-brand-neutral-500">Loading…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/products" className="text-sm text-brand-green-700 hover:underline">
            ← Products
          </Link>
          <h1 className="mt-1 font-serif text-3xl font-semibold">{product.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/products/${id}/edit`}
            className="rounded-md border border-brand-neutral-200 px-4 py-2 text-sm hover:bg-brand-neutral-50"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">
            Details
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">Category</dt>
              <dd>{product.category}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">INN</dt>
              <dd>{product.inn ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">Form</dt>
              <dd>{product.form ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">Strength</dt>
              <dd>{product.strength ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">Pack size</dt>
              <dd>{product.packSize ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">Shelf life</dt>
              <dd>{product.shelfLifeMonths ? `${product.shelfLifeMonths} months` : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">Storage</dt>
              <dd>{product.storageConditions ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-brand-neutral-500">Status</dt>
              <dd>
                <span
                  className={
                    'inline-block rounded-full px-2 py-0.5 text-xs font-medium ' +
                    (product.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : product.status === 'DRAFT'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800')
                  }
                >
                  {product.status}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">
              Suppliers
            </h2>
            {product.supplierLinks.length === 0 ? (
              <p className="mt-3 text-sm text-brand-neutral-400">No linked suppliers.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {product.supplierLinks.map((sl) => (
                  <li key={sl.id}>{sl.supplier.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-brand-neutral-100 bg-white p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide text-brand-neutral-500">
              Recent pricing
            </h2>
            {product.pricing.length === 0 ? (
              <p className="mt-3 text-sm text-brand-neutral-400">No pricing records.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm">
                {product.pricing.map((pr) => (
                  <li key={pr.id} className="flex justify-between">
                    <span>
                      {pr.currency} {pr.unitPrice}
                    </span>
                    <span className="text-brand-neutral-400">
                      from {new Date(pr.effectiveFrom).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
