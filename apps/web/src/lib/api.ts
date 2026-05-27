// Public API base URL — falls back to local dev API. Used by both server and
// client components, so we read NEXT_PUBLIC_API_URL.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4000` : 'http://localhost:4000');
