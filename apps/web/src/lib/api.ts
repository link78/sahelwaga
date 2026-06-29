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

function isIpLikeHost(hostname: string): boolean {
  // IPv4 (e.g. 66.94.119.88) or IPv6 (contains ':'). Subdomain derivation does
  // not make sense for bare IPs, so callers keep the page origin instead.
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':');
}

/**
 * Derive the conventional API hostname for a given page host. The deployment
 * serves the API from an `api.` subdomain behind nginx (e.g. the web app on
 * `app.example.com`/`example.com` and the API on `api.example.com`), so:
 *   - `example.com`      → `api.example.com`
 *   - `app.example.com`  → `api.example.com`  (replace the `app`/`www` label)
 *   - `www.example.com`  → `api.example.com`
 *   - `api.example.com`  → `api.example.com`  (already the API host)
 */
function deriveApiHost(hostname: string): string {
  const labels = hostname.split('.');
  if (labels[0] === 'api') return hostname;
  if (labels[0] === 'www' || labels[0] === 'app') {
    return ['api', ...labels.slice(1)].join('.');
  }
  return `api.${hostname}`;
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
 *
 * Crucially, when the page is served over HTTPS we never derive
 * `https://host:4000`: the API on the conventional port serves plain HTTP, so
 * a TLS handshake there fails with `ERR_SSL_PROTOCOL_ERROR`. Instead we derive
 * the `api.` subdomain (e.g. `https://api.example.com`), matching the
 * reverse-proxy convention this app deploys with, and warn.
 *
 * The resolution logic is separated from `window` so it can be unit tested.
 * `location` is the (sub)set of `window.location` we need; pass `null` to
 * model server/build time where there is no `window`.
 */
export function deriveBrowserApiBaseUrl(
  configured: string | undefined,
  location: { protocol: string; hostname: string; origin: string } | null,
): string {
  // Server / build time: no `window`. Honour the configured value or fall
  // back to the local dev API.
  if (!location) {
    return configured ?? 'http://localhost:4000';
  }

  const { protocol, hostname, origin } = location;
  const viewingLocally =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  const configPointsAtLocalhost = !configured || isLocalhostUrl(configured);

  // A real external/HTTPS configured URL is always honoured as-is.
  if (configured && !configPointsAtLocalhost) {
    return configured;
  }

  // Viewing from localhost → the documented dev default (or honour config).
  if (viewingLocally) {
    return configured ?? `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
  }

  // External viewer with no usable config: derive the API origin from the
  // page host so the browser can actually reach it.
  if (protocol === 'https:') {
    // Never derive `https://host:${DEFAULT_API_PORT}` — the API on the
    // conventional 4000 port serves plain HTTP, so a TLS handshake there
    // fails with `ERR_SSL_PROTOCOL_ERROR`. When the page is HTTPS, the API is
    // exposed over HTTPS on the `api.` subdomain (the reverse-proxy convention
    // this app deploys with). Returning the bare page origin instead would
    // POST `/auth/login` to the web app and 404, so derive `api.<domain>`.
    // Bare IPs can't be turned into a subdomain, so keep the page origin then.
    const apiBase = isIpLikeHost(hostname)
      ? origin
      : `https://${deriveApiHost(hostname)}`;
    if (typeof console !== 'undefined') {
      console.warn(
        '[api] NEXT_PUBLIC_API_URL is unset or points at localhost while the ' +
          `page is served over HTTPS. Falling back to ${apiBase}; set ` +
          'NEXT_PUBLIC_API_URL to your API URL (e.g. https://api.example.com) ' +
          'and rebuild the web app to be explicit.',
      );
    }
    return apiBase;
  }

  // Plain-HTTP external viewer (e.g. http://66.94.119.88:3000): derive the
  // API host on the conventional port; plain HTTP there works fine.
  return `${protocol}//${hostname}:${DEFAULT_API_PORT}`;
}

function resolveBrowserApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  const location =
    typeof window === 'undefined'
      ? null
      : {
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          origin: window.location.origin,
        };
  return deriveBrowserApiBaseUrl(configured, location);
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
