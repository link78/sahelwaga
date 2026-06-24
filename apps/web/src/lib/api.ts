// Public API base URL — used by client components (and therefore baked into
// the browser bundle). On the server prefer `getServerApiBaseUrl()` below,
// which honours `API_INTERNAL_URL` so SSR can reach the API over a
// private/internal address (e.g. `http://localhost:4000` or a Docker service
// name) even when the browser-facing URL is a public HTTPS hostname.
//
// Default port the API listens on (see `API_PORT` in `.env.example`). Used
// when deriving the API origin from the page host for external viewers.
const DEFAULT_API_PORT = 4000;

function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(url);
}

/**
 * Resolve the API base URL used by *browser* code. `NEXT_PUBLIC_API_URL` is
 * inlined into the client bundle at build time, so a value of
 * `http://localhost:4000` (the documented dev default) would make the browser
 * try to reach the API on the *viewer's own machine* when the site is opened
 * from an external host/IP (e.g. `http://66.94.119.88:3000`).
 *
 * To make external viewing work without hand-editing env vars, when the page
 * is served from a non-localhost host but the configured API URL is missing or
 * points at localhost, derive the API origin from the current page host. A
 * real external/HTTPS `NEXT_PUBLIC_API_URL` is always honoured as-is.
 */
function resolveBrowserApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;

  // Server / build time: no `window`. Honour the configured value or fall
  // back to the local dev API.
  if (typeof window === 'undefined') {
    return configured ?? 'http://localhost:4000';
  }

  const pageHost = window.location.hostname;
  const viewingLocally =
    pageHost === 'localhost' || pageHost === '127.0.0.1' || pageHost === '[::1]';
  const configPointsAtLocalhost = !configured || isLocalhostUrl(configured);

  // External viewer + localhost-only config → derive the API host from the
  // page so the browser can actually reach it.
  if (!viewingLocally && configPointsAtLocalhost) {
    return `${window.location.protocol}//${pageHost}:${DEFAULT_API_PORT}`;
  }

  return configured ?? `${window.location.protocol}//${pageHost}:${DEFAULT_API_PORT}`;
}

export const API_BASE_URL = resolveBrowserApiBaseUrl();

/**
 * Resolve the API base URL for *server-side* fetches (Server Components,
 * route handlers, server actions). Prefers `API_INTERNAL_URL` (private
 * address), then `NEXT_PUBLIC_API_URL` (public address, only safe when the
 * Node process can resolve and reach it), then localhost.
 *
 * Must only be called from server code — referencing `API_INTERNAL_URL`
 * from a client bundle is a no-op because Next.js does not expose
 * non-`NEXT_PUBLIC_*` env vars to the browser.
 */
export function getServerApiBaseUrl(): string {
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000'
  );
}

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
