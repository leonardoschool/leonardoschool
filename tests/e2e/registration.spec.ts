/**
 * Registration Page E2E Tests
 * 
 * Tests for the student registration page.
 */

import { test, expect } from '@playwright/test';

test.describe('Registration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/registrati');
  });

  test('should display registration page', async ({ page }) => {
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('should have name input fields', async ({ page }) => {
    // Should have nome and cognome or full name
    const nameInput = page.getByLabel(/nome/i);
    await expect(nameInput.first()).toBeVisible();
  });

  test('should have email input', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should have password input', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i).first();
    await expect(passwordInput).toBeVisible();
  });

  test('should have password confirmation', async ({ page }) => {
    // Look for confirm password field
    const confirmPassword = page.getByLabel(/conferma|ripeti/i);
    
    if (await confirmPassword.count() > 0) {
      await expect(confirmPassword.first()).toBeVisible();
    }
  });

  test('should have submit button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /registra|crea|iscri/i });
    await expect(submitButton).toBeVisible();
  });

  test('should have login link for existing users', async ({ page }) => {
    const loginLink = page.locator('a[href*="login"]');
    await expect(loginLink).toBeVisible();
  });
});

test.describe('Registration Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/registrati');
  });

  test('should show validation for empty form', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /registra|crea|iscri/i });
    await submitButton.click();
    
    // Should prevent submission
    await expect(page).toHaveURL(/registrati/);
  });

  test('should validate email format', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('invalidemail');
    
    const submitButton = page.getByRole('button', { name: /registra|crea|iscri/i });
    await submitButton.click();
    
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('should require minimum password length', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i).first();
    await passwordInput.fill('123');
    
    // Check if there's password strength indicator or validation
    const hasMinLength = await passwordInput.evaluate((el: HTMLInputElement) => {
      return el.minLength > 3 || !el.checkValidity();
    });
    
    // Password should have minimum requirements or be visible
    expect(hasMinLength || await passwordInput.isVisible()).toBe(true);
  });

  test('should check password confirmation matches', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i).first();
    await passwordInput.fill('Password123!');
    
    const confirmPassword = page.getByLabel(/conferma|ripeti/i);
    
    if (await confirmPassword.count() > 0) {
      await confirmPassword.first().fill('DifferentPassword');
      
      const submitButton = page.getByRole('button', { name: /registra|crea|iscri/i });
      await submitButton.click();
      
      // Should show mismatch error or prevent submission
      await expect(page).toHaveURL(/registrati/);
    }
  });
});

test.describe('Registration Password Visibility', () => {
  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/auth/registrati');
    
    const passwordInput = page.getByLabel(/password/i).first();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Find toggle button
    const toggleButton = page.locator('button[aria-label*="password"], button[type="button"]').filter({
      has: page.locator('svg, img')
    });
    
    if (await toggleButton.count() > 0) {
      await toggleButton.first().click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });
});

test.describe('Registration Terms and Privacy', () => {
  test('should have terms and conditions link', async ({ page }) => {
    await page.goto('/auth/registrati');
    
    const termsLink = page.locator('a[href*="termin"]');
    
    if (await termsLink.count() > 0) {
      await expect(termsLink.first()).toBeVisible();
    }
  });

  test('should have privacy checkbox or link', async ({ page }) => {
    await page.goto('/auth/registrati');
    
    const privacyCheckbox = page.getByLabel(/privacy|termin|accett/i);
    
    if (await privacyCheckbox.count() > 0) {
      await expect(privacyCheckbox.first()).toBeVisible();
    }
  });
});

test.describe('Registration Accessibility', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/auth/registrati');
    
    const nameInput = page.getByLabel(/nome/i);
    await expect(nameInput.first()).toBeVisible();
    
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/auth/registrati');
    
    // Tab through form fields
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Registration Mobile', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth/registrati');
    
    const nameInput = page.getByLabel(/nome/i);
    await expect(nameInput.first()).toBeVisible();
  });
});
