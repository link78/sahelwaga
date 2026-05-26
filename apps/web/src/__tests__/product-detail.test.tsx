import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard/products/test-id',
  useParams: () => ({ id: 'test-id' }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockProduct = {
  id: 'test-id',
  name: 'Amoxicillin 500mg',
  inn: 'Amoxicillin',
  category: 'ANTIBIOTIC',
  form: 'Capsule',
  strength: '500mg',
  packSize: '10x10',
  shelfLifeMonths: 36,
  storageConditions: 'Store below 25°C',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  supplierLinks: [
    { id: 'sl-1', supplier: { id: 's-1', name: 'PharmaCorp India' } },
  ],
  pricing: [
    { id: 'p-1', unitPrice: '2.50', currency: 'USD', effectiveFrom: '2024-01-01T00:00:00Z' },
  ],
};

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'fake-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  it('renders product details', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    });

    const { default: ProductDetailPage } = await import(
      '../app/dashboard/products/[id]/page'
    );
    render(<ProductDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Amoxicillin 500mg')).toBeInTheDocument();
    });

    expect(screen.getByText('ANTIBIOTIC')).toBeInTheDocument();
    expect(screen.getByText('Capsule')).toBeInTheDocument();
    expect(screen.getByText('500mg')).toBeInTheDocument();
    expect(screen.getByText('36 months')).toBeInTheDocument();
    expect(screen.getByText('Store below 25°C')).toBeInTheDocument();
    expect(screen.getByText('PharmaCorp India')).toBeInTheDocument();
  });

  it('shows edit and delete buttons', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockProduct,
    });

    const { default: ProductDetailPage } = await import(
      '../app/dashboard/products/[id]/page'
    );
    render(<ProductDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('shows error when product not found', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Product not found' }),
    });

    const { default: ProductDetailPage } = await import(
      '../app/dashboard/products/[id]/page'
    );
    render(<ProductDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Product not found')).toBeInTheDocument();
    });
  });
});
