/**
 * Chi Siamo Page E2E Tests
 * 
 * Tests for the about us page.
 */

import { test, expect } from '@playwright/test';
import { dismissCookieBanner } from './helpers';

test.describe('Chi Siamo Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chi-siamo');
    await dismissCookieBanner(page);
  });

  test('should display the page with title', async ({ page }) => {
    await expect(page).toHaveTitle(/chi siamo|leonardo|about/i);
    
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should have page content', async ({ page }) => {
    // Should have paragraphs of content
    const paragraphs = page.locator('p');
    expect(await paragraphs.count()).toBeGreaterThan(0);
  });

  test('should have mission/vision section', async ({ page }) => {
    // Look for mission, vision, or values content
    const content = await page.textContent('main, article, section');
    expect(content).toBeTruthy();
  });

  test('should have navigation to other pages', async ({ page }) => {
    // Should have links to other pages
    const links = page.locator('a[href]');
    expect(await links.count()).toBeGreaterThan(0);
  });
});

test.describe('Chi Siamo Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/chi-siamo');
    await dismissCookieBanner(page);
    
    // Should have h1 or h2
    const headings = page.locator('h1, h2');
    expect(await headings.count()).toBeGreaterThanOrEqual(1);
  });

  test('should have images with alt text', async ({ page }) => {
    await page.goto('/chi-siamo');
    await dismissCookieBanner(page);
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      // Should have alt attribute (can be empty for decorative)
      expect(alt !== null).toBe(true);
    }
  });
});

test.describe('Chi Siamo Mobile', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/chi-siamo');
    await dismissCookieBanner(page);
    
    // Content should be visible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    
    // No horizontal scroll
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 20); // Small tolerance
  });
});
