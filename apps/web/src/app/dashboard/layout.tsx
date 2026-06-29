'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const nav = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/suppliers', label: 'Suppliers' },
  { href: '/dashboard/products', label: 'Products' },
  { href: '/dashboard/clients', label: 'Clients' },
  { href: '/dashboard/purchase-orders', label: 'Purchase Orders' },
  { href: '/dashboard/import-batches', label: 'Import Batches' },
  { href: '/dashboard/sales-orders', label: 'Sales Orders' },
  { href: '/dashboard/documents', label: 'Documents' },
  { href: '/dashboard/stock', label: 'Stock' },
  { href: '/dashboard/leads', label: 'Leads' },
  { href: '/dashboard/portal-invitations', label: 'Portal invitations' },
  { href: '/dashboard/compliance', label: 'Compliance' },
  { href: '/dashboard/audit-logs', label: 'Audit log' },
];

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
    // Phase 5: portal users belong to /portal/*, not the internal back office.
    if (parsed.role === 'SUPPLIER_PORTAL') {
      router.replace('/portal/supplier');
      return;
    }
    if (parsed.role === 'CLIENT_PORTAL') {
      router.replace('/portal/client');
      return;
    }
    setUser(parsed);
  }, [router]);

  function signOut() {
    void import('../../lib/api').then(({ signOut: doSignOut }) => doSignOut());
    router.replace('/login');
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-brand-neutral-50">
      <aside className="w-60 border-r border-brand-neutral-100 bg-white">
        <div className="border-b border-brand-neutral-100 px-5 py-5">
          <Link href="/" className="font-serif text-lg font-semibold text-brand-green-700">
            MedSupply
          </Link>
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
            Signed in as <span className="font-medium text-brand-neutral-900">{user.name}</span>{' '}
            ({user.role})
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
