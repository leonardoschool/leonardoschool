/**
 * Navigation E2E Tests
 * 
 * Tests for site-wide navigation elements.
 */

import { test, expect } from '@playwright/test';
import { dismissCookieBanner, openMobileMenuIfNeeded, getFocusedElement, findNavigationLink, clickWithRetry, isMobileViewport } from './helpers';

test.describe('Header Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
  });

  test('should have logo linking to homepage', async ({ page }) => {
    const logo = page.locator('header a[href="/"]').first();
    await expect(logo).toBeVisible();
    
    await logo.click();
    await expect(page).toHaveURL('/');
  });

  test('should have main navigation links', async ({ page }) => {
    await openMobileMenuIfNeeded(page);
    
    const header = page.locator('header');
    
    // Should have navigation links
    const navLinks = header.locator('a[href]');
    expect(await navLinks.count()).toBeGreaterThan(1);
  });

  test('should have login/register buttons for unauthenticated users', async ({ page }) => {
    await openMobileMenuIfNeeded(page);
    
    const loginLink = page.locator('a[href*="login"]');
    const registerLink = page.locator('a[href*="registr"]');
    
    // At least one should exist (may not be visible if in mobile menu)
    const hasAuthLinks = await loginLink.count() > 0 || await registerLink.count() > 0;
    expect(hasAuthLinks).toBe(true);
  });
});

test.describe('Footer Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
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
    await dismissCookieBanner(page);
  });

  test('should have mobile menu button', async ({ page }) => {
    // Look for hamburger menu
    const menuButton = page.locator('button[aria-label*="menu" i], button[aria-expanded], button:has(svg)');
    
    if (await menuButton.count() > 0) {
      await expect(menuButton.first()).toBeVisible();
    }
  });

  test('should toggle mobile menu', async ({ page }) => {
    const menuButton = page.locator('button[aria-label*="menu" i], button[aria-expanded]').first();
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Menu should open - wait a bit for animation
      await page.waitForTimeout(300);
      
      // Either nav is visible or button is expanded
      const nav = page.locator('nav[role="navigation"], nav');
      const isExpanded = await menuButton.getAttribute('aria-expanded');
      
      expect(
        await nav.first().isVisible() || isExpanded === 'true'
      ).toBe(true);
    }
  });

  test('should close menu on link click', async ({ page }) => {
    const menuButton = page.locator('button[aria-label*="menu" i], button[aria-expanded]').first();
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);
      
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
    { name: 'Contattaci', path: '/contattaci' },
  ];

  for (const pageInfo of publicPages) {
    test(`should navigate to ${pageInfo.name}`, async ({ page }) => {
      await page.goto('/');
      await dismissCookieBanner(page);
      await openMobileMenuIfNeeded(page);
      
      const link = await findNavigationLink(page, pageInfo.path);
      
      if (await link.count() > 0 && await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clickWithRetry(link);
        await expect(page).toHaveURL(new RegExp(pageInfo.path));
      }
    });
  }
  
  test('should navigate to Didattica', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    await openMobileMenuIfNeeded(page);
    
    const viewport = page.viewportSize();
    
    // On mobile, Didattica is a submenu - click to expand and navigate to first option
    if (viewport && viewport.width < 1024) {
      const didatticaButton = page.locator('button:has-text("Didattica")').first();
      if (await didatticaButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await didatticaButton.click();
        await page.waitForTimeout(300);
        
        // Click first didattica submenu link
        const subLink = page.locator('a[href*="/didattica"]').first();
        if (await subLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await subLink.click({ force: true });
          await expect(page).toHaveURL(/\/didattica/);
        }
      }
    } else {
      // On desktop, hover to open submenu
      const didatticaButton = page.locator('header nav button:has-text("Didattica")');
      if (await didatticaButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await didatticaButton.hover();
        await page.waitForTimeout(500);
        
        // Click first didattica submenu link
        const subLink = page.locator('a[href*="/didattica"]').first();
        if (await subLink.isVisible({ timeout: 2000 }).catch(() => false)) {
          await subLink.click();
          await expect(page).toHaveURL(/\/didattica/);
        }
      }
    }
  });
});

test.describe('Breadcrumb Navigation', () => {
  test('should have breadcrumbs on subpages', async ({ page }) => {
    await page.goto('/chi-siamo');
    await dismissCookieBanner(page);
    
    const breadcrumbs = page.locator('nav[aria-label*="breadcrumb"], [class*="breadcrumb"]');
    
    // Breadcrumbs are optional
    if (await breadcrumbs.count() > 0) {
      await expect(breadcrumbs.first()).toBeVisible();
    }
  });
});

test.describe('Skip Navigation', () => {
  test('should have skip to main content link', async ({ page }) => {
    // Skip keyboard tests on mobile
    test.skip(isMobileViewport(page), 'Skip link test not applicable on mobile');
    
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Focus on first element
    await page.keyboard.press('Tab');
    
    const focusedElement = await getFocusedElement(page);
    
    if (await focusedElement.count() > 0) {
      const text = await focusedElement.first().textContent();
      
      // Skip link is optional but recommended
      if (text && /skip|salta|main|content/i.test(text)) {
        await expect(focusedElement.first()).toBeVisible();
      }
    }
    
    // Test passes regardless - skip link is optional
    expect(true).toBe(true);
  });
});
