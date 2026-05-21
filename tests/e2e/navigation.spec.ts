import { test, expect } from '@playwright/test';

test('has title and can navigate to customers', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Eagle/i);

  // Click on the Customers link in the sidebar
  await page.click('text=Customers');
  
  // Wait for the URL to change
  await expect(page).toHaveURL(/.*customers/);
  await expect(page.locator('h1', { hasText: 'Customers' })).toBeVisible();
});
