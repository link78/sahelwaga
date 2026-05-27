'use client';

import Link from 'next/link';
import { useState } from 'react';

const CATEGORIES = [
  'All',
  'Antibiotics',
  'Antimalarials',
  'Painkillers',
  'Pediatric syrups',
  'IV fluids',
  'Consumables',
] as const;

const FORMS = ['All', 'Tablet', 'Capsule', 'Syrup', 'Injectable', 'IV bag', 'Device'] as const;

interface CatalogProduct {
  name: string;
  strength: string;
  form: string;
  packSize: string;
  category: string;
  manufacturer: string;
  stability: string;
}

const PRODUCTS: CatalogProduct[] = [
  {
    name: 'Amoxicillin',
    strength: '500 mg',
    form: 'Capsule',
    packSize: '10×10',
    category: 'Antibiotics',
    manufacturer: 'Cipla Ltd',
    stability: 'Zone IVb — 40°C/75% RH, 6 months',
  },
  {
    name: 'Azithromycin',
    strength: '250 mg',
    form: 'Tablet',
    packSize: '6s',
    category: 'Antibiotics',
    manufacturer: 'Hetero Labs',
    stability: 'Zone IVb — 40°C/75% RH, 6 months',
  },
  {
    name: 'Artemether-Lumefantrine',
    strength: '20/120 mg',
    form: 'Tablet',
    packSize: '6×4',
    category: 'Antimalarials',
    manufacturer: 'Ipca Laboratories',
    stability: 'Zone IVb — 40°C/75% RH, 6 months',
  },
  {
    name: 'Artesunate',
    strength: '60 mg',
    form: 'Injectable',
    packSize: '1 vial',
    category: 'Antimalarials',
    manufacturer: 'Guilin Pharmaceutical',
    stability: 'Zone IVb — 30°C/65% RH, 24 months',
  },
  {
    name: 'Paracetamol',
    strength: '500 mg',
    form: 'Tablet',
    packSize: '10×10',
    category: 'Painkillers',
    manufacturer: 'Strides Pharma',
    stability: 'Zone IVb — 40°C/75% RH, 6 months',
  },
  {
    name: 'Ibuprofen',
    strength: '400 mg',
    form: 'Tablet',
    packSize: '10×10',
    category: 'Painkillers',
    manufacturer: 'Cipla Ltd',
    stability: 'Zone IVb — 40°C/75% RH, 6 months',
  },
  {
    name: 'Amoxicillin Oral Suspension',
    strength: '125 mg/5 mL',
    form: 'Syrup',
    packSize: '100 mL',
    category: 'Pediatric syrups',
    manufacturer: 'Medopharm',
    stability: 'Zone IVb — 40°C/75% RH, 6 months',
  },
  {
    name: 'ORS + Zinc Co-pack',
    strength: '20 mg Zn + ORS sachet',
    form: 'Syrup',
    packSize: '10 sachets + 10 tabs',
    category: 'Pediatric syrups',
    manufacturer: 'FDC Ltd',
    stability: 'Zone IVb — 40°C/75% RH, 12 months',
  },
  {
    name: 'Ringer Lactate',
    strength: '500 mL',
    form: 'IV bag',
    packSize: '1 bag',
    category: 'IV fluids',
    manufacturer: 'Claris Lifesciences',
    stability: 'Zone IVb — 30°C/65% RH, 24 months',
  },
  {
    name: 'Normal Saline 0.9%',
    strength: '1000 mL',
    form: 'IV bag',
    packSize: '1 bag',
    category: 'IV fluids',
    manufacturer: 'Claris Lifesciences',
    stability: 'Zone IVb — 30°C/65% RH, 24 months',
  },
  {
    name: 'Disposable Syringe',
    strength: '5 mL',
    form: 'Device',
    packSize: '100s',
    category: 'Consumables',
    manufacturer: 'HMD Healthcare',
    stability: 'N/A',
  },
  {
    name: 'Surgical Gloves',
    strength: 'Medium',
    form: 'Device',
    packSize: '50 pairs',
    category: 'Consumables',
    manufacturer: 'Supermax',
    stability: 'N/A',
  },
];

export default function ProductsPage() {
  const [category, setCategory] = useState<string>('All');
  const [form, setForm] = useState<string>('All');

  const filtered = PRODUCTS.filter((p) => {
    if (category !== 'All' && p.category !== category) return false;
    if (form !== 'All' && p.form !== form) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-white text-brand-neutral-900">
      <header className="border-b border-brand-neutral-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-xl font-semibold text-brand-green-700">
            Sahel Pharma Group
          </Link>
          <nav className="flex items-center gap-6 text-sm text-brand-neutral-500">
            <Link href="/products" className="font-medium text-brand-neutral-900">Products</Link>
            <Link href="/about" className="hover:text-brand-neutral-900">About</Link>
            <Link href="/contact" className="hover:text-brand-neutral-900">Contact</Link>
            <Link
              href="/login"
              className="rounded-md bg-brand-green-700 px-4 py-2 text-white hover:bg-brand-green-800"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="font-serif text-4xl font-semibold">Product Catalog</h1>
        <p className="mt-4 max-w-2xl text-brand-neutral-500">
          WHO-GMP sourced essential medicines, stability-tested for hot climates. All products
          come with full COA and traceability documentation.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <div>
            <label htmlFor="category-filter" className="block text-xs font-medium text-brand-neutral-500">
              Category
            </label>
            <select
              id="category-filter"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="form-filter" className="block text-xs font-medium text-brand-neutral-500">
              Form
            </label>
            <select
              id="form-filter"
              value={form}
              onChange={(e) => setForm(e.target.value)}
              className="mt-1 rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
            >
              {FORMS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-brand-neutral-100 text-xs uppercase text-brand-neutral-500">
              <tr>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Strength</th>
                <th className="px-3 py-3">Form</th>
                <th className="px-3 py-3">Pack Size</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Manufacturer</th>
                <th className="px-3 py-3">Stability</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={`${product.name}-${product.strength}`} className="border-b border-brand-neutral-100">
                  <td className="px-3 py-3 font-medium">{product.name}</td>
                  <td className="px-3 py-3">{product.strength}</td>
                  <td className="px-3 py-3">{product.form}</td>
                  <td className="px-3 py-3">{product.packSize}</td>
                  <td className="px-3 py-3">{product.category}</td>
                  <td className="px-3 py-3">{product.manufacturer}</td>
                  <td className="px-3 py-3 text-xs text-brand-neutral-500">{product.stability}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-brand-neutral-500">
                    No products match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="border-t border-brand-neutral-100">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-brand-neutral-500">
          © {new Date().getFullYear()} Sahel Pharma Group — US parent &amp; Burkina Faso subsidiary.
        </div>
      </footer>
    </main>
  );
}
