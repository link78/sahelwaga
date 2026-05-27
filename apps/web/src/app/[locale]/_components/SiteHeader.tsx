import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { LocaleSwitcher } from './LocaleSwitcher';

interface SiteHeaderProps {
  /** Path key (`products`, `about`, ...) — used to mark the active link. */
  active?: 'products' | 'about' | 'manufacturers' | 'buyers' | 'contact' | null;
}

export function SiteHeader({ active = null }: SiteHeaderProps) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const locale = useLocale();
  const prefix = `/${locale}`;

  const items: Array<{ href: string; key: NonNullable<SiteHeaderProps['active']> }> = [
    { href: `${prefix}/products`, key: 'products' },
    { href: `${prefix}/about`, key: 'about' },
    { href: `${prefix}/manufacturers`, key: 'manufacturers' },
    { href: `${prefix}/buyers`, key: 'buyers' },
    { href: `${prefix}/contact`, key: 'contact' },
  ];

  return (
    <header className="border-b border-brand-neutral-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href={prefix} className="font-serif text-xl font-semibold text-brand-green-700">
          {tc('brand')}
        </Link>
        <nav className="flex items-center gap-6 text-sm text-brand-neutral-500">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={
                active === item.key
                  ? 'font-medium text-brand-neutral-900'
                  : 'hover:text-brand-neutral-900'
              }
            >
              {t(item.key)}
            </Link>
          ))}
          <LocaleSwitcher />
          <Link
            href="/login"
            className="rounded-md bg-brand-green-700 px-4 py-2 text-white hover:bg-brand-green-800"
          >
            {tc('signIn')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
