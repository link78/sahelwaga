import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'For Buyers — Sahel Pharma Group',
  description:
    'Order WHO-GMP quality pharmaceuticals for your clinic, pharmacy, or NGO. Learn about minimum orders, lead times, and documentation.',
};

export default function BuyersPage() {
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
        <h1 className="font-serif text-4xl font-semibold">For Buyers</h1>
        <p className="mt-6 max-w-3xl text-lg text-brand-neutral-500">
          Whether you run a private clinic, hospital pharmacy, NGO health program, or retail
          pharmacy — we supply WHO-GMP quality medicines with full documentation and
          traceability.
        </p>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-neutral-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-2xl font-semibold">How Ordering Works</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green-100 text-brand-green-700 font-semibold">
                1
              </div>
              <h3 className="mt-4 font-semibold text-sm">Request Account</h3>
              <p className="mt-2 text-sm text-brand-neutral-500">
                Submit your organization details and import license (if applicable).
              </p>
            </div>
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green-100 text-brand-green-700 font-semibold">
                2
              </div>
              <h3 className="mt-4 font-semibold text-sm">Browse &amp; Order</h3>
              <p className="mt-2 text-sm text-brand-neutral-500">
                Access our full catalog with real-time stock levels and place purchase orders.
              </p>
            </div>
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green-100 text-brand-green-700 font-semibold">
                3
              </div>
              <h3 className="mt-4 font-semibold text-sm">Documentation</h3>
              <p className="mt-2 text-sm text-brand-neutral-500">
                Receive proforma invoice, COA, and import docs. We handle DGPML authorization.
              </p>
            </div>
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green-100 text-brand-green-700 font-semibold">
                4
              </div>
              <h3 className="mt-4 font-semibold text-sm">Delivery</h3>
              <p className="mt-2 text-sm text-brand-neutral-500">
                Products delivered to your location in Ouagadougou or shipped to regional
                destinations.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-2xl font-semibold">Key Information</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-brand-neutral-100 p-6">
            <h3 className="font-semibold text-brand-green-700">Minimum Order</h3>
            <p className="mt-3 text-sm text-brand-neutral-500">
              500,000 FCFA (~$800 USD) per order for local stock items. Custom import orders
              start at 5,000,000 FCFA (~$8,000 USD).
            </p>
          </div>
          <div className="rounded-lg border border-brand-neutral-100 p-6">
            <h3 className="font-semibold text-brand-green-700">Lead Times</h3>
            <p className="mt-3 text-sm text-brand-neutral-500">
              Local stock: 1–3 business days. Import orders: 8–12 weeks (sea freight) or
              3–4 weeks (air freight, surcharge applies).
            </p>
          </div>
          <div className="rounded-lg border border-brand-neutral-100 p-6">
            <h3 className="font-semibold text-brand-green-700">Documentation</h3>
            <p className="mt-3 text-sm text-brand-neutral-500">
              Every delivery includes: batch-level COA, import authorization copy, packing list,
              and commercial invoice. Cold chain items include temperature logs.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-green-50">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="font-serif text-2xl font-semibold">Start Ordering</h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-neutral-500">
            Request a buyer account and our team will verify your organization within
            2 business days.
          </p>
          <Link
            href="/contact?intent=buyer"
            className="mt-8 inline-block rounded-md bg-brand-green-700 px-6 py-3 text-white hover:bg-brand-green-800"
          >
            Request account
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
