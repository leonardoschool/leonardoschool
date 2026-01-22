/**
 * Button Component Tests
 *
 * Tests for the Button UI component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  describe('rendering', () => {
    it('should render with children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toBeDefined();
      expect(screen.getByText('Click me')).toBeDefined();
    });

    it('should render as a button element', () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole('button').tagName).toBe('BUTTON');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Button ref={ref}>Ref test</Button>);
      expect(ref.current).toBeDefined();
      expect(ref.current?.tagName).toBe('BUTTON');
    });
  });

  describe('variants', () => {
    it('should apply primary variant by default', () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-gradient-to-r');
      expect(button.className).toContain('from-red-600');
      expect(button.className).toContain('text-white');
    });

    it('should apply secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-white');
      expect(button.className).toContain('text-red-600');
      expect(button.className).toContain('border-2');
    });

    it('should apply outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-transparent');
      expect(button.className).toContain('text-white');
      expect(button.className).toContain('border-2');
    });

    it('should apply ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-transparent');
      expect(button.className).toContain('text-gray-700');
    });
  });

  describe('sizes', () => {
    it('should apply md size by default', () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-6');
      expect(button.className).toContain('py-3');
      expect(button.className).toContain('text-base');
    });

    it('should apply sm size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('py-2');
      expect(button.className).toContain('text-sm');
    });

    it('should apply lg size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('px-8');
      expect(button.className).toContain('py-4');
      expect(button.className).toContain('text-lg');
    });
  });

  describe('styling', () => {
    it('should have base styles', () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('inline-flex');
      expect(button.className).toContain('items-center');
      expect(button.className).toContain('justify-center');
      expect(button.className).toContain('font-medium');
      expect(button.className).toContain('transition-all');
      expect(button.className).toContain('rounded-full');
    });

    it('should apply custom className', () => {
      render(<Button className="my-custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('my-custom-class');
    });

    it('should merge custom className with defaults', () => {
      render(<Button className="extra-padding" variant="primary" size="lg">Merged</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('extra-padding');
      expect(button.className).toContain('px-8'); // lg size
      expect(button.className).toContain('from-red-600'); // primary variant
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button.hasAttribute('disabled')).toBe(true);
    });

    it('should have disabled styles', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('disabled:opacity-50');
      expect(button.className).toContain('disabled:cursor-not-allowed');
    });

    it('should not call onClick when disabled', () => {
      const onClick = vi.fn();
      render(<Button disabled onClick={onClick}>Click</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('interaction', () => {
    it('should call onClick when clicked', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click me</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should pass event to onClick handler', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click me</Button>);
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('button types', () => {
    it('should accept type="submit"', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('submit');
    });

    it('should accept type="button"', () => {
      render(<Button type="button">Button</Button>);
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('button');
    });

    it('should accept type="reset"', () => {
      render(<Button type="reset">Reset</Button>);
      const button = screen.getByRole('button');
      expect(button.getAttribute('type')).toBe('reset');
    });
  });

  describe('HTML attributes', () => {
    it('should spread additional props', () => {
      render(<Button data-testid="test-button" aria-label="Test button">Test</Button>);
      const button = screen.getByTestId('test-button');
      expect(button.getAttribute('aria-label')).toBe('Test button');
    });

    it('should accept id attribute', () => {
      render(<Button id="submit-btn">Submit</Button>);
      expect(document.getElementById('submit-btn')).toBeDefined();
    });

    it('should accept name attribute', () => {
      render(<Button name="action-button">Action</Button>);
      const button = screen.getByRole('button');
      expect(button.getAttribute('name')).toBe('action-button');
    });
  });

  describe('displayName', () => {
    it('should have displayName for debugging', () => {
      expect(Button.displayName).toBe('Button');
    });
  });
});
