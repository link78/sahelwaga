import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard/products/new',
  useParams: () => ({ id: 'test-id' }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ProductForm', () => {
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

  it('renders create form with all fields', async () => {
    const { ProductForm } = await import(
      '../app/dashboard/products/_components/ProductForm'
    );
    render(<ProductForm mode="create" />);

    expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Category *')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText(/INN/)).toBeInTheDocument();
    expect(screen.getByLabelText('Form')).toBeInTheDocument();
    expect(screen.getByLabelText('Strength')).toBeInTheDocument();
    expect(screen.getByLabelText('Pack size')).toBeInTheDocument();
    expect(screen.getByLabelText(/Shelf life/)).toBeInTheDocument();
    expect(screen.getByLabelText('Storage conditions')).toBeInTheDocument();
    expect(screen.getByText('Create product')).toBeInTheDocument();
  });

  it('renders edit form with initial data', async () => {
    const { ProductForm } = await import(
      '../app/dashboard/products/_components/ProductForm'
    );
    render(
      <ProductForm
        mode="edit"
        productId="test-id"
        initialData={{
          name: 'Amoxicillin',
          category: 'ANTIBIOTIC',
          status: 'ACTIVE',
          inn: '',
          form: 'Capsule',
          strength: '500mg',
          packSize: '10x10',
          shelfLifeMonths: '36',
          storageConditions: '',
        }}
      />,
    );

    expect(screen.getByDisplayValue('Amoxicillin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Capsule')).toBeInTheDocument();
    expect(screen.getByDisplayValue('500mg')).toBeInTheDocument();
    expect(screen.getByText('Save changes')).toBeInTheDocument();
  });

  it('submits create form and redirects on success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-product-id', name: 'Test' }),
    });

    const { ProductForm } = await import(
      '../app/dashboard/products/_components/ProductForm'
    );
    render(<ProductForm mode="create" />);

    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Test Product' } });
    fireEvent.click(screen.getByText('Create product'));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/products'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows error on submission failure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Validation failed' }),
    });

    const { ProductForm } = await import(
      '../app/dashboard/products/_components/ProductForm'
    );
    render(<ProductForm mode="create" />);

    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Create product'));

    await screen.findByText('Validation failed');
  });
});
