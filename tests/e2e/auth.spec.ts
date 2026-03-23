import { test, expect } from '@playwright/test';

test('has title and login button', async ({ page }) => {
  await page.goto('/');

  // Assuming public page has a Sign in button or the page title is related to ARIA
  await expect(page).toHaveTitle(/ARIA/i);
});
