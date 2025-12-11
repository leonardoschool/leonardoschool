'use client';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type SpinnerVariant = 'primary' | 'white' | 'muted';

interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'w-4 h-4 border-2',
  sm: 'w-6 h-6 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
  xl: 'w-16 h-16 border-4',
};

const variantClasses: Record<SpinnerVariant, string> = {
  primary: 'border-[#a8012b] border-t-transparent',
  white: 'border-white border-t-transparent',
  muted: 'border-gray-400 dark:border-gray-600 border-t-transparent',
};

/**
 * Spinner component - Simple circular loading indicator
 * 
 * @example
 * <Spinner /> // Default medium primary spinner
 * <Spinner size="lg" variant="white" /> // Large white spinner
 */
export function Spinner({ size = 'md', variant = 'primary', className = '' }: SpinnerProps) {
  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-full
        animate-spin
        ${className}
      `}
      role="status"
      aria-label="Caricamento..."
    />
  );
}

export default Spinner;
