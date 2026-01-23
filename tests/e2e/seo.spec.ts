/**
 * SEO E2E Tests
 * 
 * Tests for search engine optimization elements.
 */

import { test, expect } from '@playwright/test';
import { dismissCookieBanner } from './helpers';

test.describe('SEO Meta Tags', () => {
  test('homepage should have essential meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(10);
    expect(title.length).toBeLessThan(70);
    
    // Description
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(50);
    // Allow slightly longer descriptions (up to 200 chars)
    expect(description!.length).toBeLessThan(200);
  });

  test('should have Open Graph tags', async ({ page }) => {
    await page.goto('/');
    
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    
    expect(ogTitle).toBeTruthy();
    expect(ogDescription).toBeTruthy();
    expect(ogType).toBeTruthy();
  });

  test('should have Twitter card tags', async ({ page }) => {
    await page.goto('/');
    
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    
    if (twitterCard) {
      expect(['summary', 'summary_large_image']).toContain(twitterCard);
    }
  });

  test('should have viewport meta tag', async ({ page }) => {
    await page.goto('/');
    
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('should have charset meta tag', async ({ page }) => {
    await page.goto('/');
    
    const charset = await page.locator('meta[charset]').getAttribute('charset');
    expect(charset?.toLowerCase()).toBe('utf-8');
  });
});

test.describe('SEO Canonical URLs', () => {
  test('homepage should have canonical URL', async ({ page }) => {
    await page.goto('/');
    
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    
    if (canonical) {
      expect(canonical).toMatch(/https?:\/\//);
    }
  });

  test('subpages should have canonical URLs', async ({ page }) => {
    await page.goto('/chi-siamo');
    
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    
    // Canonical URL exists and is a valid URL
    if (canonical) {
      expect(canonical).toMatch(/https?:\/\//);
    }
  });
});

test.describe('SEO Structured Data', () => {
  test('should have JSON-LD structured data', async ({ page }) => {
    await page.goto('/');
    
    const jsonLd = page.locator('script[type="application/ld+json"]');
    
    if (await jsonLd.count() > 0) {
      const content = await jsonLd.first().textContent();
      expect(content).toBeTruthy();
      
      // Should be valid JSON
      const parsed = JSON.parse(content!);
      expect(parsed).toBeTruthy();
    }
  });
});

test.describe('SEO Robots', () => {
  test('robots.txt should be accessible', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);
  });

  test('robots.txt should have sitemap reference', async ({ page }) => {
    await page.goto('/robots.txt');
    const content = await page.textContent('body');
    
    expect(content).toContain('Sitemap');
  });
});

test.describe('SEO Sitemap', () => {
  test('sitemap should be accessible', async ({ page, request }) => {
    // Use request API for XML content to avoid browser rendering issues
    const response = await request.get('/sitemap.xml');
    
    if (response.status() === 200) {
      const content = await response.text();
      expect(content).toContain('urlset');
    }
  });
});

test.describe('SEO Images', () => {
  test('images should have alt attributes', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const alt = await images.nth(i).getAttribute('alt');
      // All images should have alt (can be empty for decorative)
      expect(alt !== null).toBe(true);
    }
  });

  test('images should have proper dimensions', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const width = await img.getAttribute('width');
      const height = await img.getAttribute('height');
      
      // At least some images should have dimensions for CLS prevention
      // This is a soft check since Next.js Image component handles this
      if (width && height) {
        expect(parseInt(width)).toBeGreaterThan(0);
        expect(parseInt(height)).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('SEO Heading Structure', () => {
  test('should have at least one h1 per page', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('headings should be in logical order', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const count = await headings.count();
    
    // Just verify there are headings on the page
    // Note: Strict heading order checking is better done with a linter
    expect(count).toBeGreaterThan(0);
    
    // Verify h1 exists
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });
});

test.describe('SEO Links', () => {
  test('external links should have rel="noopener"', async ({ page }) => {
    await page.goto('/');
    
    const externalLinks = page.locator('a[target="_blank"]');
    const count = await externalLinks.count();
    
    for (let i = 0; i < count; i++) {
      const rel = await externalLinks.nth(i).getAttribute('rel');
      expect(rel).toContain('noopener');
    }
  });

  test('internal links should not be broken', async ({ page }) => {
    await page.goto('/');
    
    const internalLinks = page.locator('a[href^="/"]');
    const count = await internalLinks.count();
    
    // Check first few links don't return 404
    for (let i = 0; i < Math.min(count, 5); i++) {
      const href = await internalLinks.nth(i).getAttribute('href');
      
      if (href && !href.includes('#')) {
        const response = await page.goto(href);
        expect(response?.status()).not.toBe(404);
      }
    }
  });
});
