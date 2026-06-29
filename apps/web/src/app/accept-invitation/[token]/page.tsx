'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { API_BASE_URL as API_URL, persistSession } from '../../../lib/api';

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const rawToken = params?.token;
  const token = typeof rawToken === 'string' ? decodeURIComponent(rawToken) : '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Missing invitation token');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/auth/accept-invitation`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? 'Failed to accept invitation');
      }
      persistSession({ access: body.access, user: body.user });
      // Mirror the post-login redirect logic.
      if (body.user?.role === 'SUPPLIER_PORTAL') {
        router.push('/portal/supplier');
      } else if (body.user?.role === 'CLIENT_PORTAL') {
        router.push('/portal/client');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-neutral-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-brand-neutral-100 bg-white p-8 shadow-sm">
        <h1 className="font-serif text-2xl font-semibold">Accept your invitation</h1>
        <p className="mt-2 text-sm text-brand-neutral-500">
          Choose a password to activate your portal account.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="block text-xs uppercase text-brand-neutral-500">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs uppercase text-brand-neutral-500">Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2"
            />
          </label>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-brand-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-green-800 disabled:opacity-50"
          >
            {submitting ? 'Activating...' : 'Activate account'}
          </button>
        </form>
      </div>
    </div>
  );
}
