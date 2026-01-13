'use client';

interface DotsLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const dotSizes = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2.5 h-2.5',
  lg: 'w-3.5 h-3.5',
};

/**
 * DotsLoader - Animated bouncing dots loader
 * Modern, minimal design matching Leonardo School brand
 * 
 * @example
 * <DotsLoader /> // Default medium size
 * <DotsLoader size="lg" /> // Large dots
 */
export function DotsLoader({ size = 'md', className = '' }: DotsLoaderProps) {
  const dotClass = `${dotSizes[size]} rounded-full bg-[#a8012b]`;
  
  return (
    <div className={`flex justify-center items-center gap-1.5 ${className}`} role="status" aria-label="Caricamento...">
      <div 
        className={`${dotClass} animate-bounce`} 
        style={{ animationDelay: '0ms', animationDuration: '600ms' }}
      />
      <div 
        className={`${dotClass} animate-bounce`} 
        style={{ animationDelay: '150ms', animationDuration: '600ms' }}
      />
      <div 
        className={`${dotClass} animate-bounce`} 
        style={{ animationDelay: '300ms', animationDuration: '600ms' }}
      />
    </div>
  );
}

export default DotsLoader;
