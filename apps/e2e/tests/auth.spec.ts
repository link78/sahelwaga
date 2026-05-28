import { expect, test } from '@playwright/test';

test.describe('admin login flow', () => {
  test('signs in with seeded admin credentials and lands on the dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible();

    // The form pre-populates with the demo admin email; just fill in the
    // password and submit.
    const email = page.getByLabel(/email/i);
    await email.fill('admin@sahelpharma.local');
    await page.getByLabel(/password/i).fill('admin123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
