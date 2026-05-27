import { useTranslations } from 'next-intl';

export function SiteFooter() {
  const t = useTranslations('common');
  return (
    <footer className="border-t border-brand-neutral-100">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-brand-neutral-500">
        {t('footer', { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
