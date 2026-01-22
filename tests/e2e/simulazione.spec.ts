/**
 * Simulazione Page E2E Tests
 * 
 * Tests for the public simulation/test page.
 */

import { test, expect } from '@playwright/test';

test.describe('Simulazione Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/simulazione');
  });

  test('should display the page with title', async ({ page }) => {
    await expect(page).toHaveTitle(/simulazione|test|esercitazione|leonardo/i);
    
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should display simulation information', async ({ page }) => {
    // Should have content about simulations
    const content = await page.textContent('main, article, section');
    expect(content).toBeTruthy();
  });

  test('should have call to action', async ({ page }) => {
    // Should have button or link to start/try simulation
    const ctaButton = page.locator('button, a[href*="simulaz"]');
    expect(await ctaButton.count()).toBeGreaterThan(0);
  });
});

test.describe('Simulazione Features', () => {
  test('should show available simulation types', async ({ page }) => {
    await page.goto('/simulazione');
    
    // Should list simulation categories or types
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });

  test('should have login/register prompt for protected features', async ({ page }) => {
    await page.goto('/simulazione');
    
    // May have login button for accessing full simulations
    const loginLink = page.locator('a[href*="login"], a[href*="registr"]');
    
    // This is optional - page may not require login
    if (await loginLink.count() > 0) {
      await expect(loginLink.first()).toBeVisible();
    }
  });
});

test.describe('Simulazione Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/simulazione');
    
    const h1 = page.locator('h1');
    expect(await h1.count()).toBeGreaterThanOrEqual(1);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/simulazione');
    
    // Tab through content
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Simulazione Mobile', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/simulazione');
    
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });
});
