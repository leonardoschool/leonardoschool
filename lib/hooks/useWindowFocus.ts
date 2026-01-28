/**
 * Hook to detect window/tab focus state
 * 
 * Used to optimize polling - stops polling when user is not actively viewing the page.
 * This significantly reduces serverless function invocations on Vercel.
 * 
 * @example
 * const isFocused = useWindowFocus();
 * 
 * trpc.notifications.getNotifications.useQuery(undefined, {
 *   refetchInterval: isFocused ? 60000 : false, // Only poll when focused
 * });
 */

import { useState, useEffect } from 'react';

/**
 * Returns true if the browser window/tab is currently focused
 * Returns true during SSR to avoid hydration mismatch
 */
export function useWindowFocus(): boolean {
  // Default to true for SSR
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    // Set initial state based on document visibility
    setIsFocused(document.visibilityState === 'visible');

    const handleVisibilityChange = () => {
      setIsFocused(document.visibilityState === 'visible');
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    // Listen to visibility changes (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Also listen to window focus/blur (alt-tabbing)
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return isFocused;
}

/**
 * Returns a polling interval that respects window focus
 * When unfocused, returns false to disable polling
 * 
 * @param intervalMs - The polling interval in milliseconds when focused
 * @param enablePolling - Additional condition to enable polling (default: true)
 * @returns The interval when focused and enabled, false otherwise
 * 
 * @example
 * const pollingInterval = useFocusAwarePolling(60000, !!user);
 * 
 * trpc.notifications.getNotifications.useQuery(undefined, {
 *   refetchInterval: pollingInterval,
 * });
 */
export function useFocusAwarePolling(
  intervalMs: number,
  enablePolling: boolean = true
): number | false {
  const isFocused = useWindowFocus();
  return isFocused && enablePolling ? intervalMs : false;
}

export default useWindowFocus;
