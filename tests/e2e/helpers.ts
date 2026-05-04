/**
 * E2E Test Helpers
 * 
 * Common utility functions for E2E tests.
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Dismiss the cookie banner if present.
 * This prevents the banner from blocking clicks on other elements.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  try {
    // Look for common cookie banner buttons
    const acceptButton = page.locator(
      'button:has-text("Accetta"), button:has-text("Accept"), button:has-text("OK"), button:has-text("Accetto"), [data-testid="cookie-accept"]'
    ).first();
    
    // Wait briefly for cookie banner to appear
    await page.waitForTimeout(500);
    
    if (await acceptButton.isVisible({ timeout: 2000 })) {
      await acceptButton.click();
      // Wait for banner to disappear
      await page.waitForTimeout(300);
    }
  } catch {
    // Cookie banner not present, continue
  }
}

/**
 * Get focused element excluding Next.js dev tools elements.
 * The `:focus` selector can match Next.js portal elements in development.
 */
export async function getFocusedElement(page: Page): Promise<Locator> {
  // Exclude nextjs-portal and dev tools buttons
  return page.locator(':focus:not(nextjs-portal):not([data-nextjs-dev-tools-button])');
}

/**
 * Check if an element is focused, excluding Next.js dev tools.
 */
export async function expectFocusedElementVisible(page: Page): Promise<void> {
  const focusedElement = await getFocusedElement(page);
  const count = await focusedElement.count();
  
  // At least one real element should be focused
  expect(count).toBeGreaterThanOrEqual(1);
}

/**
 * Open mobile menu if on mobile viewport.
 * Returns true if mobile menu was opened.
 */
export async function openMobileMenuIfNeeded(page: Page): Promise<boolean> {
  const viewport = page.viewportSize();
  
  if (viewport && viewport.width < 1024) {
    // Look for hamburger menu button - specific to this app's Header component
    const menuButton = page.locator(
      'button[aria-label="Toggle menu"], button[aria-label*="menu" i], button[aria-label*="Menu"], [data-testid="mobile-menu"], button.lg\\:hidden'
    ).first();
    
    try {
      // Wait for menu button to be visible
      await menuButton.waitFor({ state: 'visible', timeout: 3000 });
      
      if (await menuButton.isVisible()) {
        await menuButton.click({ force: true });
        // Wait for menu animation to complete
        await page.waitForTimeout(600);
        
        // Verify menu opened by checking for mobile menu container
        const mobileMenu = page.locator('.lg\\:hidden.fixed');
        try {
          await mobileMenu.waitFor({ state: 'visible', timeout: 2000 });
        } catch {
          // Menu might have different structure
        }
        return true;
      }
    } catch {
      // Menu not available or couldn't open
    }
  }
  return false;
}

/**
 * Find a link that works on both mobile and desktop.
 * On mobile, handles submenu expansion if the link is in a submenu.
 */
export async function findNavigationLink(page: Page, href: string): Promise<Locator> {
  const viewport = page.viewportSize();
  
  // Links that are inside the "Altro" submenu
  const submenuLinks = ['/chi-siamo', '/lavora-con-noi', '/auth/login'];
  
  // First check if link is directly visible
  const directLink = page.locator(`a[href="${href}"]`).first();
  if (await directLink.isVisible({ timeout: 500 }).catch(() => false)) {
    return directLink;
  }
  
  // On mobile, may need to expand a submenu
  if (viewport && viewport.width < 1024) {
    // Check if this link is in a submenu
    if (submenuLinks.includes(href)) {
      // Click "Altro" to expand submenu
      const altroButton = page.locator('button:has-text("Altro")').first();
      if (await altroButton.isVisible({ timeout: 500 }).catch(() => false)) {
        await altroButton.click();
        await page.waitForTimeout(300);
      }
    }
    
    // For "Didattica" submenu items
    if (href.includes('/didattica')) {
      const didatticaButton = page.locator('button:has-text("Didattica")').first();
      if (await didatticaButton.isVisible({ timeout: 500 }).catch(() => false)) {
        await didatticaButton.click();
        await page.waitForTimeout(300);
      }
    }
  }
  
  // Now try to find the link again
  return page.locator(`a[href="${href}"]`).first();
}

/**
 * Navigate to page and handle common setup.
 */
export async function navigateAndSetup(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await dismissCookieBanner(page);
}

/**
 * Click element with force if cookie banner is blocking.
 */
export async function clickWithRetry(locator: Locator): Promise<void> {
  try {
    await locator.click({ timeout: 5000 });
  } catch {
    // Try with force if blocked
    await locator.click({ force: true });
  }
}

/**
 * Check if element is on mobile viewport.
 */
export function isMobileViewport(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport ? viewport.width < 768 : false;
}

/**
 * Find login link with multiple possible names.
 * On mobile, handles submenu expansion if needed.
 */
export async function getLoginLink(page: Page): Promise<Locator> {
  const viewport = page.viewportSize();
  
  // First check if it's directly visible
  const directLink = page.locator(
    'a[href*="/auth/login"], a[href*="/login"], a:has-text("Accedi"):visible'
  ).first();
  
  if (await directLink.isVisible({ timeout: 500 }).catch(() => false)) {
    return directLink;
  }
  
  // On mobile, check if we need to expand "Altro" submenu
  if (viewport && viewport.width < 1024) {
    // Look for "Altro" button in mobile menu and click it
    const altroButton = page.locator('button:has-text("Altro")').first();
    if (await altroButton.isVisible({ timeout: 500 }).catch(() => false)) {
      await altroButton.click();
      await page.waitForTimeout(300);
    }
    
    // Now look for the login link again
    const mobileLoginLink = page.locator(
      'a[href*="/auth/login"], a:has-text("Accedi")'
    ).first();
    
    return mobileLoginLink;
  }
  
  // Default: search anywhere
  return page.locator(
    'a[href*="/auth/login"], a[href*="/login"], a:has-text("Accedi"), a:has-text("Login")'
  ).first();
}

/**
 * Find register link with multiple possible names.
 */
export function getRegisterLink(page: Page): Locator {
  return page.locator(
    'a[href*="/auth/registrati"], a[href*="/register"], a:has-text("Registrati"), a:has-text("Iscriviti")'
  ).first();
}
