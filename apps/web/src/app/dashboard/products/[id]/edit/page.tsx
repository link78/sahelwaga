'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProductForm, ProductFormData } from '../../_components/ProductForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [initialData, setInitialData] = useState<Partial<ProductFormData> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem('sahelwaga.access');
    fetch(`${API_URL}/products/${id}`, {
      headers: token ? { authorization: 'Bearer ' + token } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load');
        return r.json();
      })
      .then((product) => {
        setInitialData({
          name: product.name,
          inn: product.inn ?? '',
          category: product.category,
          form: product.form ?? '',
          strength: product.strength ?? '',
          packSize: product.packSize ?? '',
          shelfLifeMonths: product.shelfLifeMonths?.toString() ?? '',
          storageConditions: product.storageConditions ?? '',
          status: product.status,
        });
      })
      .catch((e) => setError(e.message));
  }, [id]);

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

  if (!initialData) {
    return <p className="text-sm text-brand-neutral-500">Loading…</p>;
  }

  return (
    <div>
      <Link href={`/dashboard/products/${id}`} className="text-sm text-brand-green-700 hover:underline">
        ← Back to product
      </Link>
      <h1 className="mt-1 font-serif text-3xl font-semibold">Edit product</h1>
      <div className="mt-6">
        <ProductForm mode="edit" productId={id} initialData={initialData} />
      </div>
    </div>
  );
}
