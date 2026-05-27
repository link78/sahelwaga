import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — Sahel Pharma Group',
  description:
    'Learn about Sahel Pharma Group — a US-based parent company with a subsidiary in Burkina Faso serving West Africa with WHO-GMP quality pharmaceuticals.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-brand-neutral-900">
      <header className="border-b border-brand-neutral-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-serif text-xl font-semibold text-brand-green-700">
            Sahel Pharma Group
          </Link>
          <nav className="flex items-center gap-6 text-sm text-brand-neutral-500">
            <Link href="/products" className="hover:text-brand-neutral-900">Products</Link>
            <Link href="/about" className="font-medium text-brand-neutral-900">About</Link>
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
        <h1 className="font-serif text-4xl font-semibold">About Sahel Pharma Group</h1>
        <p className="mt-6 max-w-3xl text-lg text-brand-neutral-500">
          Sahel Pharma Group is a pharmaceutical import and distribution company with a US parent
          entity and a fully licensed subsidiary in Burkina Faso. We exist to close the supply gap
          for essential medicines in the Sahel and broader West Africa.
        </p>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-neutral-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-2xl font-semibold">Our Service Region</h2>
          <p className="mt-4 max-w-3xl text-brand-neutral-500">
            Headquartered in the United States with operational base in Ouagadougou, Burkina Faso,
            we serve clinics, pharmacies, and NGOs across Burkina Faso and West Africa. Our
            logistics network is designed for the unique infrastructure challenges of the Sahel
            corridor.
          </p>
          <div className="mt-8 rounded-lg border border-brand-neutral-100 bg-white p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold text-brand-green-700">US Headquarters</h3>
                <p className="mt-2 text-sm text-brand-neutral-500">
                  Corporate parent — regulatory strategy, manufacturer relationships, and
                  financing.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-brand-green-700">Burkina Faso Operations</h3>
                <p className="mt-2 text-sm text-brand-neutral-500">
                  Import licensing, DGPML compliance, warehousing, and last-mile distribution
                  across Burkina Faso and neighboring countries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-2xl font-semibold">Compliance &amp; Quality Assurance</h2>
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-semibold text-brand-green-700">WHO-GMP Sourcing</h3>
            <p className="mt-3 text-sm text-brand-neutral-500">
              All products are sourced exclusively from manufacturers holding valid WHO-GMP
              certification. We verify certificates and audit production sites.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-brand-green-700">DGPML Licensed</h3>
            <p className="mt-3 text-sm text-brand-neutral-500">
              Our Burkina Faso subsidiary holds full import authorization from the Direction
              Générale de la Pharmacie, du Médicament et des Laboratoires (DGPML).
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-brand-green-700">Quality Assurance</h3>
            <p className="mt-3 text-sm text-brand-neutral-500">
              Certificate of Analysis (COA) for every batch, stability data for Zone IVb (hot/humid),
              and full traceability from manufacturer to end client.
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
