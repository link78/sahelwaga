'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SupplierForm from '../../_components/SupplierForm';

import { API_BASE_URL as API_URL } from '../../../../../lib/api';

export default function EditSupplierPage() {
  const params = useParams();
  const [supplier, setSupplier] = useState<{ id: string; name: string; country: string; status: string; whoGmpStatus: string; rating: string | null; notes: string } | null>(null);
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
    <div>
      <h1 className="font-serif text-3xl font-semibold">Edit Supplier</h1>
      <p className="mt-1 text-sm text-brand-neutral-500">Update supplier information.</p>
      <div className="mt-8">
        <SupplierForm
          mode="edit"
          initialData={{
            id: supplier.id,
            name: supplier.name,
            country: supplier.country,
            status: supplier.status,
            whoGmpStatus: supplier.whoGmpStatus,
            rating: supplier.rating,
            notes: supplier.notes ?? '',
          }}
        />
      </div>
    </div>
  );
}
