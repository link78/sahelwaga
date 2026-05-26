'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ContactForm() {
  const searchParams = useSearchParams();
  const intent = searchParams.get('intent') ?? 'general';

  const [submitted, setSubmitted] = useState(false);

  const intentLabels: Record<string, string> = {
    partnership: 'Request Partnership',
    supplier: 'Apply as Supplier',
    buyer: 'Request Buyer Account',
    general: 'General Inquiry',
  };

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h1 className="font-serif text-4xl font-semibold">Contact Us</h1>
        <p className="mt-4 max-w-2xl text-brand-neutral-500">
          Reach out for partnership inquiries, supplier applications, buyer accounts, or
          general questions about our services.
        </p>
      </section>

      <section className="border-t border-brand-neutral-100 bg-brand-neutral-50">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 px-6 py-20 md:grid-cols-2">
          <div>
            {submitted ? (
              <div className="rounded-lg border border-brand-green-100 bg-brand-green-50 p-8">
                <h2 className="font-serif text-xl font-semibold text-brand-green-700">
                  Message Sent
                </h2>
                <p className="mt-3 text-sm text-brand-neutral-500">
                  Thank you for reaching out. Our team will respond within 2 business days.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
                className="space-y-5"
              >
                <div>
                  <label htmlFor="contact-intent" className="block text-sm font-medium">
                    Inquiry Type
                  </label>
                  <select
                    id="contact-intent"
                    defaultValue={intent}
                    className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
                  >
                    {Object.entries(intentLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium">
                    Full Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="contact-org" className="block text-sm font-medium">
                    Organization
                  </label>
                  <input
                    id="contact-org"
                    type="text"
                    className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    required
                    className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-brand-green-700 px-6 py-3 text-white hover:bg-brand-green-800"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-brand-green-700">US Headquarters</h3>
              <p className="mt-2 text-sm text-brand-neutral-500">
                Sahel Pharma Group LLC
                <br />
                United States
                <br />
                info@sahelpharma.com
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-brand-green-700">Burkina Faso Operations</h3>
              <p className="mt-2 text-sm text-brand-neutral-500">
                Sahel Pharma SARL
                <br />
                Ouagadougou, Burkina Faso
                <br />
                operations@sahelpharma.com
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-brand-green-700">Business Hours</h3>
              <p className="mt-2 text-sm text-brand-neutral-500">
                Monday–Friday: 8:00–17:00 GMT
                <br />
                Response time: within 2 business days
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function ContactPage() {
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
            <Link href="/contact" className="font-medium text-brand-neutral-900">Contact</Link>
            <Link
              href="/login"
              className="rounded-md bg-brand-green-700 px-4 py-2 text-white hover:bg-brand-green-800"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <Suspense fallback={null}>
        <ContactForm />
      </Suspense>

      <footer className="border-t border-brand-neutral-100">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-brand-neutral-500">
          © {new Date().getFullYear()} Sahel Pharma Group — US parent &amp; Burkina Faso subsidiary.
        </div>
      </footer>
    </main>
  );
}
