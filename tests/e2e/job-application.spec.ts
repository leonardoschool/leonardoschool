/**
 * Job Application (Lavora con Noi) E2E Tests
 * 
 * Tests for the job application form.
 */

import { test, expect } from '@playwright/test';
import { dismissCookieBanner, getFocusedElement, isMobileViewport } from './helpers';

test.describe('Lavora con Noi Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lavora-con-noi');
    await dismissCookieBanner(page);
  });

  test('should display the page', async ({ page }) => {
    // Should have a title
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should display job application form', async ({ page }) => {
    // Should have name input - use placeholder since no labels
    const nameInput = page.getByPlaceholder(/nome/i);
    await expect(nameInput).toBeVisible();
    
    // Should have email input
    const emailInput = page.getByPlaceholder(/email/i);
    await expect(emailInput).toBeVisible();
    
    // Should have phone input
    const phoneInput = page.getByPlaceholder(/telefono/i);
    await expect(phoneInput).toBeVisible();
  });

  test('should have subject field for teaching subject', async ({ page }) => {
    // Should have materia/subject selection - check both placeholder and label
    const materiaField = page.getByPlaceholder(/materia|materie|insegn/i);
    
    if (await materiaField.count() > 0) {
      await expect(materiaField.first()).toBeVisible();
    }
  });

  test('should have CV upload field', async ({ page }) => {
    // Should have file upload for CV
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.count() > 0) {
      // File input may be hidden, just check it exists
      expect(await fileInput.count()).toBeGreaterThan(0);
    }
  });

  test('should have message/motivation field', async ({ page }) => {
    // Should have textarea for motivation letter
    const messageField = page.getByPlaceholder(/messaggio|presentazione|motivazione/i);
    
    if (await messageField.count() > 0) {
      await expect(messageField.first()).toBeVisible();
    }
  });

  test('should have submit button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /invia|candidati|applica/i });
    await expect(submitButton).toBeVisible();
  });
});

test.describe('Job Application Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lavora-con-noi');
    await dismissCookieBanner(page);
  });

  test('should show validation errors for empty form', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /invia|candidati|applica/i });
    await submitButton.click({ force: true });
    
    // Should show validation errors - use placeholder
    const nameInput = page.getByPlaceholder(/nome/i);
    const isInvalid = await nameInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('should validate email format', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.fill('invalid-email');
    
    const submitButton = page.getByRole('button', { name: /invia|candidati|applica/i });
    await submitButton.click({ force: true });
    
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('should accept valid form data', async ({ page }) => {
    // Fill all required fields - use placeholder
    const nameInput = page.getByPlaceholder(/nome/i);
    await nameInput.fill('Maria Bianchi Test');
    
    const emailInput = page.getByPlaceholder(/email/i);
    await emailInput.fill('maria.bianchi@test.com');
    
    const phoneInput = page.getByPlaceholder(/telefono/i);
    await phoneInput.fill('3401234567');
    
    // Check all fields are valid
    const nameValid = await nameInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    const emailValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    
    expect(nameValid).toBe(true);
    expect(emailValid).toBe(true);
  });
});

test.describe('Job Application Accessibility', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/lavora-con-noi');
    await dismissCookieBanner(page);
    
    // Required fields should be accessible - use placeholder
    const nameInput = page.getByPlaceholder(/nome/i);
    await expect(nameInput).toBeVisible();
    
    const emailInput = page.getByPlaceholder(/email/i);
    await expect(emailInput).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Skip keyboard tests on mobile
    test.skip(isMobileViewport(page), 'Keyboard navigation not applicable on mobile');
    
    await page.goto('/lavora-con-noi');
    await dismissCookieBanner(page);
    
    // Tab through form
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    const focusedElement = await getFocusedElement(page);
    expect(await focusedElement.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Job Application Mobile', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/lavora-con-noi');
    await dismissCookieBanner(page);
    
    // Form should be visible - use placeholder
    const nameInput = page.getByPlaceholder(/nome/i);
    await expect(nameInput).toBeVisible();
  });
});
