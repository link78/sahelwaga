import { expect, test } from '@playwright/test';

test.describe('marketing site', () => {
  test('redirects root to a locale prefix', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.ok()).toBeTruthy();
    expect(page.url()).toMatch(/\/(en|fr)\/?$/);
  });

  test('renders English home page', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Sahel/i);
    await expect(page.getByRole('link', { name: /catalog/i })).toBeVisible();
  });

  test('renders French home page', async ({ page }) => {
    await page.goto('/fr');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // French CTA uses "catalogue".
    await expect(page.getByRole('link', { name: /catalogue/i })).toBeVisible();
  });

  test('catalog page loads products section', async ({ page }) => {
    await page.goto('/en/products');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('contact page renders the lead form', async ({ page }) => {
    await page.goto('/en/contact');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Form has a submit button.
    await expect(page.getByRole('button', { name: /send|submit|envoyer/i })).toBeVisible();
  });
});
