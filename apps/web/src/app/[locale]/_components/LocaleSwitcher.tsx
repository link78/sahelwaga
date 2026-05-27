'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

const LOCALES = [
  { value: 'en', label: 'EN' },
  { value: 'fr', label: 'FR' },
] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: string) {
    if (next === locale) return;
    // pathname currently starts with `/{locale}` — swap the segment.
    const segments = pathname.split('/');
    if (segments[1] && LOCALES.some((l) => l.value === segments[1])) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    const target = segments.join('/') || `/${next}`;
    startTransition(() => router.replace(target));
  }

  return (
    <div className="flex items-center gap-1 text-xs" aria-label="Language">
      {LOCALES.map((l, i) => (
        <span key={l.value} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => switchTo(l.value)}
            disabled={isPending}
            className={
              'rounded px-1.5 py-0.5 ' +
              (l.value === locale
                ? 'font-semibold text-brand-neutral-900'
                : 'text-brand-neutral-500 hover:text-brand-neutral-900')
            }
          >
            {l.label}
          </button>
          {i < LOCALES.length - 1 && <span className="text-brand-neutral-100">|</span>}
        </span>
      ))}
    </div>
  );
}
