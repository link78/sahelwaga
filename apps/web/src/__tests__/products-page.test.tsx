import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard/products',
  useParams: () => ({ id: 'test-id' }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ProductsPage', () => {
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

  it('renders heading and new product button', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
    });

    const { default: ProductsPage } = await import(
      '../app/dashboard/products/page'
    );
    render(<ProductsPage />);

    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('New product')).toBeInTheDocument();
  });

  it('renders product list from API', async () => {
    const mockProducts = {
      items: [
        {
          id: '1',
          name: 'Amoxicillin 500mg',
          category: 'ANTIBIOTIC',
          status: 'ACTIVE',
          form: 'Capsule',
          strength: '500mg',
          packSize: '10x10',
        },
        {
          id: '2',
          name: 'Paracetamol 500mg',
          category: 'PAINKILLER',
          status: 'DRAFT',
          form: 'Tablet',
          strength: '500mg',
          packSize: '10x10',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockProducts,
    });

    const { default: ProductsPage } = await import(
      '../app/dashboard/products/page'
    );
    render(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Amoxicillin 500mg')).toBeInTheDocument();
      expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    });

    expect(screen.getByText('ANTIBIOTIC')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('shows empty state when no products', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
    });

    const { default: ProductsPage } = await import(
      '../app/dashboard/products/page'
    );
    render(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No products yet/)).toBeInTheDocument();
    });
  });

  it('shows error message on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    });

    const { default: ProductsPage } = await import(
      '../app/dashboard/products/page'
    );
    render(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    });
  });
});
