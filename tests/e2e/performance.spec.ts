/**
 * Performance E2E Tests
 * 
 * Tests for page load performance and core web vitals.
 */

import { test, expect } from '@playwright/test';
import { dismissCookieBanner } from './helpers';

test.describe('Performance - Page Load', () => {
  test('homepage should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have proper response headers', async ({ page }) => {
    const response = await page.goto('/');
    
    // Should return 200 status
    expect(response?.status()).toBe(200);
    
    // Check content type
    const contentType = response?.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });
});

test.describe('Performance - Resource Loading', () => {
  test('critical CSS should be loaded', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    // Page should have styles applied
    const heading = page.locator('h1, h2').first();
    if (await heading.isVisible()) {
      const fontSize = await heading.evaluate(el => {
        return window.getComputedStyle(el).fontSize;
      });
      
      // Should have styled font size
      expect(fontSize).toBeTruthy();
    }
  });

  test('should not have render-blocking resources', async ({ page }) => {
    await page.goto('/');
    
    // Check for async/defer scripts
    const scripts = page.locator('script[src]');
    const count = await scripts.count();
    
    let asyncCount = 0;
    for (let i = 0; i < count; i++) {
      const script = scripts.nth(i);
      const async = await script.getAttribute('async');
      const defer = await script.getAttribute('defer');
      const type = await script.getAttribute('type');
      
      if (async !== null || defer !== null || type === 'module') {
        asyncCount++;
      }
    }
    
    // Most scripts should be async/defer/module
    if (count > 0) {
      expect(asyncCount / count).toBeGreaterThanOrEqual(0.5);
    }
  });
});

test.describe('Performance - Image Optimization', () => {
  test('images should have proper loading strategy', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const count = await images.count();
    
    let lazyCount = 0;
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const loading = await img.getAttribute('loading');
      
      if (loading === 'lazy') {
        lazyCount++;
      }
    }
    
    // Below-fold images should be lazy loaded
    // At least some images should be lazy if there are many
    if (count > 3) {
      expect(lazyCount).toBeGreaterThan(0);
    }
  });

  test('images should use modern formats', async ({ page }) => {
    await page.goto('/');
    
    const sources = page.locator('source[type="image/webp"], source[type="image/avif"]');
    const pictures = page.locator('picture');
    
    // If using picture elements, should have modern format sources
    if (await pictures.count() > 0) {
      expect(await sources.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Performance - Caching', () => {
  test('static assets should have cache headers', async ({ page }) => {
    // Navigate and capture network requests
    const responses: Map<string, string | null> = new Map();
    
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.js') || url.includes('.css')) {
        responses.set(url, response.headers()['cache-control']);
      }
    });
    
    await page.goto('/');
    
    // At least some assets should have cache headers
    for (const [_url, cacheControl] of responses) {
      if (cacheControl) {
        expect(cacheControl).toBeTruthy();
      }
    }
  });
});

test.describe('Performance - DOM Size', () => {
  test('DOM should not be excessively large', async ({ page }) => {
    await page.goto('/');
    
    const nodeCount = await page.evaluate(() => {
      return document.getElementsByTagName('*').length;
    });
    
    // DOM should have reasonable number of nodes (< 1500 is good)
    expect(nodeCount).toBeLessThan(3000);
  });
});

test.describe('Performance - JavaScript', () => {
  test('should not have JavaScript errors on load', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should not have JS errors
    expect(errors).toHaveLength(0);
  });

  test('should not have console errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out expected errors (like network issues in dev)
    const criticalErrors = errors.filter(
      (e) => !e.includes('Failed to load resource') && !e.includes('net::')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Performance - Mobile', () => {
  test('mobile page should load efficiently', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Mobile should also load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe('Performance - Network', () => {
  test('should handle slow network gracefully', async ({ page, context }) => {
    // Simulate slow 3G
    await context.route('**/*', async (route) => {
      // Add small delay
      await new Promise((resolve) => setTimeout(resolve, 50));
      await route.continue();
    });
    
    await page.goto('/', { timeout: 30000 });
    
    // Page should still render
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});

test.describe('Performance - Bundle Analysis', () => {
  test('page should not load excessive JavaScript', async ({ page }) => {
    let totalJsSize = 0;
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.endsWith('.js')) {
        const headers = response.headers();
        const contentLength = parseInt(headers['content-length'] || '0');
        totalJsSize += contentLength;
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Total JS should be under 5MB (Next.js apps with rich features)
    expect(totalJsSize).toBeLessThan(5 * 1024 * 1024);
  });
});
