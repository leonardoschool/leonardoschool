/**
 * Leonardo School - Loader Components
 * 
 * Unified loading components for the entire application.
 * Use these components consistently across all pages and features.
 * 
 * @example
 * // Page/section loading
 * import { PageLoader } from '@/components/ui/loaders';
 * if (isLoading) return <PageLoader message="Caricamento..." />;
 * 
 * // Button loading state
 * import { ButtonLoader } from '@/components/ui/loaders';
 * <button disabled={loading}>
 *   <ButtonLoader loading={loading}>Salva</ButtonLoader>
 * </button>
 * 
 * // Simple spinner
 * import { Spinner } from '@/components/ui/loaders';
 * <Spinner size="sm" />
 * 
 * // Inline loading (skeleton)
 * import { Skeleton } from '@/components/ui/loaders';
 * <Skeleton className="w-32 h-4" />
 */

export { Spinner } from './Spinner';
export { DotsLoader } from './DotsLoader';
export { PageLoader } from './PageLoader';
export { ButtonLoader } from './ButtonLoader';
export { Skeleton, SkeletonCard, SkeletonTable } from './Skeleton';
