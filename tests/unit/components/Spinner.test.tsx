/**
 * Spinner Component Tests
 *
 * Tests for the Spinner loading component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '@/components/ui/loaders/Spinner';

describe('Spinner', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeDefined();
      expect(spinner.getAttribute('aria-label')).toBe('Caricamento...');
    });

    it('should have spinning animation class', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('animate-spin');
    });

    it('should be rounded', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('rounded-full');
    });
  });

  describe('sizes', () => {
    it('should render xs size correctly', () => {
      render(<Spinner size="xs" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('w-4');
      expect(spinner.className).toContain('h-4');
    });

    it('should render sm size correctly', () => {
      render(<Spinner size="sm" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('w-6');
      expect(spinner.className).toContain('h-6');
    });

    it('should render md size correctly (default)', () => {
      render(<Spinner size="md" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('w-8');
      expect(spinner.className).toContain('h-8');
    });

    it('should render lg size correctly', () => {
      render(<Spinner size="lg" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('w-12');
      expect(spinner.className).toContain('h-12');
    });

    it('should render xl size correctly', () => {
      render(<Spinner size="xl" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('w-16');
      expect(spinner.className).toContain('h-16');
    });
  });

  describe('variants', () => {
    it('should render primary variant correctly (default)', () => {
      render(<Spinner variant="primary" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('border-[#a8012b]');
      expect(spinner.className).toContain('border-t-transparent');
    });

    it('should render white variant correctly', () => {
      render(<Spinner variant="white" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('border-white');
      expect(spinner.className).toContain('border-t-transparent');
    });

    it('should render muted variant correctly', () => {
      render(<Spinner variant="muted" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('border-gray-400');
      expect(spinner.className).toContain('border-t-transparent');
    });
  });

  describe('custom className', () => {
    it('should apply additional className', () => {
      render(<Spinner className="custom-spinner-class" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('custom-spinner-class');
    });

    it('should combine default and custom classes', () => {
      render(<Spinner size="lg" variant="white" className="my-custom-class" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('w-12');
      expect(spinner.className).toContain('border-white');
      expect(spinner.className).toContain('my-custom-class');
    });
  });

  describe('accessibility', () => {
    it('should have role="status" for screen readers', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeDefined();
    });

    it('should have aria-label for screen readers', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner.getAttribute('aria-label')).toBe('Caricamento...');
    });
  });
});
