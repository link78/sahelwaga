import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const push = vi.fn();
const params: { token?: string } = { token: 'abc-token' };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  useParams: () => params,
}));

function mockLocalStorage() {
  const store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((k: string) => store[k] ?? null),
      setItem: vi.fn((k: string, v: string) => {
        store[k] = v;
      }),
      removeItem: vi.fn((k: string) => {
        delete store[k];
      }),
    },
    writable: true,
  });
  return store;
}

describe('Accept invitation page', () => {
  beforeEach(() => {
    push.mockReset();
    params.token = 'abc-token';
    vi.restoreAllMocks();
  });

  it('shows a validation error when passwords do not match', async () => {
    mockLocalStorage();
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { default: Page } = await import('../app/accept-invitation/[token]/page');
    render(<Page />);

    fireEvent.change(screen.getByLabelText(/New password/i), {
      target: { value: 'longenoughpw' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: 'differentpw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Activate account/i }));

    await waitFor(() =>
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument(),
    );
    // No request fired when validation fails client-side.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces the server error when the API rejects the token', async () => {
    mockLocalStorage();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invitation has expired' }),
    }) as unknown as typeof fetch;

    const { default: Page } = await import('../app/accept-invitation/[token]/page');
    render(<Page />);

    fireEvent.change(screen.getByLabelText(/New password/i), {
      target: { value: 'longenoughpw' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: 'longenoughpw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Activate account/i }));

    await waitFor(() =>
      expect(screen.getByText(/Invitation has expired/i)).toBeInTheDocument(),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('persists the session and redirects supplier users to /portal/supplier', async () => {
    const store = mockLocalStorage();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        access: 'access-jwt',
        user: { id: 'u-1', name: 'A', email: 'a@b.test', role: 'SUPPLIER_PORTAL' },
      }),
    }) as unknown as typeof fetch;

    const { default: Page } = await import('../app/accept-invitation/[token]/page');
    render(<Page />);

    fireEvent.change(screen.getByLabelText(/New password/i), {
      target: { value: 'longenoughpw' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: 'longenoughpw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Activate account/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/portal/supplier'));

    // Token was POSTed to /auth/accept-invitation with credentials.
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/accept-invitation$/);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body)).toEqual({ token: 'abc-token', password: 'longenoughpw' });

    // Session was persisted to localStorage.
    expect(store['sahelwaga.access']).toBe('access-jwt');
    expect(JSON.parse(store['sahelwaga.user'])).toMatchObject({ role: 'SUPPLIER_PORTAL' });
  });

  it('redirects client portal users to /portal/client', async () => {
    mockLocalStorage();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        access: 'a',
        user: { id: 'u-2', name: 'B', email: 'b@c.test', role: 'CLIENT_PORTAL' },
      }),
    }) as unknown as typeof fetch;

    const { default: Page } = await import('../app/accept-invitation/[token]/page');
    render(<Page />);
    fireEvent.change(screen.getByLabelText(/New password/i), {
      target: { value: 'longenoughpw' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: 'longenoughpw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Activate account/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/portal/client'));
  });

  it('falls back to /dashboard for non-portal roles', async () => {
    mockLocalStorage();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        access: 'a',
        user: { id: 'u-3', name: 'C', email: 'c@d.test', role: 'ADMIN' },
      }),
    }) as unknown as typeof fetch;

    const { default: Page } = await import('../app/accept-invitation/[token]/page');
    render(<Page />);
    fireEvent.change(screen.getByLabelText(/New password/i), {
      target: { value: 'longenoughpw' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: 'longenoughpw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Activate account/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });
});
