/**
 * Leonardo School Mobile - Loader Components
 * 
 * Componenti per stati di caricamento.
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme/colors';
import { Text } from './Text';
import { useThemedColors } from '../../contexts/ThemeContext';
import { spacing } from '../../lib/theme/spacing';

// ==================== SPINNER ====================

type SpinnerSize = 'small' | 'large';
type SpinnerVariant = 'primary' | 'white' | 'muted';

interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
}

export function Spinner({ size = 'large', variant = 'primary' }: SpinnerProps) {
  const themedColors = useThemedColors();

  const colorMap = {
    primary: colors.primary.main,
    white: '#FFFFFF',
    muted: themedColors.textMuted,
  };

  return <ActivityIndicator size={size} color={colorMap[variant]} />;
}

// ==================== PAGE LOADER ====================

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message }: PageLoaderProps) {
  const themedColors = useThemedColors();

  return (
    <View style={[styles.pageLoader, { backgroundColor: themedColors.background }]}>
      <Spinner size="large" variant="primary" />
      {message && (
        <Text variant="body" color="muted" style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );
}

// ==================== BUTTON LOADER ====================

interface ButtonLoaderProps {
  loading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function ButtonLoader({ loading, loadingText, children }: ButtonLoaderProps) {
  if (loading) {
    return (
      <View style={styles.buttonLoader}>
        <Spinner size="small" variant="white" />
        {loadingText && (
          <Text variant="button" style={styles.buttonLoaderText}>
            {loadingText}
          </Text>
        )}
      </View>
    );
  }
  return <>{children}</>;
}

// ==================== SKELETON ====================

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const themedColors = useThemedColors();

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: themedColors.isDark ? '#2D3748' : '#E2E8F0',
        },
        style,
      ]}
    />
  );
}

// ==================== SKELETON CARD ====================

export function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <Skeleton height={120} style={styles.skeletonCardImage} />
      <View style={styles.skeletonCardContent}>
        <Skeleton width="80%" height={16} />
        <Skeleton width="60%" height={14} style={styles.skeletonCardSubtitle} />
      </View>
    </View>
  );
}

// ==================== INLINE LOADER ====================

interface InlineLoaderProps {
  text?: string;
}

export function InlineLoader({ text = 'Caricamento...' }: InlineLoaderProps) {
  return (
    <View style={styles.inlineLoader}>
      <Spinner size="small" variant="primary" />
      <Text variant="bodySmall" color="muted" style={styles.inlineLoaderText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: spacing[4],
  },
  buttonLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLoaderText: {
    marginLeft: spacing[2],
    color: '#FFFFFF',
  },
  skeleton: {
    opacity: 0.7,
  },
  skeletonCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  skeletonCardImage: {
    borderRadius: 0,
  },
  skeletonCardContent: {
    padding: spacing[3],
  },
  skeletonCardSubtitle: {
    marginTop: spacing[2],
  },
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
  },
  inlineLoaderText: {
    marginLeft: spacing[2],
  },
});

// Export Loader as alias for Spinner for convenience
export { Spinner as Loader };
export { Spinner as default };
