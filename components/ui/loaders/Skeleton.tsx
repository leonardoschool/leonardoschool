'use client';

import { colors } from '@/lib/theme/colors';

interface SkeletonProps {
  className?: string;
  /** Animation type */
  animate?: 'pulse' | 'shimmer' | 'none';
}

/**
 * Skeleton - Placeholder loading element
 * Use for content that will be replaced with actual data
 * 
 * @example
 * <Skeleton className="w-24 h-4" /> // Text placeholder
 * <Skeleton className="w-12 h-12 rounded-full" /> // Avatar placeholder
 */
export function Skeleton({ className = '', animate = 'pulse' }: SkeletonProps) {
  const animationClass = animate === 'pulse' 
    ? 'animate-pulse' 
    : animate === 'shimmer' 
      ? 'animate-shimmer' 
      : '';
      
  return (
    <div 
      className={`
        bg-gray-200 dark:bg-slate-700 
        rounded
        ${animationClass}
        ${className}
      `}
      role="status"
      aria-label="Caricamento..."
    />
  );
}

interface SkeletonCardProps {
  /** Show avatar placeholder */
  avatar?: boolean;
  /** Number of text lines */
  lines?: number;
  className?: string;
}

/**
 * SkeletonCard - Pre-built card skeleton
 * Commonly used for list items, cards, etc.
 */
export function SkeletonCard({ avatar = false, lines = 3, className = '' }: SkeletonCardProps) {
  return (
    <div className={`${colors.background.card} rounded-xl p-4 ${className}`}>
      <div className="flex gap-4">
        {avatar && (
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        )}
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <Skeleton key={i} className={`h-3 ${i === lines - 2 ? 'w-1/2' : 'w-full'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  className?: string;
}

/**
 * SkeletonTable - Pre-built table skeleton
 * Used for data tables while loading
 */
export function SkeletonTable({ rows = 5, columns = 4, className = '' }: SkeletonTableProps) {
  return (
    <div className={`${colors.background.card} rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-gray-200 dark:border-slate-700">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div 
          key={rowIdx} 
          className="flex gap-4 p-4 border-b border-gray-100 dark:border-slate-800 last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton 
              key={colIdx} 
              className={`h-4 flex-1 ${colIdx === 0 ? 'w-1/4' : ''}`} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
