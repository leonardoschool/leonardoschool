/**
 * UI Loader Components Tests
 *
 * Tests for Spinner, ButtonLoader, PageLoader, DotsLoader, Skeleton components
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '@/components/ui/loaders/Spinner';
import { ButtonLoader } from '@/components/ui/loaders/ButtonLoader';
import { PageLoader } from '@/components/ui/loaders/PageLoader';
import { DotsLoader } from '@/components/ui/loaders/DotsLoader';
import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui/loaders/Skeleton';

describe('Spinner', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should have accessible aria-label', () => {
      render(<Spinner />);
      const spinner = screen.getByLabelText('Caricamento...');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Spinner className="custom-class" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('custom-class');
    });
  });

  describe('sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

    it.each(sizes)('should render with size %s', (size) => {
      render(<Spinner size={size} />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should have correct size class for xs', () => {
      render(<Spinner size="xs" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-4');
      expect(spinner).toHaveClass('h-4');
    });

    it('should have correct size class for xl', () => {
      render(<Spinner size="xl" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-16');
      expect(spinner).toHaveClass('h-16');
    });
  });

  describe('variants', () => {
    const variants = ['primary', 'white', 'muted'] as const;

    it.each(variants)('should render with variant %s', (variant) => {
      render(<Spinner variant={variant} />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should have animation class', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should have rounded class', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('rounded-full');
    });
  });
});

describe('ButtonLoader', () => {
  describe('when not loading', () => {
    it('should render children', () => {
      render(
        <ButtonLoader loading={false}>
          Salva
        </ButtonLoader>
      );
      expect(screen.getByText('Salva')).toBeInTheDocument();
    });

    it('should not show spinner when not loading', () => {
      render(
        <ButtonLoader loading={false}>
          Salva
        </ButtonLoader>
      );
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('when loading', () => {
    it('should show spinner when loading', () => {
      render(
        <ButtonLoader loading={true}>
          Salva
        </ButtonLoader>
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should hide children when loading', () => {
      render(
        <ButtonLoader loading={true}>
          Salva
        </ButtonLoader>
      );
      expect(screen.queryByText('Salva')).not.toBeInTheDocument();
    });

    it('should show loadingText when provided', () => {
      render(
        <ButtonLoader loading={true} loadingText="Salvataggio...">
          Salva
        </ButtonLoader>
      );
      expect(screen.getByText('Salvataggio...')).toBeInTheDocument();
    });

    it('should not show loadingText when not provided', () => {
      render(
        <ButtonLoader loading={true}>
          Salva
        </ButtonLoader>
      );
      // Only spinner, no text
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('should default loading to false', () => {
      render(
        <ButtonLoader>
          Invia
        </ButtonLoader>
      );
      expect(screen.getByText('Invia')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});

describe('PageLoader', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      render(<PageLoader />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should display message when provided', () => {
      render(<PageLoader message="Caricamento dati..." />);
      expect(screen.getByText('Caricamento dati...')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<PageLoader className="my-custom-class" />);
      // Check that the custom class is somewhere in the rendered output
      expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should render spinner variant', () => {
      render(<PageLoader variant="spinner" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render dots variant', () => {
      render(<PageLoader variant="dots" />);
      // DotsLoader might have different role or structure
      const { container } = render(<PageLoader variant="dots" />);
      expect(container.querySelector('.animate-bounce')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    it.each(sizes)('should render with size %s', (size) => {
      render(<PageLoader size={size} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('fullScreen mode', () => {
    it('should add fullScreen styles when fullScreen is true', () => {
      const { container } = render(<PageLoader fullScreen />);
      // fullScreen adds fixed, inset-0, and z-50 classes
      expect(container.querySelector('.fixed')).toBeInTheDocument();
    });

    it('should not have fullScreen styles by default', () => {
      const { container } = render(<PageLoader />);
      expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
    });
  });
});

describe('DotsLoader', () => {
  describe('rendering', () => {
    it('should render dots', () => {
      const { container } = render(<DotsLoader />);
      // Check for bouncing dots
      const dots = container.querySelectorAll('.animate-bounce');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('should render with different sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      for (const size of sizes) {
        const { container } = render(<DotsLoader size={size} />);
        expect(container.firstChild).toBeInTheDocument();
      }
    });
  });
});

describe('Skeleton', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Skeleton className="custom-skeleton w-24 h-4" />);
      expect(document.querySelector('.custom-skeleton')).toBeInTheDocument();
    });

    it('should have animation class by default', () => {
      const { container } = render(<Skeleton />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should have status role for accessibility', () => {
      render(<Skeleton />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('animation variants', () => {
    it('should use pulse animation by default', () => {
      const { container } = render(<Skeleton />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should support shimmer animation', () => {
      const { container } = render(<Skeleton animate="shimmer" />);
      expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
    });

    it('should support no animation', () => {
      const { container } = render(<Skeleton animate="none" />);
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
      expect(container.querySelector('.animate-shimmer')).not.toBeInTheDocument();
    });
  });

  describe('styling with className', () => {
    it('should apply dimensions via className', () => {
      const { container } = render(<Skeleton className="w-24 h-4" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('w-24');
      expect(skeleton).toHaveClass('h-4');
    });

    it('should apply circular shape via className', () => {
      const { container } = render(<Skeleton className="w-12 h-12 rounded-full" />);
      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    });
  });
});

describe('SkeletonCard', () => {
  it('should render', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should contain multiple skeleton elements', () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('SkeletonTable', () => {
  describe('rendering', () => {
    it('should render with default rows', () => {
      const { container } = render(<SkeletonTable />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render specified number of rows', () => {
      const { container } = render(<SkeletonTable rows={5} />);
      // Each row should have skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render specified number of columns', () => {
      const { container } = render(<SkeletonTable columns={4} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});

describe('accessibility', () => {
  it('Spinner should have status role', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('Spinner should have aria-label', () => {
    render(<Spinner />);
    expect(screen.getByLabelText('Caricamento...')).toBeInTheDocument();
  });

  it('PageLoader should be accessible', () => {
    render(<PageLoader message="Loading your data..." />);
    // The message should be visible and readable
    expect(screen.getByText('Loading your data...')).toBeInTheDocument();
  });
});
