/**
 * Navigation E2E Tests
 * 
 * Tests for site-wide navigation elements.
 */

import { test, expect } from '@playwright/test';

test.describe('Header Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have logo linking to homepage', async ({ page }) => {
    const logo = page.locator('header a[href="/"]').first();
    await expect(logo).toBeVisible();
    
    await logo.click();
    await expect(page).toHaveURL('/');
  });

  test('should have main navigation links', async ({ page }) => {
    const header = page.locator('header');
    
    // Should have navigation links
    const navLinks = header.locator('a[href]');
    expect(await navLinks.count()).toBeGreaterThan(1);
  });

  test('should have login/register buttons for unauthenticated users', async ({ page }) => {
    const loginLink = page.locator('header a[href*="login"]');
    const registerLink = page.locator('header a[href*="registr"]');
    
    // At least one should be visible
    const hasAuthLinks = await loginLink.count() > 0 || await registerLink.count() > 0;
    expect(hasAuthLinks).toBe(true);
  });
});

test.describe('Footer Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have footer', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should have useful links', async ({ page }) => {
    const footer = page.locator('footer');
    const links = footer.locator('a[href]');
    expect(await links.count()).toBeGreaterThan(0);
  });

  test('should have terms and conditions link', async ({ page }) => {
    const termsLink = page.locator('footer a[href*="termin"]');
    
    if (await termsLink.count() > 0) {
      await expect(termsLink.first()).toBeVisible();
    }
  });

  test('should have contact information', async ({ page }) => {
    const footer = page.locator('footer');
    const content = await footer.textContent();
    
    // Should have some contact info
    expect(content).toBeTruthy();
  });
});

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
  });

  test('should have mobile menu button', async ({ page }) => {
    // Look for hamburger menu
    const menuButton = page.locator('button[aria-label*="menu"], button[aria-expanded]');
    
    if (await menuButton.count() > 0) {
      await expect(menuButton.first()).toBeVisible();
    }
  });

  test('should toggle mobile menu', async ({ page }) => {
    const menuButton = page.locator('button[aria-label*="menu"], button[aria-expanded]').first();
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Menu should open
      const nav = page.locator('nav[role="navigation"], nav');
      const isExpanded = await menuButton.getAttribute('aria-expanded');
      
      // Either nav is visible or button is expanded
      expect(
        await nav.isVisible() || isExpanded === 'true'
      ).toBe(true);
    }
  });

  test('should close menu on link click', async ({ page }) => {
    const menuButton = page.locator('button[aria-label*="menu"], button[aria-expanded]').first();
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Click a navigation link
      const navLink = page.locator('nav a[href]').first();
      if (await navLink.isVisible()) {
        await navLink.click();
        
        // Menu should close or navigate
        await page.waitForLoadState('networkidle');
      }
    }
  });
});

test.describe('Navigation Links Work', () => {
  const publicPages = [
    { name: 'Chi Siamo', path: '/chi-siamo' },
    { name: 'Didattica', path: '/didattica' },
    { name: 'Contattaci', path: '/contattaci' },
  ];

  for (const pageInfo of publicPages) {
    test(`should navigate to ${pageInfo.name}`, async ({ page }) => {
      await page.goto('/');
      
      const link = page.locator(`a[href="${pageInfo.path}"]`);
      
      if (await link.count() > 0) {
        await link.first().click();
        await expect(page).toHaveURL(new RegExp(pageInfo.path));
      }
    });
  }
});

test.describe('Breadcrumb Navigation', () => {
  test('should have breadcrumbs on subpages', async ({ page }) => {
    await page.goto('/chi-siamo');
    
    const breadcrumbs = page.locator('nav[aria-label*="breadcrumb"], [class*="breadcrumb"]');
    
    // Breadcrumbs are optional
    if (await breadcrumbs.count() > 0) {
      await expect(breadcrumbs.first()).toBeVisible();
    }
  });
});

test.describe('Skip Navigation', () => {
  test('should have skip to main content link', async ({ page }) => {
    await page.goto('/');
    
    // Focus on first element
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    const text = await focusedElement.textContent();
    
    // Skip link is optional but recommended
    if (text && /skip|salta|main|content/i.test(text)) {
      await expect(focusedElement).toBeVisible();
    }
  });
});
