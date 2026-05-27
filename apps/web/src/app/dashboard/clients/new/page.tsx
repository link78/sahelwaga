'use client';

import Link from 'next/link';
import { ClientForm } from '../_components/ClientForm';

export default function NewClientPage() {
  return (
    <div>
      <Link href="/dashboard/clients" className="text-sm text-brand-green-700 hover:underline">
        ← Clients
      </Link>
      <h1 className="mt-1 font-serif text-3xl font-semibold">New client</h1>
      <div className="mt-6">
        <ClientForm mode="create" />
      </div>
    </div>
  );
}
