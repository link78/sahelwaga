import { describe, it, expect, vi, afterEach } from 'vitest';
import { deriveBrowserApiBaseUrl } from '../lib/api';

const loc = (protocol: string, hostname: string, port = '') => ({
  protocol,
  hostname,
  origin: `${protocol}//${hostname}${port ? `:${port}` : ''}`,
});

describe('deriveBrowserApiBaseUrl', () => {
  afterEach(() => vi.restoreAllMocks());

  it('falls back to local dev API on the server (no window)', () => {
    expect(deriveBrowserApiBaseUrl(undefined, null)).toBe('http://localhost:4000');
  });

  it('honours a configured value on the server', () => {
    expect(deriveBrowserApiBaseUrl('https://api.example.com', null)).toBe(
      'https://api.example.com',
    );
  });

  it('honours a real external/HTTPS configured URL as-is', () => {
    expect(
      deriveBrowserApiBaseUrl(
        'https://api.example.com',
        loc('https:', 'app.example.com'),
      ),
    ).toBe('https://api.example.com');
  });

  it('uses the dev default when viewing locally with no config', () => {
    expect(deriveBrowserApiBaseUrl(undefined, loc('http:', 'localhost'))).toBe(
      'http://localhost:4000',
    );
  });

  it('derives http://host:4000 for a plain-HTTP external viewer', () => {
    expect(
      deriveBrowserApiBaseUrl('http://localhost:4000', loc('http:', '66.94.119.88')),
    ).toBe('http://66.94.119.88:4000');
  });

  it('never derives https://host:4000 — falls back to the page origin', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = deriveBrowserApiBaseUrl(
      'http://localhost:4000',
      loc('https:', 'medsupplyimportdistribution.com'),
    );
    expect(result).toBe('https://medsupplyimportdistribution.com');
    expect(result).not.toContain(':4000');
    expect(warn).toHaveBeenCalledOnce();
  });

  it('warns and uses the origin when config is missing on an HTTPS page', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      deriveBrowserApiBaseUrl(undefined, loc('https:', 'app.example.com')),
    ).toBe('https://app.example.com');
    expect(warn).toHaveBeenCalledOnce();
  });
});
