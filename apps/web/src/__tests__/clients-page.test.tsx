import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard/clients',
  useParams: () => ({ id: 'test-id' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ClientsPage', () => {
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

  it('renders heading and new client button', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
    });

    const { default: ClientsPage } = await import(
      '../app/dashboard/clients/page'
    );
    render(<ClientsPage />);

    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('New client')).toBeInTheDocument();
  });

  it('renders client list from API', async () => {
    const mockClients = {
      items: [
        {
          id: '1',
          name: 'Clinique Saint-Luc',
          type: 'CLINIC',
          country: 'Burkina Faso',
          city: 'Ouagadougou',
          status: 'ACTIVE',
          creditTermsDays: 30,
        },
        {
          id: '2',
          name: 'Pharmacie Centrale',
          type: 'PHARMACY',
          country: 'Burkina Faso',
          city: 'Bobo-Dioulasso',
          status: 'ON_HOLD',
          creditTermsDays: null,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockClients,
    });

    const { default: ClientsPage } = await import(
      '../app/dashboard/clients/page'
    );
    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText('Clinique Saint-Luc')).toBeInTheDocument();
      expect(screen.getByText('Pharmacie Centrale')).toBeInTheDocument();
    });

    expect(screen.getByText('CLINIC')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
  });

  it('shows empty state when no clients', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
    });

    const { default: ClientsPage } = await import(
      '../app/dashboard/clients/page'
    );
    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No clients yet/)).toBeInTheDocument();
    });
  });

  it('shows error message on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    });

    const { default: ClientsPage } = await import(
      '../app/dashboard/clients/page'
    );
    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    });
  });
});
