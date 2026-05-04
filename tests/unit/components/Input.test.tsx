/**
 * Input Component Tests
 *
 * Tests for the Input UI component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '@/components/ui/Input';

describe('Input', () => {
  describe('rendering', () => {
    it('should render an input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeDefined();
    });

    it('should render inside a wrapper div', () => {
      const { container } = render(<Input />);
      const wrapper = container.firstChild as HTMLDivElement;
      expect(wrapper.className).toContain('w-full');
    });

    it('should forward ref correctly', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);
      expect(ref.current).toBeDefined();
      expect(ref.current?.tagName).toBe('INPUT');
    });
  });

  describe('base styles', () => {
    it('should have full width', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('w-full');
    });

    it('should have proper padding', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('px-4');
      expect(input.className).toContain('py-3');
    });

    it('should have rounded corners', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('rounded-lg');
    });

    it('should have border', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border');
    });

    it('should have transitions', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('transition-colors');
    });
  });

  describe('focus styles', () => {
    it('should have focus ring styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('focus:outline-none');
      expect(input.className).toContain('focus:ring-2');
      expect(input.className).toContain('focus:ring-red-500');
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.disabled).toBe(true);
    });

    it('should have disabled styles', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('disabled:bg-gray-100');
      expect(input.className).toContain('disabled:cursor-not-allowed');
    });
  });

  describe('error state', () => {
    it('should display error message', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeDefined();
    });

    it('should have error styles on input', () => {
      render(<Input error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-red-500');
      expect(input.className).toContain('bg-red-50');
    });

    it('should have error message styling', () => {
      render(<Input error="Campo obbligatorio" />);
      const errorMessage = screen.getByText('Campo obbligatorio');
      expect(errorMessage.className).toContain('text-sm');
      expect(errorMessage.className).toContain('text-red-600');
    });

    it('should not show error message when no error', () => {
      render(<Input />);
      expect(screen.queryByRole('paragraph')).toBeNull();
    });

    it('should have normal border when no error', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-gray-300');
    });
  });

  describe('custom className', () => {
    it('should apply custom className to input', () => {
      render(<Input className="custom-input-class" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('custom-input-class');
    });

    it('should merge custom and default classes', () => {
      render(<Input className="extra-margin" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('extra-margin');
      expect(input.className).toContain('w-full');
      expect(input.className).toContain('px-4');
    });
  });

  describe('input types', () => {
    it('should accept type="text"', () => {
      render(<Input type="text" />);
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('type')).toBe('text');
    });

    it('should accept type="email"', () => {
      render(<Input type="email" />);
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('type')).toBe('email');
    });

    it('should accept type="password"', () => {
      render(<Input type="password" />);
      // Password inputs don't have textbox role
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeDefined();
    });

    it('should accept type="number"', () => {
      render(<Input type="number" />);
      const input = screen.getByRole('spinbutton');
      expect(input.getAttribute('type')).toBe('number');
    });

    it('should accept type="tel"', () => {
      render(<Input type="tel" />);
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('type')).toBe('tel');
    });
  });

  describe('value and onChange', () => {
    it('should display value', () => {
      render(<Input value="Test value" onChange={() => {}} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Test value');
    });

    it('should call onChange when value changes', () => {
      const onChange = vi.fn();
      render(<Input onChange={onChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('should pass event to onChange handler', () => {
      const onChange = vi.fn();
      render(<Input onChange={onChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test' } });
      expect(onChange).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('placeholder', () => {
    it('should display placeholder', () => {
      render(<Input placeholder="Enter your name" />);
      const input = screen.getByPlaceholderText('Enter your name');
      expect(input).toBeDefined();
    });
  });

  describe('HTML attributes', () => {
    it('should accept name attribute', () => {
      render(<Input name="email" />);
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('name')).toBe('email');
    });

    it('should accept id attribute', () => {
      render(<Input id="email-input" />);
      expect(document.getElementById('email-input')).toBeDefined();
    });

    it('should accept required attribute', () => {
      render(<Input required />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.required).toBe(true);
    });

    it('should accept maxLength attribute', () => {
      render(<Input maxLength={100} />);
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('maxLength')).toBe('100');
    });

    it('should accept readOnly attribute', () => {
      render(<Input readOnly />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.readOnly).toBe(true);
    });

    it('should accept aria attributes', () => {
      render(<Input aria-label="Email address" aria-describedby="email-hint" />);
      const input = screen.getByRole('textbox');
      expect(input.getAttribute('aria-label')).toBe('Email address');
      expect(input.getAttribute('aria-describedby')).toBe('email-hint');
    });

    it('should accept data-* attributes', () => {
      render(<Input data-testid="custom-input" />);
      expect(screen.getByTestId('custom-input')).toBeDefined();
    });
  });

  describe('displayName', () => {
    it('should have displayName for debugging', () => {
      expect(Input.displayName).toBe('Input');
    });
  });

  describe('focus behavior', () => {
    it('should focus when focus() is called on ref', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} />);
      
      ref.current?.focus();
      expect(document.activeElement).toBe(ref.current);
    });
  });
});
