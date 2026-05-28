'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, persistSession } from '../../lib/api';

// Prefilling demo credentials is helpful in development but leaks them in
// production. We use the deployment build mode rather than runtime env so the
// fields are *guaranteed* empty in production bundles.
const SHOW_DEMO_CREDENTIALS = process.env.NODE_ENV !== 'production';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(SHOW_DEMO_CREDENTIALS ? 'admin@sahelpharma.local' : '');
  const [password, setPassword] = useState(SHOW_DEMO_CREDENTIALS ? 'admin123!' : '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        // `credentials: include` lets the browser persist the HttpOnly refresh
        // cookie the API sets in the Set-Cookie response header.
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Login failed');
      }
      const data = await res.json();
      // Only the short-lived (15m) access token + public profile are kept in
      // browser storage. The refresh token now lives in the HttpOnly
      // `sahel_refresh` cookie set by the API and is therefore not reachable
      // from JavaScript (mitigates XSS-driven session theft).
      persistSession({ access: data.access, user: data.user });
      // Phase 5: route portal users into their dedicated portal experience.
      if (data.user?.role === 'SUPPLIER_PORTAL') router.push('/portal/supplier');
      else if (data.user?.role === 'CLIENT_PORTAL') router.push('/portal/client');
      else router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-neutral-50 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-brand-neutral-100 bg-white p-8 shadow-sm"
      >
        <h1 className="font-serif text-2xl font-semibold text-brand-green-700">Sign in</h1>
        <p className="mt-1 text-sm text-brand-neutral-500">Sahel Pharma Group internal portal.</p>

        <label className="mt-6 block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 focus:border-brand-green-500 focus:outline-none"
          required
        />

        <label className="mt-4 block text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 focus:border-brand-green-500 focus:outline-none"
          required
        />

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-brand-green-700 px-4 py-2 text-white hover:bg-brand-green-800 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
