import Link from 'next/link';

export default function HomePage() {
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
        <h1 className="font-serif text-5xl font-semibold leading-tight text-brand-neutral-900">
          Reliable pharmaceutical supply
          <br />
          for the Sahel region.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-brand-neutral-500">
          We connect WHO-GMP certified Indian manufacturers with clinics, pharmacies and NGOs
          across West Africa. Quality-assured antibiotics, antimalarials, pediatric syrups,
          IV fluids and consumables — stability-tested for hot climates.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/contact?intent=partnership"
            className="rounded-md bg-brand-green-700 px-6 py-3 text-white hover:bg-brand-green-800"
          >
            Request partnership
          </Link>
          <Link
            href="/products"
            className="rounded-md border border-brand-neutral-100 px-6 py-3 text-brand-neutral-900 hover:bg-brand-neutral-50"
          >
            View product catalog
          </Link>
        </div>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-neutral-50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-20 md:grid-cols-3">
          <div>
            <h3 className="font-semibold text-brand-green-700">WHO-GMP sourcing</h3>
            <p className="mt-3 text-sm text-brand-neutral-500">
              Every supplier is vetted against WHO-GMP standards with documented COA and stability
              data before being approved.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-brand-green-700">Built for the Sahel</h3>
            <p className="mt-3 text-sm text-brand-neutral-500">
              Stability tested for hot climates, compliant with DGPML import requirements,
              delivered through our Burkina Faso operations.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-brand-green-700">End-to-end visibility</h3>
            <p className="mt-3 text-sm text-brand-neutral-500">
              From PO to import authorization to client delivery — every batch is traceable with
              full documentation.
            </p>
          </div>
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
