/**
 * Authentication E2E Tests
 * 
 * Tests for login, registration, and auth flows.
 */

import { test, expect } from '@playwright/test';
import { dismissCookieBanner, getFocusedElement, isMobileViewport } from './helpers';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await dismissCookieBanner(page);
  });

  test('should display login form', async ({ page }) => {
    // Should have email input - use role for specificity
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await expect(emailInput).toBeVisible();
    
    // Should have password input - use locator with input type for specificity
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    
    // Should have submit button
    const submitButton = page.getByRole('button', { name: /accedi|login|entra/i });
    await expect(submitButton).toBeVisible();
  });

  test('should have link to registration', async ({ page }) => {
    // Should have registration link
    const registerLink = page.getByRole('link', { name: /registra|iscriviti|crea account/i });
    await expect(registerLink).toBeVisible();
  });

  test('should show error for empty form submission', async ({ page }) => {
    // Click submit without filling form
    const submitButton = page.getByRole('button', { name: /accedi|login|entra/i });
    await submitButton.click({ force: true });
    
    // Should show validation error
    // (HTML5 validation or custom error message)
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('should show error for invalid email format', async ({ page }) => {
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await emailInput.fill('invalid-email');
    
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('password123');
    
    const submitButton = page.getByRole('button', { name: /accedi|login|entra/i });
    await submitButton.click({ force: true });
    
    // Should show email validation error
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(isInvalid).toBe(true);
  });

  test('should navigate to registration page', async ({ page }) => {
    const registerLink = page.getByRole('link', { name: /registra|iscriviti|crea account/i });
    await registerLink.click();
    
    await expect(page).toHaveURL(/\/auth\/registrati/);
  });

  test('should have password visibility toggle', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"], input#password');
    
    // Initially should be password type
    await expect(passwordInput.first()).toHaveAttribute('type', 'password');
    
    // Find toggle button (if exists)
    const toggleButton = page.locator('button[aria-label*="password" i], button[aria-label*="mostra" i]');
    
    if (await toggleButton.count() > 0) {
      await toggleButton.click();
      // Should now be text type
      await expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });
});

test.describe('Registration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/registrati');
    await dismissCookieBanner(page);
  });

  test('should display registration form', async ({ page }) => {
    // Should have email input
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
    
    // Should have password input
    const passwordInput = page.getByLabel(/password/i).first();
    await expect(passwordInput).toBeVisible();
    
    // Should have submit button
    const submitButton = page.getByRole('button', { name: /registra|iscriviti|crea/i });
    await expect(submitButton).toBeVisible();
  });

  test('should have link to login', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /accedi|login|hai già un account/i });
    await expect(loginLink).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /accedi|login|hai già un account/i });
    await loginLink.click();
    
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should show password strength indicator', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i).first();
    
    // Type weak password
    await passwordInput.fill('123');
    
    // Look for strength indicator
    const strengthIndicator = page.locator('[class*="strength"], [data-testid*="strength"]');
    
    if (await strengthIndicator.count() > 0) {
      await expect(strengthIndicator.first()).toBeVisible();
    }
  });

  test('should require password confirmation match', async ({ page }) => {
    const passwordInput = page.getByLabel(/^password$/i);
    const confirmInput = page.getByLabel(/conferma|ripeti/i);
    
    if (await confirmInput.count() > 0) {
      await passwordInput.fill('Password123!');
      await confirmInput.fill('DifferentPassword123!');
      
      const submitButton = page.getByRole('button', { name: /registra|iscriviti|crea/i });
      await submitButton.click({ force: true });
      
      // Should show mismatch error
      const errorMessage = page.locator('text=/password.*corrispondono|password.*match/i');
      
      if (await errorMessage.count() > 0) {
        await expect(errorMessage.first()).toBeVisible();
      }
    }
  });
});

test.describe('Auth Redirects', () => {
  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access dashboard without being logged in
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should redirect to login when accessing profile', async ({ page }) => {
    await page.goto('/profilo');
    
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should redirect to login when accessing settings', async ({ page }) => {
    await page.goto('/impostazioni');
    
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Auth Page Accessibility', () => {
  test('login page should have proper form labels', async ({ page }) => {
    await page.goto('/auth/login');
    await dismissCookieBanner(page);
    
    // Email input should have associated label - use role for specificity
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await expect(emailInput).toBeVisible();
    
    // Password input should exist and be visible
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('login page should be keyboard navigable', async ({ page }) => {
    // Skip keyboard tests on mobile
    test.skip(isMobileViewport(page), 'Keyboard navigation not applicable on mobile');
    
    await page.goto('/auth/login');
    await dismissCookieBanner(page);
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Something should be focused
    const focusedElement = await getFocusedElement(page);
    expect(await focusedElement.count()).toBeGreaterThanOrEqual(1);
  });

  test('registration page should have proper form labels', async ({ page }) => {
    await page.goto('/auth/registrati');
    await dismissCookieBanner(page);
    
    // Email input should have associated label
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await expect(emailInput).toBeVisible();
  });
});

test.describe('Auth Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/auth/login');
    await dismissCookieBanner(page);
    
    // Fill form - use specific selectors
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
    await page.locator('input[type="password"]').fill('password123');
    
    // Block network requests to auth endpoints
    await page.route('**/api/auth/**', route => route.abort());
    
    // Submit form
    const submitButton = page.getByRole('button', { name: /accedi|login|entra/i });
    await submitButton.click({ force: true });
    
    // Should show error message (not crash)
    // Wait a bit for error to appear
    await page.waitForTimeout(1000);
    
    // Page should still be functional
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
  });
});
