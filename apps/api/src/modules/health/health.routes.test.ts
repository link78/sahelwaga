import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Required env for config validation. Must be set before the app module
// graph is loaded.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/test';
process.env.JWT_ACCESS_SECRET ??= 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET ??= 'y'.repeat(32);

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

const { createApp } = await import('../../app.js');
const app = createApp();

describe('health endpoints', () => {
  it('GET /health returns ok + echoes request id', async () => {
    const res = await request(app).get('/health').set('x-request-id', 'rid-abc');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.headers['x-request-id']).toBe('rid-abc');
  });

  it('GET /health/live reports uptime + version', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime_seconds).toBe('number');
    expect(res.body.version).toBeDefined();
  });

  it('GET /health/ready confirms db connectivity', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.db).toBe('ok');
  });

  it('GET /health/metrics returns Prometheus text', async () => {
    const res = await request(app).get('/health/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('process_start_time_seconds');
  });

  it('GET /health auto-generates a request id when none supplied', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toMatch(/[0-9a-f-]{8,}/);
  });
});
