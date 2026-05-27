import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard/clients/new',
  useParams: () => ({ id: 'test-id' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ClientForm', () => {
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
    const { ClientForm } = await import(
      '../app/dashboard/clients/_components/ClientForm'
    );
    render(<ClientForm mode="create" />);

    expect(screen.getByLabelText('Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Type *')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('Country *')).toBeInTheDocument();
    expect(screen.getByLabelText('City')).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Credit terms (days)')).toBeInTheDocument();
    expect(screen.getByText('Create client')).toBeInTheDocument();
  });

  it('renders edit form with initial data', async () => {
    const { ClientForm } = await import(
      '../app/dashboard/clients/_components/ClientForm'
    );
    render(
      <ClientForm
        mode="edit"
        clientId="test-id"
        initialData={{
          name: 'Clinique Saint-Luc',
          type: 'CLINIC',
          country: 'Burkina Faso',
          city: 'Ouagadougou',
          address: '',
          creditTermsDays: '30',
          status: 'ACTIVE',
        }}
      />,
    );

    expect(screen.getByDisplayValue('Clinique Saint-Luc')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Burkina Faso')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ouagadougou')).toBeInTheDocument();
    expect(screen.getByText('Save changes')).toBeInTheDocument();
  });

  it('submits create form correctly', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new-client-id', name: 'Test' }),
    });

    const { ClientForm } = await import(
      '../app/dashboard/clients/_components/ClientForm'
    );
    render(<ClientForm mode="create" />);

    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Test Client' } });
    fireEvent.change(screen.getByLabelText('Country *'), { target: { value: 'BF' } });
    fireEvent.click(screen.getByText('Create client'));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/clients'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows error on submission failure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Validation failed' }),
    });

    const { ClientForm } = await import(
      '../app/dashboard/clients/_components/ClientForm'
    );
    render(<ClientForm mode="create" />);

    fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText('Country *'), { target: { value: 'BF' } });
    fireEvent.click(screen.getByText('Create client'));

    await screen.findByText('Validation failed');
  });
});
