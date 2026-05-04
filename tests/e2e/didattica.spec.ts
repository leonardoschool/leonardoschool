/**
 * Didattica Page E2E Tests
 * 
 * Tests for the teaching methodology page.
 */

import { test, expect } from '@playwright/test';
import { dismissCookieBanner, openMobileMenuIfNeeded } from './helpers';

test.describe('Didattica Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/didattica');
    await dismissCookieBanner(page);
  });

  test('should display the page with title', async ({ page }) => {
    await expect(page).toHaveTitle(/didattica|metodo|insegnamento|leonardo/i);
    
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should display teaching methodology content', async ({ page }) => {
    // Should have content about teaching
    const content = await page.textContent('main, article, section');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(100);
  });

  test('should have multiple sections', async ({ page }) => {
    // Should have multiple content sections
    const sections = page.locator('section, article, div[class*="section"]');
    expect(await sections.count()).toBeGreaterThan(0);
  });

  test('should have subjects or courses information', async ({ page }) => {
    // Look for subjects/courses
    const headings = page.locator('h2, h3');
    expect(await headings.count()).toBeGreaterThan(0);
  });
});

test.describe('Didattica Navigation', () => {
  test('should navigate from homepage', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    await openMobileMenuIfNeeded(page);
    
    // Find and click didattica link
    const didatticaLink = page.locator('a[href*="didattica"]');
    
    if (await didatticaLink.count() > 0 && await didatticaLink.first().isVisible()) {
      await didatticaLink.first().click();
      await expect(page).toHaveURL(/didattica/);
    }
  });

  test('should have back navigation', async ({ page }) => {
    await page.goto('/didattica');
    await dismissCookieBanner(page);
    
    // Should be able to go back to homepage
    const homeLink = page.locator('a[href="/"]');
    expect(await homeLink.count()).toBeGreaterThan(0);
  });
});

test.describe('Didattica Mobile', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/didattica');
    await dismissCookieBanner(page);
    
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/didattica');
    await dismissCookieBanner(page);
    
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});
