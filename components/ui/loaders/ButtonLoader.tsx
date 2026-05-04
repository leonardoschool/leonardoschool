'use client';

import { Spinner } from './Spinner';

interface ButtonLoaderProps {
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Button content when not loading */
  children: React.ReactNode;
  /** Loading text to show (optional) */
  loadingText?: string;
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md';
  /** Spinner color variant */
  variant?: 'white' | 'primary';
}

/**
 * ButtonLoader - Wrapper for button content with loading state
 * Replaces button content with spinner and optional loading text
 * 
 * @example
 * <button disabled={loading}>
 *   <ButtonLoader loading={loading}>
 *     Salva
 *   </ButtonLoader>
 * </button>
 * 
 * <button disabled={loading}>
 *   <ButtonLoader loading={loading} loadingText="Salvataggio...">
 *     Salva
 *   </ButtonLoader>
 * </button>
 */
export function ButtonLoader({ 
  loading = false, 
  children, 
  loadingText,
  size = 'sm',
  variant = 'white'
}: ButtonLoaderProps) {
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <span className="flex items-center justify-center gap-2">
      <Spinner size={size} variant={variant} />
      {loadingText && <span>{loadingText}</span>}
    </span>
  );
}

export default ButtonLoader;
