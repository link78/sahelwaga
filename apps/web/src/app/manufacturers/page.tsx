import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Manufacturers — Sahel Pharma Group',
  description:
    'Partner with Sahel Pharma Group to supply WHO-GMP quality medicines to West Africa. We work with Indian pharmaceutical manufacturers.',
};

export default function ManufacturersPage() {
  return (
    <main className="min-h-screen bg-white text-brand-neutral-900">
      <header className="border-b border-brand-neutral-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-xl font-semibold text-brand-green-700">
            Sahel Pharma Group
          </Link>
          <nav className="flex items-center gap-6 text-sm text-brand-neutral-500">
            <Link href="/products" className="hover:text-brand-neutral-900">Products</Link>
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

      <section className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="font-serif text-4xl font-semibold">For Manufacturers</h1>
        <p className="mt-6 max-w-3xl text-lg text-brand-neutral-500">
          We partner with WHO-GMP certified Indian pharmaceutical manufacturers to supply
          essential medicines to the Sahel and West African markets. If you produce quality
          generics and want to expand into Francophone Africa, we&apos;re your distribution
          partner.
        </p>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-neutral-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-2xl font-semibold">How We Work Together</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green-100 text-brand-green-700 font-semibold">
                1
              </div>
              <h3 className="mt-4 font-semibold">Product Selection</h3>
              <p className="mt-2 text-sm text-brand-neutral-500">
                We identify demand for specific molecules and formulations based on our
                client network across Burkina Faso and neighboring countries.
              </p>
            </div>
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green-100 text-brand-green-700 font-semibold">
                2
              </div>
              <h3 className="mt-4 font-semibold">QA &amp; Documentation</h3>
              <p className="mt-2 text-sm text-brand-neutral-500">
                We verify WHO-GMP certificates, request COAs for each batch, and require
                Zone IVb stability data for hot climate suitability.
              </p>
            </div>
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green-100 text-brand-green-700 font-semibold">
                3
              </div>
              <h3 className="mt-4 font-semibold">Ordering &amp; Logistics</h3>
              <p className="mt-2 text-sm text-brand-neutral-500">
                We issue purchase orders with clear volume commitments, handle DGPML import
                authorization, and manage sea/air freight to Ouagadougou.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-2xl font-semibold">What We Look For</h2>
        <ul className="mt-6 space-y-3 text-brand-neutral-500">
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-green-500" />
            Valid WHO-GMP or PIC/S certification for relevant product lines
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-green-500" />
            Ability to provide Zone IVb stability data (40°C/75% RH)
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-green-500" />
            Capacity for volume orders (typically 10,000–100,000 units per SKU)
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-green-500" />
            Willingness to provide French-language labeling or accept our labeling specs
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-green-500" />
            Competitive FOB pricing with transparent cost breakdown
          </li>
        </ul>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-green-50">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="font-serif text-2xl font-semibold">Ready to Supply West Africa?</h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-neutral-500">
            Apply as a supplier and our sourcing team will review your product portfolio within
            5 business days.
          </p>
          <Link
            href="/contact?intent=supplier"
            className="mt-8 inline-block rounded-md bg-brand-green-700 px-6 py-3 text-white hover:bg-brand-green-800"
          >
            Apply as supplier
          </Link>
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
