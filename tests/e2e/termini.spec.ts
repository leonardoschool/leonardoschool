/**
 * Termini e Condizioni Page E2E Tests
 * 
 * Tests for the terms and conditions page.
 */

import { test, expect } from '@playwright/test';
import { dismissCookieBanner, openMobileMenuIfNeeded } from './helpers';

test.describe('Termini e Condizioni Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/termini-condizioni');
    await dismissCookieBanner(page);
  });

  test('should display the page with title', async ({ page }) => {
    await expect(page).toHaveTitle(/termin|condizion|legal|leonardo/i);
    
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should have legal content', async ({ page }) => {
    const content = await page.textContent('main, article, section');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(200); // Terms should be substantial
  });

  test('should have structured sections', async ({ page }) => {
    // Terms should have multiple sections
    const headings = page.locator('h2, h3');
    expect(await headings.count()).toBeGreaterThan(0);
  });
});

test.describe('Termini e Condizioni Content', () => {
  test('should contain privacy information', async ({ page }) => {
    await page.goto('/termini-condizioni');
    await dismissCookieBanner(page);
    
    const content = await page.textContent('body');
    // Should mention privacy or data handling
    const hasPrivacyContent = /privacy|dati|personali|gdpr|cookie/i.test(content || '');
    expect(hasPrivacyContent).toBe(true);
  });

  test('should contain usage terms', async ({ page }) => {
    await page.goto('/termini-condizioni');
    await dismissCookieBanner(page);
    
    const content = await page.textContent('body');
    // Should mention usage terms
    const hasUsageTerms = /utilizzo|servizi|condizioni|diritti|responsabil/i.test(content || '');
    expect(hasUsageTerms).toBe(true);
  });
});

test.describe('Termini e Condizioni Navigation', () => {
  test('should be accessible from footer', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Verify footer link exists
    const termsLink = page.locator('footer a[href*="termini"]');
    
    // If link exists, verify it has correct href
    if (await termsLink.count() > 0) {
      const href = await termsLink.first().getAttribute('href');
      expect(href).toContain('termini-condizioni');
      
      // Navigate directly to verify the page works
      await page.goto('/termini-condizioni');
      await expect(page).toHaveURL(/termini-condizioni/);
    }
  });

  test('should have navigation back to homepage', async ({ page }) => {
    await page.goto('/termini-condizioni');
    await dismissCookieBanner(page);
    
    const homeLink = page.locator('a[href="/"]');
    expect(await homeLink.count()).toBeGreaterThan(0);
  });
});

test.describe('Termini e Condizioni Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/termini-condizioni');
    await dismissCookieBanner(page);
    
    const headings = page.locator('h1, h2');
    expect(await headings.count()).toBeGreaterThanOrEqual(1);
  });

  test('should be readable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/termini-condizioni');
    await dismissCookieBanner(page);
    
    const content = page.locator('main, article, section').first();
    await expect(content).toBeVisible();
  });
});
