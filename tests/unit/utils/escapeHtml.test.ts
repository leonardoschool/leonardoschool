/**
 * Tests for escapeHtml utility
 */
import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeText } from '@/lib/utils/escapeHtml';

describe('escapeHtml', () => {
  describe('escapeHtml', () => {
    describe('basic escaping', () => {
      it('should escape ampersand', () => {
        expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
      });

      it('should escape less than', () => {
        expect(escapeHtml('5 < 10')).toBe('5 &lt; 10');
      });

      it('should escape greater than', () => {
        expect(escapeHtml('10 > 5')).toBe('10 &gt; 5');
      });

      it('should escape double quotes', () => {
        expect(escapeHtml('Say "Hello"')).toBe('Say &quot;Hello&quot;');
      });

      it('should escape single quotes', () => {
        expect(escapeHtml("It's fine")).toBe('It&#39;s fine');
      });
    });

    describe('multiple characters', () => {
      it('should escape all special characters', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe(
          '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        );
      });

      it('should escape HTML attributes', () => {
        expect(escapeHtml('class="test" onclick=\'evil()\'')).toBe(
          'class=&quot;test&quot; onclick=&#39;evil()&#39;'
        );
      });

      it('should escape mixed content', () => {
        expect(escapeHtml('5 > 3 && 3 < 5')).toBe('5 &gt; 3 &amp;&amp; 3 &lt; 5');
      });
    });

    describe('no escaping needed', () => {
      it('should return unchanged plain text', () => {
        expect(escapeHtml('Hello World')).toBe('Hello World');
      });

      it('should return unchanged numbers', () => {
        expect(escapeHtml('12345')).toBe('12345');
      });

      it('should preserve special characters that are safe', () => {
        expect(escapeHtml('test@example.com')).toBe('test@example.com');
        expect(escapeHtml('a_b-c.d')).toBe('a_b-c.d');
      });

      it('should handle empty string', () => {
        expect(escapeHtml('')).toBe('');
      });
    });

    describe('edge cases', () => {
      it('should handle only special characters', () => {
        expect(escapeHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#39;');
      });

      it('should handle consecutive special characters', () => {
        expect(escapeHtml('<<>>')).toBe('&lt;&lt;&gt;&gt;');
        expect(escapeHtml('&&&&')).toBe('&amp;&amp;&amp;&amp;');
      });

      it('should handle unicode characters', () => {
        expect(escapeHtml('Café <script>')).toBe('Café &lt;script&gt;');
      });

      it('should handle emojis', () => {
        expect(escapeHtml('Hello 👋 <World>')).toBe('Hello 👋 &lt;World&gt;');
      });

      it('should handle newlines and tabs', () => {
        expect(escapeHtml('Line1\nLine2\t<tag>')).toBe('Line1\nLine2\t&lt;tag&gt;');
      });
    });

    describe('XSS prevention', () => {
      it('should prevent script injection', () => {
        const malicious = '<script>document.cookie</script>';
        const escaped = escapeHtml(malicious);
        expect(escaped).not.toContain('<script>');
        expect(escaped).toBe('&lt;script&gt;document.cookie&lt;/script&gt;');
      });

      it('should prevent event handler injection', () => {
        const malicious = '<img onerror="alert(1)">';
        const escaped = escapeHtml(malicious);
        expect(escaped).toBe('&lt;img onerror=&quot;alert(1)&quot;&gt;');
      });

      it('should prevent attribute injection', () => {
        const malicious = '" onclick="evil()" data-x="';
        const escaped = escapeHtml(malicious);
        expect(escaped).not.toContain('"');
        expect(escaped).toBe('&quot; onclick=&quot;evil()&quot; data-x=&quot;');
      });

      it('should prevent template literal injection', () => {
        const malicious = '${document.cookie}';
        expect(escapeHtml(malicious)).toBe('${document.cookie}');
      });
    });
  });

  describe('sanitizeText', () => {
    describe('basic functionality', () => {
      it('should escape HTML in text', () => {
        expect(sanitizeText('<script>alert(1)</script>')).toBe(
          '&lt;script&gt;alert(1)&lt;/script&gt;'
        );
      });

      it('should handle normal text', () => {
        expect(sanitizeText('Hello World')).toBe('Hello World');
      });
    });

    describe('null and undefined handling', () => {
      it('should return empty string for null', () => {
        expect(sanitizeText(null)).toBe('');
      });

      it('should return empty string for undefined', () => {
        expect(sanitizeText(undefined)).toBe('');
      });

      it('should handle empty string', () => {
        expect(sanitizeText('')).toBe('');
      });
    });

    describe('type coercion', () => {
      it('should convert value to string', () => {
        // @ts-expect-error - testing type coercion
        expect(sanitizeText(123)).toBe('123');
      });

      it('should handle objects with toString', () => {
        const obj = { toString: () => '<script>evil</script>' };
        // @ts-expect-error - testing type coercion
        expect(sanitizeText(obj)).toBe('&lt;script&gt;evil&lt;/script&gt;');
      });
    });

    describe('security scenarios', () => {
      it('should sanitize user input', () => {
        const userInput = '<img src=x onerror=alert(1)>';
        expect(sanitizeText(userInput)).toBe(
          '&lt;img src=x onerror=alert(1)&gt;'
        );
      });

      it('should sanitize form data', () => {
        const formData = '"><script>alert(document.domain)</script>';
        const result = sanitizeText(formData);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('>');
      });

      it('should sanitize URL parameters', () => {
        const param = '"><a href="javascript:alert(1)">click</a>';
        const result = sanitizeText(param);
        // escapeHtml only escapes HTML entities, doesn't remove javascript:
        expect(result).not.toContain('<a');
        expect(result).not.toContain('>click');
        // The javascript: text is preserved but < > are escaped
        expect(result).toContain('&lt;a href=');
      });
    });
  });
});
