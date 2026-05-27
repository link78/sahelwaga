'use client';

import Link from 'next/link';
import { ProductForm } from '../_components/ProductForm';

export default function NewProductPage() {
  return (
    <div>
      <Link href="/dashboard/products" className="text-sm text-brand-green-700 hover:underline">
        ← Products
      </Link>
      <h1 className="mt-1 font-serif text-3xl font-semibold">New product</h1>
      <div className="mt-6">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
