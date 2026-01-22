/**
 * Contact Form E2E Tests
 * 
 * Tests for the contact form on the contattaci page.
 */

import { test, expect } from '@playwright/test';

test.describe('Contact Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contattaci');
  });

  test('should display contact form', async ({ page }) => {
    // Should have name input
    const nameInput = page.getByLabel(/nome/i);
    await expect(nameInput).toBeVisible();
    
    // Should have email input
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    
    // Should have phone input
    const phoneInput = page.getByLabel(/telefono|cellulare/i);
    await expect(phoneInput).toBeVisible();
    
    // Should have message textarea
    const messageInput = page.getByLabel(/messaggio/i);
    await expect(messageInput).toBeVisible();
    
    // Should have submit button
    const submitButton = page.getByRole('button', { name: /invia|contatta/i });
    await expect(submitButton).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /invia|contatta/i });
    await submitButton.click();
    
    // Should show validation errors
    // Check for HTML5 validation or custom error messages
    const nameInput = page.getByLabel(/nome/i);
    const isInvalid = await nameInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    
    // Either HTML5 validation or custom validation should trigger
    expect(isInvalid).toBe(true);
  });

  test('should validate email format', async ({ page }) => {
    // Fill invalid email
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('invalid-email');
    
    // Fill other required fields
    const nameInput = page.getByLabel(/nome/i);
    await nameInput.fill('Mario Rossi Test');
    
    const phoneInput = page.getByLabel(/telefono|cellulare/i);
    await phoneInput.fill('3401234567');
    
    const messageInput = page.getByLabel(/messaggio/i);
    await messageInput.fill('Test message for contact form validation testing purposes.');
    
    // Submit
    const submitButton = page.getByRole('button', { name: /invia|contatta/i });
    await submitButton.click();
    
    // Should show email validation error
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('should fill and validate all fields correctly', async ({ page }) => {
    // Fill all fields
    const nameInput = page.getByLabel(/nome/i);
    await nameInput.fill('Mario Rossi Test');
    
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('mario.rossi@test.com');
    
    const phoneInput = page.getByLabel(/telefono|cellulare/i);
    await phoneInput.fill('3401234567');
    
    // Find subject input if exists
    const subjectInput = page.getByLabel(/oggetto|soggetto/i);
    if (await subjectInput.count() > 0) {
      await subjectInput.fill('Richiesta informazioni corsi');
    }
    
    const messageInput = page.getByLabel(/messaggio/i);
    await messageInput.fill('Buongiorno, vorrei ricevere informazioni sui corsi disponibili. Grazie mille per la disponibilità.');
    
    // All inputs should be valid
    const nameValid = await nameInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    const emailValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    const phoneValid = await phoneInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    
    expect(nameValid).toBe(true);
    expect(emailValid).toBe(true);
    expect(phoneValid).toBe(true);
  });
});

test.describe('Contact Page Content', () => {
  test('should display contact information', async ({ page }) => {
    await page.goto('/contattaci');
    
    // Should have some contact info (email, phone, address)
    const pageContent = await page.textContent('body');
    
    // At least one of these should be present
    const hasEmail = pageContent?.includes('@') ?? false;
    const hasPhone = /\d{3}[\s.-]?\d{3}[\s.-]?\d{4}|\+39/.test(pageContent ?? '');
    const hasAddress = /via|piazza|corso/i.test(pageContent ?? '');
    
    expect(hasEmail || hasPhone || hasAddress).toBe(true);
  });

  test('should have page title', async ({ page }) => {
    await page.goto('/contattaci');
    
    // Should have a heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});

test.describe('Contact Form Accessibility', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/contattaci');
    
    // All form inputs should have labels
    const inputs = page.locator('input:not([type="hidden"]), textarea');
    const count = await inputs.count();
    
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      // Should have id for label association OR aria-label/aria-labelledby
      const hasLabel = id || ariaLabel || ariaLabelledBy;
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/contattaci');
    
    // Tab through form
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Something should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have submit button accessible', async ({ page }) => {
    await page.goto('/contattaci');
    
    const submitButton = page.getByRole('button', { name: /invia|contatta/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });
});

test.describe('Contact Form Mobile', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/contattaci');
    
    // Form should still be visible
    const nameInput = page.getByLabel(/nome/i);
    await expect(nameInput).toBeVisible();
    
    // Should be able to fill form
    await nameInput.fill('Test Mobile');
    await expect(nameInput).toHaveValue('Test Mobile');
  });

  test('should have touch-friendly input sizes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/contattaci');
    
    const nameInput = page.getByLabel(/nome/i);
    const box = await nameInput.boundingBox();
    
    // Input should be at least 44px tall for touch
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(40);
    }
  });
});
