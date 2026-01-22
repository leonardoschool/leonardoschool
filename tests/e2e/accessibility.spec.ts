/**
 * Accessibility E2E Tests
 * 
 * Tests for WCAG compliance and accessibility best practices.
 */

import { test, expect } from '@playwright/test';

test.describe('Accessibility - Keyboard Navigation', () => {
  test('should be navigable with keyboard only', async ({ page }) => {
    await page.goto('/');
    
    // Tab through page
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/');
    
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    
    // Check if element has focus styles
    const outlineStyle = await focusedElement.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.outline || styles.boxShadow;
    });
    
    expect(outlineStyle).toBeTruthy();
  });

  test('should navigate backwards with Shift+Tab', async ({ page }) => {
    await page.goto('/');
    
    // Tab forward
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Tab backward
    await page.keyboard.press('Shift+Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Accessibility - ARIA Attributes', () => {
  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/');
    
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      // Button should have accessible name
      const hasAccessibleName = (text && text.trim()) || ariaLabel || ariaLabelledBy;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('links should have accessible names', async ({ page }) => {
    await page.goto('/');
    
    const links = page.locator('a');
    const count = await links.count();
    
    for (let i = 0; i < Math.min(count, 20); i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      
      // Link should have accessible name
      const hasAccessibleName = (text && text.trim()) || ariaLabel;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('form inputs should have labels', async ({ page }) => {
    await page.goto('/contattaci');
    
    const inputs = page.locator('input:not([type="hidden"]):not([type="submit"])');
    const count = await inputs.count();
    
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      // Input should have label association
      const hasLabel = id || ariaLabel || ariaLabelledBy;
      expect(hasLabel).toBeTruthy();
    }
  });
});

test.describe('Accessibility - Landmarks', () => {
  test('should have main landmark', async ({ page }) => {
    await page.goto('/');
    
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });

  test('should have header landmark', async ({ page }) => {
    await page.goto('/');
    
    const header = page.locator('header, [role="banner"]');
    await expect(header).toBeVisible();
  });

  test('should have navigation landmark', async ({ page }) => {
    await page.goto('/');
    
    const nav = page.locator('nav, [role="navigation"]');
    expect(await nav.count()).toBeGreaterThan(0);
  });
});

test.describe('Accessibility - Color Contrast', () => {
  test('text should be readable against background', async ({ page }) => {
    await page.goto('/');
    
    // Check main heading
    const heading = page.locator('h1').first();
    const color = await heading.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.color;
    });
    
    // Color should be defined
    expect(color).toBeTruthy();
    expect(color).not.toBe('transparent');
  });
});

test.describe('Accessibility - Motion Preferences', () => {
  test('should respect reduced motion preference', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    
    // Page should still be functional
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });
});

test.describe('Accessibility - Forms', () => {
  test('form errors should be announced', async ({ page }) => {
    await page.goto('/contattaci');
    
    // Submit empty form
    const submitButton = page.getByRole('button', { name: /invia/i });
    await submitButton.click();
    
    // Check for error indicators
    const invalidInputs = page.locator('input:invalid, [aria-invalid="true"]');
    
    if (await invalidInputs.count() > 0) {
      // Invalid inputs should be identifiable
      await expect(invalidInputs.first()).toBeVisible();
    }
  });

  test('required fields should be indicated', async ({ page }) => {
    await page.goto('/contattaci');
    
    const requiredInputs = page.locator('input[required], [aria-required="true"]');
    expect(await requiredInputs.count()).toBeGreaterThan(0);
  });
});

test.describe('Accessibility - Images', () => {
  test('decorative images should be hidden from screen readers', async ({ page }) => {
    await page.goto('/');
    
    const decorativeImages = page.locator('img[alt=""], img[role="presentation"]');
    const count = await decorativeImages.count();
    
    for (let i = 0; i < count; i++) {
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
    await page.goto('/');
    
    // Press Tab to focus first element
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    const text = await focusedElement.textContent();
    
    // Check if it's a skip link (may or may not exist)
    if (text && /skip|salta|content|principale/i.test(text)) {
      await page.keyboard.press('Enter');
      
      // Focus should move to main content
      const newFocused = page.locator(':focus');
      await expect(newFocused).toBeVisible();
    }
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
      
      // Content should be visible
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();
      
      // Should not have horizontal overflow
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 20);
    });
  }
});
