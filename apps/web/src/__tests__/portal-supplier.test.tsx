import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const replace = vi.fn();
const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back: vi.fn() }),
  usePathname: () => '/portal/supplier',
  useParams: () => ({ id: 'test-id' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

function setUser(role: string) {
  const store: Record<string, string> = {
    'sahelwaga.user': JSON.stringify({ id: '1', name: 'Mumbai Portal', email: 'x@y', role }),
    'sahelwaga.access': 'fake-token',
  };
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((k: string) => store[k] ?? null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    writable: true,
  });
}

describe('Supplier portal home', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replace.mockReset();
    push.mockReset();
  });

  it('renders supplier KPIs returned by /portal/me', async () => {
    setUser('SUPPLIER_PORTAL');
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scope: 'supplier',
        supplier: {
          id: 's1',
          name: 'Mumbai Pharma Ltd',
          country: 'India',
          status: 'APPROVED',
          whoGmpStatus: 'VERIFIED',
          rating: 'A',
          vetting: { whoGmpVerified: true, coaReceived: true, stabilityHotClimate: false, westAfricaReferences: false },
          contacts: [],
        },
        kpis: { openPurchaseOrders: 2, totalPurchaseOrders: 5, documents: 4 },
      }),
    });

    const { default: SupplierPortalHome } = await import('../app/portal/supplier/page');
    render(<SupplierPortalHome />);

    await waitFor(() => expect(screen.getByText('Mumbai Pharma Ltd')).toBeInTheDocument());
    expect(screen.getByText('Open Purchase Orders')).toBeInTheDocument();
    // The KPI value renders next to its label
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('WHO-GMP verified')).toBeInTheDocument();
  });
});

describe('Portal layout role gating', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replace.mockReset();
    push.mockReset();
  });

  it('redirects internal roles to /dashboard', async () => {
    setUser('ADMIN');
    const { default: PortalLayout } = await import('../app/portal/layout');
    render(<PortalLayout>child</PortalLayout>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('redirects supplier users away from /portal/client', async () => {
    setUser('SUPPLIER_PORTAL');
    vi.doMock('next/navigation', () => ({
      useRouter: () => ({ push, replace, back: vi.fn() }),
      usePathname: () => '/portal/client/sales-orders',
      useParams: () => ({}),
    }));
    // re-import with new pathname mock
    vi.resetModules();
    const { default: PortalLayout } = await import('../app/portal/layout');
    render(<PortalLayout>child</PortalLayout>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portal/supplier'));
  });
});
