import { redirect } from 'next/navigation';
import { defaultLocale } from '../i18n';

// Ensure the root path ("/") always resolves to the default locale.
// The next-intl middleware normally handles this redirect, but providing an
// explicit root page guarantees a response even if middleware is bypassed
// (for example behind certain reverse-proxy setups).
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
