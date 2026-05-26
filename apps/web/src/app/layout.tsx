import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Sahel Pharma Group',
  description:
    'Reliable pharmaceutical supply for the Sahel region — WHO-GMP sourced antibiotics, antimalarials, IV fluids and consumables.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
