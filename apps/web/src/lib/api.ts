// Public API base URL — falls back to local dev API. Used by both server and
// client components, so we read NEXT_PUBLIC_API_URL.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');

const ACCESS_KEY = 'sahelwaga.access';
const USER_KEY = 'sahelwaga.user';

/**
 * Browser-side session helpers.
 *
 * Tokens are issued by the API both as JSON (legacy) and as `HttpOnly` cookies.
 * The web client now stores only the (short-lived, 15m) access token in
 * localStorage for backwards compatibility with the many existing `fetch`
 * callsites that read it, and lets the browser carry the refresh token in the
 * `HttpOnly` `sahel_refresh` cookie that no JavaScript can ever read.
 *
 * The non-sensitive user profile is kept in localStorage so the UI can gate
 * navigation without a server round-trip.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  locale?: string;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as SessionUser; } catch { return null; }
}

export function persistSession(data: { access: string; user: SessionUser }): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_KEY, data.access);
  window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  // Remove the legacy refresh token entry — refresh tokens now live in an
  // HttpOnly cookie set by the API.
  window.localStorage.removeItem('sahelwaga.refresh');
}

/**
 * Clear local session state AND tell the API to revoke the refresh token /
 * clear auth cookies. Network errors are swallowed because the user is
 * signing out either way.
 */
export async function signOut(): Promise<void> {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem('sahelwaga.refresh');
    window.localStorage.removeItem(USER_KEY);
  }
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
  } catch {
    /* network errors are non-fatal on logout */
  }
}
