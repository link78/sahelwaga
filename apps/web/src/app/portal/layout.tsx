'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const SUPPLIER_NAV = [
  { href: '/portal/supplier', label: 'Overview' },
  { href: '/portal/supplier/purchase-orders', label: 'Purchase Orders' },
  { href: '/portal/supplier/documents', label: 'Documents' },
];

const CLIENT_NAV = [
  { href: '/portal/client', label: 'Overview' },
  { href: '/portal/client/sales-orders', label: 'Sales Orders' },
  { href: '/portal/client/products', label: 'Catalog' },
  { href: '/portal/client/documents', label: 'Documents' },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem('sahelwaga.user');
    if (!raw) {
      router.replace('/login');
      return;
    }
    const parsed: SessionUser = JSON.parse(raw);
    if (parsed.role !== 'SUPPLIER_PORTAL' && parsed.role !== 'CLIENT_PORTAL') {
      // Internal users have their own back office at /dashboard.
      router.replace('/dashboard');
      return;
    }
    // Bounce users into the right scope if they typed the wrong URL.
    if (parsed.role === 'SUPPLIER_PORTAL' && pathname.startsWith('/portal/client')) {
      router.replace('/portal/supplier');
      return;
    }
    if (parsed.role === 'CLIENT_PORTAL' && pathname.startsWith('/portal/supplier')) {
      router.replace('/portal/client');
      return;
    }
    setUser(parsed);
  }, [router, pathname]);

  function signOut() {
    void import('../../lib/api').then(({ signOut: doSignOut }) => doSignOut());
    router.replace('/login');
  }

  if (!user) return null;

  const nav = user.role === 'SUPPLIER_PORTAL' ? SUPPLIER_NAV : CLIENT_NAV;
  const scopeLabel = user.role === 'SUPPLIER_PORTAL' ? 'Supplier portal' : 'Client portal';

  return (
    <div className="flex min-h-screen bg-brand-neutral-50">
      <aside className="w-60 border-r border-brand-neutral-100 bg-white">
        <div className="border-b border-brand-neutral-100 px-5 py-5">
          <Link href="/" className="font-serif text-lg font-semibold text-brand-green-700">
            Sahel Pharma
          </Link>
          <div className="mt-1 text-xs uppercase tracking-wide text-brand-neutral-500">{scopeLabel}</div>
        </div>
        <nav className="px-3 py-4">
          {nav.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + '/');
            return (
              <Link
                key={n.href}
                href={n.href}
                className={
                  'block rounded-md px-3 py-2 text-sm ' +
                  (active
                    ? 'bg-brand-green-50 font-medium text-brand-green-700'
                    : 'text-brand-neutral-500 hover:bg-brand-neutral-50 hover:text-brand-neutral-900')
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-brand-neutral-100 bg-white px-8 py-4">
          <div className="text-sm text-brand-neutral-500">
            Signed in as <span className="font-medium text-brand-neutral-900">{user.name}</span> ({user.role})
          </div>
          <button
            onClick={signOut}
            className="rounded-md border border-brand-neutral-100 px-3 py-1.5 text-sm hover:bg-brand-neutral-50"
          >
            Sign out
          </button>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
