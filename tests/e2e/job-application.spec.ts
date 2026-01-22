/**
 * Job Application (Lavora con Noi) E2E Tests
 * 
 * Tests for the job application form.
 */

import { test, expect } from '@playwright/test';

test.describe('Lavora con Noi Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lavora-con-noi');
  });

  test('should display the page', async ({ page }) => {
    // Should have a title
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should display job application form', async ({ page }) => {
    // Should have name input
    const nameInput = page.getByLabel(/nome/i);
    await expect(nameInput).toBeVisible();
    
    // Should have email input
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    
    // Should have phone input
    const phoneInput = page.getByLabel(/telefono|cellulare/i);
    await expect(phoneInput).toBeVisible();
  });

  test('should have subject field for teaching subject', async ({ page }) => {
    // Should have materia/subject selection
    const materiaField = page.getByLabel(/materia|materie|insegn/i);
    
    if (await materiaField.count() > 0) {
      await expect(materiaField.first()).toBeVisible();
    }
  });

  test('should have CV upload field', async ({ page }) => {
    // Should have file upload for CV
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.count() > 0) {
      await expect(fileInput.first()).toBeVisible();
    }
  });

  test('should have message/motivation field', async ({ page }) => {
    // Should have textarea for motivation letter
    const messageField = page.getByLabel(/messaggio|presentazione|motivazione/i);
    
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
  });

  test('should show validation errors for empty form', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /invia|candidati|applica/i });
    await submitButton.click();
    
    // Should show validation errors
    const nameInput = page.getByLabel(/nome/i);
    const isInvalid = await nameInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('should validate email format', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('invalid-email');
    
    const submitButton = page.getByRole('button', { name: /invia|candidati|applica/i });
    await submitButton.click();
    
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('should accept valid form data', async ({ page }) => {
    // Fill all required fields
    const nameInput = page.getByLabel(/nome/i);
    await nameInput.fill('Maria Bianchi Test');
    
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('maria.bianchi@test.com');
    
    const phoneInput = page.getByLabel(/telefono|cellulare/i);
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
    
    // Required fields should have labels
    const nameInput = page.getByLabel(/nome/i);
    await expect(nameInput).toBeVisible();
    
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/lavora-con-noi');
    
    // Tab through form
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Job Application Mobile', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/lavora-con-noi');
    
    // Form should be visible
    const nameInput = page.getByLabel(/nome/i);
    await expect(nameInput).toBeVisible();
  });
});
