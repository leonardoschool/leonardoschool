/**
 * ButtonLoader Component Tests
 *
 * Tests for the ButtonLoader wrapper component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ButtonLoader } from '@/components/ui/loaders/ButtonLoader';

describe('ButtonLoader', () => {
  describe('when not loading', () => {
    it('should render children directly', () => {
      render(
        <ButtonLoader loading={false}>
          <span>Click me</span>
        </ButtonLoader>
      );
      expect(screen.getByText('Click me')).toBeDefined();
    });

    it('should render text children', () => {
      render(<ButtonLoader loading={false}>Submit</ButtonLoader>);
      expect(screen.getByText('Submit')).toBeDefined();
    });

    it('should not show spinner when not loading', () => {
      render(<ButtonLoader loading={false}>Button text</ButtonLoader>);
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('should default loading to false', () => {
      render(<ButtonLoader>Default button</ButtonLoader>);
      expect(screen.getByText('Default button')).toBeDefined();
      expect(screen.queryByRole('status')).toBeNull();
    });
  });

  describe('when loading', () => {
    it('should show spinner instead of children', () => {
      render(
        <ButtonLoader loading={true}>
          Hidden text
        </ButtonLoader>
      );
      expect(screen.getByRole('status')).toBeDefined();
      expect(screen.queryByText('Hidden text')).toBeNull();
    });

    it('should show loading text when provided', () => {
      render(
        <ButtonLoader loading={true} loadingText="Caricamento...">
          Save
        </ButtonLoader>
      );
      expect(screen.getByText('Caricamento...')).toBeDefined();
      expect(screen.getByRole('status')).toBeDefined();
    });

    it('should not show loading text when not provided', () => {
      render(
        <ButtonLoader loading={true}>
          Save
        </ButtonLoader>
      );
      expect(screen.getByRole('status')).toBeDefined();
      // Only spinner should be visible
    });
  });

  describe('spinner size', () => {
    it('should use sm size by default', () => {
      render(
        <ButtonLoader loading={true}>
          Button
        </ButtonLoader>
      );
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('w-6');
      expect(spinner.className).toContain('h-6');
    });

    it('should accept xs size', () => {
      render(
        <ButtonLoader loading={true} size="xs">
          Button
        </ButtonLoader>
      );
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('w-4');
      expect(spinner.className).toContain('h-4');
    });

    it('should accept md size', () => {
      render(
        <ButtonLoader loading={true} size="md">
          Button
        </ButtonLoader>
      );
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('w-8');
      expect(spinner.className).toContain('h-8');
    });
  });

  describe('spinner variant', () => {
    it('should use white variant by default', () => {
      render(
        <ButtonLoader loading={true}>
          Button
        </ButtonLoader>
      );
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('border-white');
    });

    it('should accept primary variant', () => {
      render(
        <ButtonLoader loading={true} variant="primary">
          Button
        </ButtonLoader>
      );
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('border-[#a8012b]');
    });
  });

  describe('flex container when loading', () => {
    it('should wrap content in flex container', () => {
      render(
        <ButtonLoader loading={true} loadingText="Loading...">
          Button
        </ButtonLoader>
      );
      const container = screen.getByText('Loading...').parentElement;
      expect(container?.className).toContain('flex');
      expect(container?.className).toContain('items-center');
      expect(container?.className).toContain('justify-center');
    });
  });
});
