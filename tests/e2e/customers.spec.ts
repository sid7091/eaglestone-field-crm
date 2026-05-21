import { test, expect } from '@playwright/test';

test('can navigate to new customer page and check form', async ({ page }) => {
  await page.goto('/customers');
  
  // Click Add Customer button
  await page.click('text=Add Customer');
  await expect(page).toHaveURL(/.*customers\/new/);
  
  // Check that the form elements render
  await expect(page.locator('text=Customer Information')).toBeVisible();
  await expect(page.locator('input[placeholder="e.g. Sharma Marble Works"]')).toBeVisible();
});
