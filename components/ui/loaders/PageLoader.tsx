'use client';

import { colors } from '@/lib/theme/colors';
import { Spinner } from './Spinner';
import { DotsLoader } from './DotsLoader';

type LoaderVariant = 'spinner' | 'dots' | 'pulse';
type LoaderSize = 'sm' | 'md' | 'lg';

interface PageLoaderProps {
  /** Loading message to display */
  message?: string;
  /** Loader visual style */
  variant?: LoaderVariant;
  /** Size of the loader */
  size?: LoaderSize;
  /** Whether to show full screen overlay */
  fullScreen?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * PageLoader - Full page or section loading component
 * Used for page transitions and data loading states
 * 
 * @example
 * <PageLoader /> // Default centered spinner
 * <PageLoader message="Caricamento dati..." variant="dots" />
 * <PageLoader fullScreen /> // Full screen overlay
 */
export function PageLoader({ 
  message, 
  variant = 'spinner', 
  size = 'lg',
  fullScreen = false,
  className = '' 
}: PageLoaderProps) {
  const sizeMap = {
    sm: { spinner: 'md' as const, dots: 'sm' as const },
    md: { spinner: 'lg' as const, dots: 'md' as const },
    lg: { spinner: 'xl' as const, dots: 'lg' as const },
  };

  const content = (
    <div className="text-center">
      {variant === 'spinner' && (
        <Spinner size={sizeMap[size].spinner} className="mx-auto" />
      )}
      
      {variant === 'dots' && (
        <DotsLoader size={sizeMap[size].dots} />
      )}
      
      {variant === 'pulse' && (
        <div className="flex justify-center">
          <div className={`
            ${size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : 'w-16 h-16'}
            rounded-full bg-[#a8012b]/20 animate-ping
          `} />
        </div>
      )}
      
      {message && (
        <p className={`mt-4 text-sm font-medium ${colors.text.secondary}`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`
        fixed inset-0 z-50 
        flex items-center justify-center 
        bg-white/80 dark:bg-slate-900/80 
        backdrop-blur-sm
        ${className}
      `}>
        {content}
      </div>
    );
  }

  return (
    <div className={`
      flex items-center justify-center 
      min-h-[200px] w-full
      ${className}
    `}>
      {content}
    </div>
  );
}

export default PageLoader;
