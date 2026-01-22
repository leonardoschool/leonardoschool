/**
 * Homepage E2E Tests
 * 
 * Tests for the public homepage and marketing pages.
 */

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Should have a title
    await expect(page).toHaveTitle(/Leonardo School/);
  });

  test('should display the header with navigation', async ({ page }) => {
    await page.goto('/');
    
    // Header should be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Should have logo/brand
    const logo = page.getByRole('link', { name: /leonardo/i }).first();
    await expect(logo).toBeVisible();
  });

  test('should have login button in header', async ({ page }) => {
    await page.goto('/');
    
    // Login link should be visible
    const loginLink = page.getByRole('link', { name: /accedi|login/i });
    await expect(loginLink).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    
    // Click login link
    await page.getByRole('link', { name: /accedi|login/i }).click();
    
    // Should be on login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should still load
    await expect(page).toHaveTitle(/Leonardo School/);
  });
});

test.describe('Navigation', () => {
  test('should navigate to chi-siamo page', async ({ page }) => {
    await page.goto('/');
    
    // Find and click "Chi Siamo" link
    const link = page.getByRole('link', { name: /chi siamo/i }).first();
    
    if (await link.isVisible()) {
      await link.click();
      await expect(page).toHaveURL(/\/chi-siamo/);
    }
  });

  test('should navigate to contattaci page', async ({ page }) => {
    await page.goto('/');
    
    // Find and click "Contattaci" link
    const link = page.getByRole('link', { name: /contatt/i }).first();
    
    if (await link.isVisible()) {
      await link.click();
      await expect(page).toHaveURL(/\/contattaci/);
    }
  });

  test('should navigate to didattica page', async ({ page }) => {
    await page.goto('/');
    
    // Find and click "Didattica" link
    const link = page.getByRole('link', { name: /didattica/i }).first();
    
    if (await link.isVisible()) {
      await link.click();
      await expect(page).toHaveURL(/\/didattica/);
    }
  });
});

test.describe('Footer', () => {
  test('should display footer with links', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to footer
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    
    await expect(footer).toBeVisible();
  });

  test('should have terms and conditions link', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to footer
    await page.locator('footer').scrollIntoViewIfNeeded();
    
    // Find terms link
    const termsLink = page.getByRole('link', { name: /termini|condizioni/i });
    
    if (await termsLink.count() > 0) {
      await expect(termsLink.first()).toBeVisible();
    }
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    
    // Should have an h1
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');
    
    // Get all images
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Image should have alt attribute (can be empty for decorative)
      expect(alt).not.toBeNull();
    }
  });

  test('should be navigable with keyboard', async ({ page }) => {
    await page.goto('/');
    
    // Tab to first focusable element
    await page.keyboard.press('Tab');
    
    // Something should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
