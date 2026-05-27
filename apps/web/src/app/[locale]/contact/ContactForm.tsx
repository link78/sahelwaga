'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { API_BASE_URL } from '../../../lib/api';

type IntentKey = 'partnership' | 'supplier' | 'buyer' | 'general';

function ContactFormInner() {
  const t = useTranslations('contact');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const rawIntent = searchParams.get('intent') ?? 'general';
  const initialIntent: IntentKey = (['partnership', 'supplier', 'buyer', 'general'] as const).includes(
    rawIntent as IntentKey,
  )
    ? (rawIntent as IntentKey)
    : 'general';

  const [intent, setIntent] = useState<IntentKey>(initialIntent);
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Public intent → backend Lead kind.
  function intentToKind(i: IntentKey): 'PARTNERSHIP' | 'ACCOUNT' | 'CONTACT' {
    if (i === 'partnership' || i === 'supplier') return 'PARTNERSHIP';
    if (i === 'buyer') return 'ACCOUNT';
    return 'CONTACT';
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: intentToKind(intent),
          name,
          email,
          company: organization || null,
          message: message || null,
          payload: { intent, locale },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmitted(true);
    } catch {
      setError(t('error'));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-brand-green-100 bg-brand-green-50 p-8">
        <h2 className="font-serif text-xl font-semibold text-brand-green-700">
          {t('success_title')}
        </h2>
        <p className="mt-3 text-sm text-brand-neutral-500">{t('success_body')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="contact-intent" className="block text-sm font-medium">
          {t('intent_label')}
        </label>
        <select
          id="contact-intent"
          value={intent}
          onChange={(e) => setIntent(e.target.value as IntentKey)}
          className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
        >
          {(['partnership', 'supplier', 'buyer', 'general'] as const).map((value) => (
            <option key={value} value={value}>
              {t(`intent.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium">
          {t('name')}
        </label>
        <input
          id="contact-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="contact-org" className="block text-sm font-medium">
          {t('organization')}
        </label>
        <input
          id="contact-org"
          type="text"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium">
          {t('email')}
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium">
          {t('message')}
        </label>
        <textarea
          id="contact-message"
          rows={5}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-neutral-100 px-3 py-2 text-sm"
        />
      </div>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-brand-green-700 px-6 py-3 text-white hover:bg-brand-green-800 disabled:opacity-60"
      >
        {submitting ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}

export function ContactForm() {
  return (
    <Suspense fallback={null}>
      <ContactFormInner />
    </Suspense>
  );
}
