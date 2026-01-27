/**
 * Tests for sanitizeHtml utility
 * Critical security tests for XSS prevention
 */
import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  stripHtml,
  sanitizeAttribute,
  validateContentLength,
  ALLOWED_TAGS,
} from '@/lib/utils/sanitizeHtml';

describe('sanitizeHtml', () => {
  describe('sanitizeHtml', () => {
    describe('basic functionality', () => {
      it('should return empty string for null', () => {
        expect(sanitizeHtml(null)).toBe('');
      });

      it('should return empty string for undefined', () => {
        expect(sanitizeHtml(undefined)).toBe('');
      });

      it('should return empty string for empty string', () => {
        expect(sanitizeHtml('')).toBe('');
      });

      it('should preserve safe text content', () => {
        expect(sanitizeHtml('Hello World')).toBe('Hello World');
      });

      it('should preserve allowed HTML tags', () => {
        const html = '<p>Hello <strong>World</strong></p>';
        expect(sanitizeHtml(html)).toBe(html);
      });

      it('should preserve multiple allowed tags', () => {
        const html = '<h1>Title</h1><p>Paragraph</p><ul><li>Item</li></ul>';
        expect(sanitizeHtml(html)).toBe(html);
      });
    });

    describe('XSS prevention - script tags', () => {
      it('should remove script tags', () => {
        const malicious = '<script>alert("xss")</script>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove script tags with content', () => {
        const malicious = '<p>Hello</p><script>document.cookie</script><p>World</p>';
        expect(sanitizeHtml(malicious)).toContain('<p>Hello</p>');
        expect(sanitizeHtml(malicious)).toContain('<p>World</p>');
        expect(sanitizeHtml(malicious)).not.toContain('script');
      });

      it('should remove self-closing script tags', () => {
        const malicious = '<script src="evil.js"/>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove script tags with attributes', () => {
        const malicious = '<script type="text/javascript" src="evil.js">evil()</script>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should handle case-insensitive script tags', () => {
        const malicious = '<SCRIPT>alert(1)</SCRIPT>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should handle mixed case script tags', () => {
        const malicious = '<ScRiPt>alert(1)</sCrIpT>';
        expect(sanitizeHtml(malicious)).toBe('');
      });
    });

    describe('XSS prevention - event handlers', () => {
      it('should remove onclick handler', () => {
        const malicious = '<p onclick="alert(1)">Click me</p>';
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain('onclick');
        expect(result).toContain('Click me');
      });

      it('should remove onmouseover handler', () => {
        const malicious = '<div onmouseover="evil()">Hover</div>';
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain('onmouseover');
      });

      it('should remove onerror handler', () => {
        const malicious = '<img onerror="alert(1)" src="x">';
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain('onerror');
      });

      it('should remove onload handler', () => {
        const malicious = '<body onload="evil()">Content</body>';
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain('onload');
      });

      it('should remove onfocus handler', () => {
        const malicious = '<input onfocus="alert(1)">';
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain('onfocus');
      });

      it('should remove multiple event handlers', () => {
        const malicious = '<p onclick="a()" onmouseover="b()" onmouseout="c()">Text</p>';
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain('onclick');
        expect(result).not.toContain('onmouseover');
        expect(result).not.toContain('onmouseout');
      });
    });

    describe('XSS prevention - dangerous tags', () => {
      it('should remove iframe tags', () => {
        const malicious = '<iframe src="evil.com"></iframe>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove object tags', () => {
        const malicious = '<object data="evil.swf"></object>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove embed tags', () => {
        const malicious = '<embed src="evil.swf">';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove form tags', () => {
        const malicious = '<form action="evil.com"><input type="text"></form>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove input tags', () => {
        const malicious = '<input type="text" value="evil">';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove button tags', () => {
        const malicious = '<button onclick="evil()">Click</button>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove textarea tags', () => {
        const malicious = '<textarea>evil</textarea>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove select tags', () => {
        const malicious = '<select><option>evil</option></select>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove meta tags', () => {
        const malicious = '<meta http-equiv="refresh" content="0;url=evil.com">';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove link tags', () => {
        const malicious = '<link rel="stylesheet" href="evil.css">';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove base tags', () => {
        const malicious = '<base href="evil.com">';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove style tags', () => {
        const malicious = '<style>body { background: url(evil.com) }</style>';
        expect(sanitizeHtml(malicious)).toBe('');
      });
    });

    /* eslint-disable sonarjs/code-eval -- Test data for XSS prevention contains intentional malicious patterns */
    describe('XSS prevention - javascript protocol', () => {
      it('should remove javascript: in any context', () => {
        const malicious = '<a href="javascript:alert(1)">Click</a>';
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain('javascript:');
      });

      it('should remove javascript: with spaces', () => {
        const malicious = '<a href="javascript :alert(1)">Click</a>';
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain('javascript');
      });

      it('should remove vbscript:', () => {
        const malicious = '<a href="vbscript:evil()">Click</a>';
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain('vbscript');
      });
    });
    /* eslint-enable sonarjs/code-eval */

    describe('XSS prevention - SVG and MathML', () => {
      it('should remove SVG tags', () => {
        const malicious = '<svg onload="alert(1)"><circle/></svg>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove SVG with embedded scripts', () => {
        const malicious = '<svg><script>alert(1)</script></svg>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove MathML tags', () => {
        const malicious = '<math><mrow>evil</mrow></math>';
        expect(sanitizeHtml(malicious)).toBe('');
      });
    });

    describe('XSS prevention - HTML comments', () => {
      it('should remove HTML comments', () => {
        const html = '<p>Hello</p><!-- comment --><p>World</p>';
        const result = sanitizeHtml(html);
        expect(result).not.toContain('<!--');
        expect(result).not.toContain('comment');
        expect(result).toContain('<p>Hello</p>');
        expect(result).toContain('<p>World</p>');
      });

      it('should remove conditional comments', () => {
        const malicious = '<!--[if IE]><script>evil()</script><![endif]-->';
        expect(sanitizeHtml(malicious)).toBe('');
      });
    });

    describe('XSS prevention - CDATA and XML', () => {
      it('should remove CDATA sections', () => {
        const malicious = '<![CDATA[evil content]]>';
        expect(sanitizeHtml(malicious)).toBe('');
      });

      it('should remove XML declarations', () => {
        const malicious = '<?xml version="1.0"?><p>Content</p>';
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain('<?xml');
      });

      it('should remove DOCTYPE', () => {
        const malicious = '<!DOCTYPE html><p>Content</p>';
        const result = sanitizeHtml(malicious);
        expect(result).not.toContain('DOCTYPE');
      });
    });

    describe('content preservation', () => {
      it('should preserve allowed heading tags', () => {
        for (let i = 1; i <= 6; i++) {
          const tag = `h${i}`;
          const html = `<${tag}>Heading</${tag}>`;
          expect(sanitizeHtml(html)).toBe(html);
        }
      });

      it('should preserve allowed formatting tags', () => {
        const tags = ['b', 'i', 'u', 'strong', 'em'];
        tags.forEach((tag) => {
          const html = `<${tag}>Text</${tag}>`;
          expect(sanitizeHtml(html)).toBe(html);
        });
      });

      it('should preserve allowed list tags', () => {
        const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
        expect(sanitizeHtml(html)).toBe(html);
      });

      it('should preserve allowed table tags', () => {
        const html = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
        expect(sanitizeHtml(html)).toBe(html);
      });

      it('should preserve blockquote tags', () => {
        const html = '<blockquote>Quote</blockquote>';
        expect(sanitizeHtml(html)).toBe(html);
      });

      it('should preserve code tags', () => {
        const html = '<pre><code>console.log("hello")</code></pre>';
        expect(sanitizeHtml(html)).toBe(html);
      });

      it('should preserve br tags', () => {
        const html = '<p>Line 1<br>Line 2</p>';
        expect(sanitizeHtml(html)).toBe(html);
      });
    });
  });

  describe('stripHtml', () => {
    it('should return empty string for null', () => {
      expect(stripHtml(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(stripHtml(undefined)).toBe('');
    });

    it('should remove all HTML tags', () => {
      expect(stripHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
    });

    it('should decode HTML entities', () => {
      expect(stripHtml('Hello&nbsp;World')).toBe('Hello World');
      expect(stripHtml('5 &gt; 3 &amp; 3 &lt; 5')).toBe('5 > 3 & 3 < 5');
      expect(stripHtml('&quot;Hello&quot; &amp; &#39;World&#39;')).toBe('"Hello" & \'World\'');
    });

    it('should collapse multiple spaces', () => {
      expect(stripHtml('<p>Hello</p>    <p>World</p>')).toBe('Hello World');
    });

    it('should trim whitespace', () => {
      expect(stripHtml('   <p>Hello</p>   ')).toBe('Hello');
    });

    it('should handle nested tags', () => {
      expect(stripHtml('<div><p><span>Deep</span></p></div>')).toBe('Deep');
    });

    it('should handle self-closing tags', () => {
      expect(stripHtml('Hello<br/>World')).toBe('HelloWorld');
    });
  });

  describe('sanitizeAttribute', () => {
    describe('anchor tag (a)', () => {
      it('should allow href attribute', () => {
        expect(sanitizeAttribute('a', 'href', 'https://example.com')).toBe('https://example.com');
      });

      it('should sanitize javascript: in href', () => {
        // eslint-disable-next-line sonarjs/code-eval -- Test data for XSS prevention
        expect(sanitizeAttribute('a', 'href', 'javascript:alert(1)')).toBe('#');
      });

      it('should sanitize vbscript: in href', () => {
        expect(sanitizeAttribute('a', 'href', 'vbscript:evil()')).toBe('#');
      });

      it('should sanitize data: URLs in href', () => {
        expect(sanitizeAttribute('a', 'href', 'data:text/html,<script>alert(1)</script>')).toBe('#');
      });

      it('should allow title attribute', () => {
        expect(sanitizeAttribute('a', 'title', 'Link title')).toBe('Link title');
      });

      it('should allow target _blank only', () => {
        expect(sanitizeAttribute('a', 'target', '_blank')).toBe('_blank');
        expect(sanitizeAttribute('a', 'target', '_self')).toBeNull();
        expect(sanitizeAttribute('a', 'target', '_parent')).toBeNull();
      });

      it('should reject disallowed attributes', () => {
        expect(sanitizeAttribute('a', 'onclick', 'evil()')).toBeNull();
        expect(sanitizeAttribute('a', 'onerror', 'evil()')).toBeNull();
      });
    });

    describe('span/div tags', () => {
      it('should allow class attribute', () => {
        expect(sanitizeAttribute('span', 'class', 'text-red')).toBe('text-red');
        expect(sanitizeAttribute('div', 'class', 'container')).toBe('container');
      });

      it('should allow style attribute with safe values', () => {
        expect(sanitizeAttribute('span', 'style', 'color: red;')).toBe('color: red;');
      });

      it('should sanitize dangerous CSS', () => {
        const dangerous = 'behavior: url(evil.htc)';
        const result = sanitizeAttribute('span', 'style', dangerous);
        expect(result).not.toContain('behavior');
      });

      it('should sanitize expression() in style', () => {
        const dangerous = 'width: expression(alert(1))';
        const result = sanitizeAttribute('span', 'style', dangerous);
        expect(result).not.toContain('expression');
      });

      it('should sanitize javascript in style', () => {
        const dangerous = 'background: url(javascript:evil())';
        const result = sanitizeAttribute('span', 'style', dangerous);
        expect(result).not.toContain('javascript');
      });
    });

    describe('table tags', () => {
      it('should allow colspan on td', () => {
        expect(sanitizeAttribute('td', 'colspan', '2')).toBe('2');
      });

      it('should allow rowspan on th', () => {
        expect(sanitizeAttribute('th', 'rowspan', '3')).toBe('3');
      });

      it('should allow class on table elements', () => {
        expect(sanitizeAttribute('table', 'class', 'data-table')).toBe('data-table');
      });
    });

    describe('tags without allowed attributes', () => {
      it('should reject attributes on tags without allowlist', () => {
        expect(sanitizeAttribute('b', 'class', 'bold')).toBeNull();
        expect(sanitizeAttribute('strong', 'style', 'color: red')).toBeNull();
        expect(sanitizeAttribute('li', 'onclick', 'evil()')).toBeNull();
      });
    });
  });

  describe('validateContentLength', () => {
    it('should accept content within limit', () => {
      const result = validateContentLength('Hello World', 100);
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should reject content exceeding limit', () => {
      const longContent = 'x'.repeat(101);
      const result = validateContentLength(longContent, 100);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lunghezza massima');
    });

    it('should use default 100KB limit', () => {
      const content = 'x'.repeat(100001);
      const result = validateContentLength(content);
      expect(result.valid).toBe(false);
    });

    it('should accept exactly at limit', () => {
      const content = 'x'.repeat(100);
      const result = validateContentLength(content, 100);
      expect(result.valid).toBe(true);
    });
  });

  describe('ALLOWED_TAGS', () => {
    it('should include all safe HTML tags', () => {
      const expectedTags = [
        'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'span', 'div',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'a', 'blockquote', 'pre', 'code',
      ];
      
      expectedTags.forEach((tag) => {
        expect(ALLOWED_TAGS.has(tag)).toBe(true);
      });
    });

    it('should NOT include dangerous tags', () => {
      const dangerousTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'];
      
      dangerousTags.forEach((tag) => {
        expect(ALLOWED_TAGS.has(tag)).toBe(false);
      });
    });
  });
});
