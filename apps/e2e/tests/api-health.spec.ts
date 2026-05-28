import { expect, test } from '@playwright/test';

const apiBaseURL = process.env.E2E_API_URL ?? 'http://localhost:4000';

test.describe('API health & observability', () => {
  test('GET /health returns ok and propagates x-request-id', async ({ request }) => {
    const res = await request.get(`${apiBaseURL}/health`, {
      headers: { 'x-request-id': 'e2e-health-1' },
    });
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['x-request-id']).toBe('e2e-health-1');
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('GET /health/live reports uptime & version', async ({ request }) => {
    const res = await request.get(`${apiBaseURL}/health/live`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.uptime_seconds).toBe('number');
  });

  test('GET /health/ready confirms DB connectivity', async ({ request }) => {
    const res = await request.get(`${apiBaseURL}/health/ready`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ready');
  });

  test('GET /health/metrics emits Prometheus counters', async ({ request }) => {
    const res = await request.get(`${apiBaseURL}/health/metrics`);
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain('http_requests_total');
    expect(text).toContain('process_start_time_seconds');
  });
});
