'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PortalIndexPage() {
  const router = useRouter();
  useEffect(() => {
    const raw = window.localStorage.getItem('sahelwaga.user');
    if (!raw) {
      router.replace('/login');
      return;
    }
    const { role } = JSON.parse(raw) as { role: string };
    if (role === 'SUPPLIER_PORTAL') router.replace('/portal/supplier');
    else if (role === 'CLIENT_PORTAL') router.replace('/portal/client');
    else router.replace('/dashboard');
  }, [router]);
  return null;
}
