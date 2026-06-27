import { NextRequest } from 'next/server';
import { getServerApiBaseUrl } from '../../../lib/api';

// Same-origin proxy for the public, unauthenticated API surface
// (`/public/products`, `/public/leads`). The browser calls these on the web
// origin so the marketing site works on a single domain without CORS, without
// a separate API hostname, and without baking `NEXT_PUBLIC_API_URL` into the
// client bundle at build time. The upstream API address is resolved per
// request from the server-only `API_INTERNAL_URL` (falling back to
// `NEXT_PUBLIC_API_URL`), so changing it only requires a restart — not a
// rebuild.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Only the genuinely public, unauthenticated endpoints may be proxied. This
// allowlist also prevents path-traversal segments (e.g. `..`) from escaping
// the `/public/` prefix and reaching authenticated API routes once the URL is
// normalised by the upstream fetch.
const ALLOWED_TOP_LEVEL = new Set(['products', 'leads']);

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }): Promise<Response> {
  const segments = params.path ?? [];
  const top = segments[0];
  if (!top || !ALLOWED_TOP_LEVEL.has(top)) {
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
  // Reject any traversal/separator segments defensively.
  if (segments.some((s) => s === '.' || s === '..' || s.includes('/') || s.includes('\\'))) {
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  const base = getServerApiBaseUrl().replace(/\/+$/, '');
  const path = segments.map((s) => encodeURIComponent(s)).join('/');
  const target = `${base}/public/${path}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const accept = req.headers.get('accept');
  if (accept) headers.set('accept', accept);

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: 'no-store',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[public-proxy] ${req.method} ${target} failed`, err);
    return new Response(JSON.stringify({ error: 'Bad Gateway' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await upstream.arrayBuffer();
  const resHeaders = new Headers();
  const upstreamContentType = upstream.headers.get('content-type');
  if (upstreamContentType) resHeaders.set('content-type', upstreamContentType);
  return new Response(body, { status: upstream.status, headers: resHeaders });
}

export { proxy as GET, proxy as POST };
