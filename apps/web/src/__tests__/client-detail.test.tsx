import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard/clients/test-id',
  useParams: () => ({ id: 'test-id' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockClient = {
  id: 'test-id',
  name: 'Clinique Saint-Luc',
  type: 'CLINIC',
  country: 'Burkina Faso',
  city: 'Ouagadougou',
  address: '123 Avenue de la Santé',
  creditTermsDays: 30,
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  contacts: [
    { id: 'c-1', name: 'Dr. Ouédraogo', role: 'Director', email: 'doc@clinic.bf', phone: '+226 12345', isPrimary: true },
  ],
  salesOrders: [
    { id: 'so-1', orderNumber: 'SO-001', status: 'CONFIRMED', createdAt: '2024-06-01T00:00:00Z' },
  ],
};

describe('ClientDetailPage', () => {
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

  it('renders client details', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockClient,
    });

    const { default: ClientDetailPage } = await import(
      '../app/dashboard/clients/[id]/page'
    );
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Clinique Saint-Luc')).toBeInTheDocument();
    });

    expect(screen.getByText('CLINIC')).toBeInTheDocument();
    expect(screen.getByText('Burkina Faso')).toBeInTheDocument();
    expect(screen.getByText('Ouagadougou')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
    expect(screen.getByText('Dr. Ouédraogo')).toBeInTheDocument();
    expect(screen.getByText('SO-001')).toBeInTheDocument();
  });

  it('shows edit and delete buttons', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockClient,
    });

    const { default: ClientDetailPage } = await import(
      '../app/dashboard/clients/[id]/page'
    );
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('shows error when client not found', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Client not found' }),
    });

    const { default: ClientDetailPage } = await import(
      '../app/dashboard/clients/[id]/page'
    );
    render(<ClientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Client not found')).toBeInTheDocument();
    });
  });
});
