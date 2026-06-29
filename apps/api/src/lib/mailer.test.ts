import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock must reference variables prefixed with `mock` per vitest hoisting rules.
const mockSendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}));

// Provide minimum env so the config module loads without exiting.
process.env.DATABASE_URL ||= '******localhost:5432/test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-min-16-chars';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-min-16-chars';

describe('mailer', () => {
  beforeEach(() => {
    mockSendMail.mockReset();
    mockSendMail.mockResolvedValue({ messageId: 'test' });
  });

  afterEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
    delete process.env.SMTP_SECURE;
    vi.resetModules();
  });

  it('is a no-op when SMTP_HOST is unset', async () => {
    const { sendMail, _resetMailerForTests } = await import('./mailer.js');
    _resetMailerForTests();
    const ok = await sendMail({ to: 'a@b.com', subject: 's', text: 't' });
    expect(ok).toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('sends mail when SMTP is configured', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'u';
    process.env.SMTP_PASS = 'p';
    process.env.SMTP_FROM = 'MedSupply <no-reply@example.com>';
    vi.resetModules();
    const { sendMail, _resetMailerForTests } = await import('./mailer.js');
    _resetMailerForTests();
    const ok = await sendMail({
      to: 'sales@example.com',
      subject: 'New lead',
      text: 'hello',
      replyTo: 'lead@example.com',
    });
    expect(ok).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'MedSupply <no-reply@example.com>',
      to: 'sales@example.com',
      subject: 'New lead',
      text: 'hello',
      html: undefined,
      replyTo: 'lead@example.com',
    });
  });

  it('returns false (does not throw) when the transport errors', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_FROM = 'no-reply@example.com';
    vi.resetModules();
    mockSendMail.mockRejectedValueOnce(new Error('connection refused'));
    const { sendMail, _resetMailerForTests } = await import('./mailer.js');
    _resetMailerForTests();
    const ok = await sendMail({ to: 'a@b.com', subject: 's', text: 't' });
    expect(ok).toBe(false);
  });

  it('returns false when no from is configured', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    vi.resetModules();
    const { sendMail, _resetMailerForTests } = await import('./mailer.js');
    _resetMailerForTests();
    const ok = await sendMail({ to: 'a@b.com', subject: 's', text: 't' });
    expect(ok).toBe(false);
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
