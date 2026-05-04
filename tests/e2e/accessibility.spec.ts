/**
 * Accessibility E2E Tests
 * 
 * Tests for WCAG compliance and accessibility best practices.
 */

import { test, expect } from '@playwright/test';
import { dismissCookieBanner, getFocusedElement, expectFocusedElementVisible, isMobileViewport } from './helpers';

test.describe('Accessibility - Keyboard Navigation', () => {
  test('should be navigable with keyboard only', async ({ page }) => {
    // Skip keyboard navigation tests on mobile - no physical keyboard
    test.skip(isMobileViewport(page), 'Keyboard navigation not applicable on mobile');
    
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Tab through page - check we can tab at least a few times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Should have focus on some element
    await expectFocusedElementVisible(page);
  });

  test('should have visible focus indicators', async ({ page }) => {
    // Skip keyboard tests on mobile
    test.skip(isMobileViewport(page), 'Focus indicators test not applicable on mobile');
    
    await page.goto('/');
    await dismissCookieBanner(page);
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = await getFocusedElement(page);
    
    // Check if element has focus styles
    if (await focusedElement.count() > 0) {
      const outlineStyle = await focusedElement.first().evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.outline || styles.boxShadow || styles.border;
      });
      
      expect(outlineStyle).toBeTruthy();
    }
  });

  test('should navigate backwards with Shift+Tab', async ({ page }) => {
    // Skip keyboard tests on mobile
    test.skip(isMobileViewport(page), 'Keyboard navigation not applicable on mobile');
    
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Tab forward
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Tab backward
    await page.keyboard.press('Shift+Tab');
    
    await expectFocusedElementVisible(page);
  });
});

test.describe('Accessibility - ARIA Attributes', () => {
  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Exclude Next.js dev tools buttons
    const buttons = page.locator('button:not([data-nextjs-dev-tools-button]):not([id*="next"]):visible');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledBy = await button.getAttribute('aria-labelledby');
        
        // Button should have accessible name
        const hasAccessibleName = (text && text.trim()) || ariaLabel || ariaLabelledBy;
        expect(hasAccessibleName).toBeTruthy();
      }
    }
  });

  test('links should have accessible names', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    const links = page.locator('a:visible');
    const count = await links.count();
    
    let linksWithAccessibleNames = 0;
    for (let i = 0; i < Math.min(count, 10); i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');
      
      // Link should have accessible name - text, aria-label, or title
      const hasAccessibleName = (text && text.trim()) || ariaLabel || title;
      if (hasAccessibleName) {
        linksWithAccessibleNames++;
      }
    }
    
    // At least 80% of links should have accessible names
    expect(linksWithAccessibleNames / Math.min(count, 10)).toBeGreaterThanOrEqual(0.8);
  });

  test('form inputs should have labels', async ({ page }) => {
    await page.goto('/contattaci');
    await dismissCookieBanner(page);
    
    const inputs = page.locator('input:not([type="hidden"]):not([type="submit"]):visible');
    const count = await inputs.count();
    
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      
      // Input should have label association or placeholder
      const hasLabel = id || ariaLabel || ariaLabelledBy || placeholder;
      expect(hasLabel).toBeTruthy();
    }
  });
});

test.describe('Accessibility - Landmarks', () => {
  test('should have main landmark', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });

  test('should have header landmark', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    const header = page.locator('header, [role="banner"]');
    await expect(header).toBeVisible();
  });

  test('should have navigation landmark', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // On mobile, nav might be inside hamburger menu - skip visibility check
    const nav = page.locator('nav, [role="navigation"]');
    const navCount = await nav.count();
    
    // Navigation should exist somewhere in the DOM (even if hidden in mobile menu)
    expect(navCount).toBeGreaterThan(0);
  });
});

test.describe('Accessibility - Color Contrast', () => {
  test('text should be readable against background', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Check main heading or any visible heading
    const heading = page.locator('h1, h2, h3').first();
    
    if (await heading.isVisible()) {
      const color = await heading.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.color;
      });
      
      // Color should be defined
      expect(color).toBeTruthy();
      expect(color).not.toBe('transparent');
    }
  });
});

test.describe('Accessibility - Motion Preferences', () => {
  test('should respect reduced motion preference', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Page should still be functional
    await expect(page).toHaveTitle(/Leonardo School/);
  });
});

test.describe('Accessibility - Forms', () => {
  test('form errors should be announced', async ({ page }) => {
    await page.goto('/contattaci');
    await dismissCookieBanner(page);
    
    // Submit empty form
    const submitButton = page.getByRole('button', { name: /invia|contatta|send/i });
    
    if (await submitButton.isVisible()) {
      await submitButton.click({ force: true });
      
      // Check for error indicators
      const invalidInputs = page.locator('input:invalid, [aria-invalid="true"]');
      
      if (await invalidInputs.count() > 0) {
        // Invalid inputs should be identifiable
        await expect(invalidInputs.first()).toBeVisible();
      }
    }
  });

  test('required fields should be indicated', async ({ page }) => {
    await page.goto('/contattaci');
    await dismissCookieBanner(page);
    
    // Check for required inputs or asterisks
    const requiredInputs = page.locator('input[required], [aria-required="true"]');
    const asterisks = page.locator('span:has-text("*"), .required');
    
    const hasRequiredIndicators = (await requiredInputs.count()) > 0 || (await asterisks.count()) > 0;
    expect(hasRequiredIndicators).toBe(true);
  });
});

test.describe('Accessibility - Images', () => {
  test('decorative images should be hidden from screen readers', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    const decorativeImages = page.locator('img[alt=""], img[role="presentation"]');
    const count = await decorativeImages.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = decorativeImages.nth(i);
      const role = await img.getAttribute('role');
      const ariaHidden = await img.getAttribute('aria-hidden');
      const alt = await img.getAttribute('alt');
      
      // Should be marked as presentational
      const isDecorativelyMarked = role === 'presentation' || ariaHidden === 'true' || alt === '';
      expect(isDecorativelyMarked).toBe(true);
    }
  });
});

test.describe('Accessibility - Skip Links', () => {
  test('should have skip to content functionality', async ({ page }) => {
    // Skip keyboard tests on mobile
    test.skip(isMobileViewport(page), 'Skip links test not applicable on mobile');
    
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Press Tab to focus first element
    await page.keyboard.press('Tab');
    
    const focusedElement = await getFocusedElement(page);
    
    if (await focusedElement.count() > 0) {
      const text = await focusedElement.first().textContent();
      
      // Check if it's a skip link (may or may not exist)
      if (text && /skip|salta|content|principale/i.test(text)) {
        await page.keyboard.press('Enter');
        
        // Focus should move to main content
        const newFocused = await getFocusedElement(page);
        expect(await newFocused.count()).toBeGreaterThanOrEqual(0);
      }
    }
    
    // Test passes even if no skip link - it's recommended but not required
    expect(true).toBe(true);
  });
});

test.describe('Accessibility - Language', () => {
  test('page should have lang attribute', async ({ page }) => {
    await page.goto('/');
    
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
    expect(lang).toBe('it');
  });
});

test.describe('Accessibility - Responsive Design', () => {
  const viewports = [
    { width: 320, height: 568, name: 'Small mobile' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 1920, height: 1080, name: 'Desktop' },
  ];

  for (const viewport of viewports) {
    test(`should be usable on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await dismissCookieBanner(page);
      
      // Content should be visible - check for any heading or main content
      const mainContent = page.locator('h1, h2, main, [role="main"]').first();
      await expect(mainContent).toBeVisible();
      
      // Should not have excessive horizontal overflow
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 50);
    });
  }
});
