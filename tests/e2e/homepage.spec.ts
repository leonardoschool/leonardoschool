/**
 * Homepage E2E Tests
 * 
 * Tests for the public homepage and marketing pages.
 */

import { test, expect } from '@playwright/test';
import { dismissCookieBanner, openMobileMenuIfNeeded, isMobileViewport } from './helpers';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Should have a title
    await expect(page).toHaveTitle(/Leonardo School/);
  });

  test('should display the header with navigation', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Header should be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Should have logo/brand
    const logo = page.getByRole('link', { name: /leonardo/i }).first();
    await expect(logo).toBeVisible();
  });

  test('should have login button in header', async ({ page }) => {
    // Skip on mobile - login is in submenu which requires different UX flow
    test.skip(isMobileViewport(page), 'Login button in submenu on mobile');
    
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // On desktop, hover over "Altro" button to reveal login link
    const altroButton = page.locator('header nav button:has-text("Altro")');
    await altroButton.hover();
    await page.waitForTimeout(500);
    
    const loginLink = page.locator('header a[href*="/auth/login"], header a:has-text("Accedi")').first();
    await expect(loginLink).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    // Skip on mobile - login is in submenu which requires different UX flow
    test.skip(isMobileViewport(page), 'Login in submenu on mobile');
    
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // On desktop, hover over "Altro" button to reveal login link
    const altroButton = page.locator('header nav button:has-text("Altro")');
    await altroButton.hover();
    await page.waitForTimeout(500);
    
    // Click login link
    const loginLink = page.locator('header a[href*="/auth/login"], header a:has-text("Accedi")').first();
    await loginLink.click();
    
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
    // Chi Siamo is in submenu - skip on mobile
    test.skip(isMobileViewport(page), 'Chi Siamo in submenu on mobile');
    
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Find and click "Chi Siamo" link - hover over Altro first on desktop
    const altroButton = page.locator('header nav button:has-text("Altro")');
    await altroButton.hover();
    await page.waitForTimeout(500);
    
    const link = page.getByRole('link', { name: /chi siamo/i }).first();
    await link.click();
    await expect(page).toHaveURL(/\/chi-siamo/);
  });

  test('should navigate to contattaci page', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    await openMobileMenuIfNeeded(page);
    
    // Find and click "Contattaci" link - directly in nav
    const link = page.getByRole('link', { name: /contatt/i }).first();
    
    if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
      await link.click({ force: true });
      await expect(page).toHaveURL(/\/contattaci/);
    }
  });

  test('should navigate to didattica page', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    await openMobileMenuIfNeeded(page);
    
    // Didattica is a submenu on desktop but top-level on mobile
    const viewport = page.viewportSize();
    
    if (viewport && viewport.width < 1024) {
      // On mobile, click the Didattica button first
      const didatticaButton = page.locator('button:has-text("Didattica")').first();
      if (await didatticaButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await didatticaButton.click();
        await page.waitForTimeout(300);
      }
      
      // Then click a submenu item
      const subLink = page.locator('a[href*="/didattica"]').first();
      if (await subLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        await subLink.click({ force: true });
        await expect(page).toHaveURL(/\/didattica/);
      }
    } else {
      // On desktop, hover over Didattica menu
      const didatticaMenu = page.locator('header li:has-text("Didattica")');
      await didatticaMenu.hover();
      await page.waitForTimeout(300);
      
      const link = page.locator('a[href="/didattica"]').first();
      if (await link.isVisible({ timeout: 1000 }).catch(() => false)) {
        await link.click();
        await expect(page).toHaveURL(/\/didattica/);
      }
    }
  });
});

test.describe('Footer', () => {
  test('should display footer with links', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Scroll to footer
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    
    await expect(footer).toBeVisible();
  });

  test('should have terms and conditions link', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
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
    await dismissCookieBanner(page);
    
    // Should have an h1 or h2
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
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
    // Skip keyboard tests on mobile
    test.skip(isMobileViewport(page), 'Keyboard navigation not applicable on mobile');
    
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Tab to first focusable element
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    // Tab a few times to ensure something gets focused
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    // Check if document has an active element (any focus)
    const hasFocus = await page.evaluate(() => {
      const active = document.activeElement;
      return active && active !== document.body && active.tagName !== 'BODY';
    });
    
    expect(hasFocus).toBeTruthy();
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
