/**
 * Leonardo School Mobile - Badge Component
 * 
 * Badge per mostrare stati, contatori, materie.
 * Le materie usano sempre colori dinamici dal database.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { 
  colors, 
  getSubjectColor
} from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'subject';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Colore della materia dal database (es. "#FF5733") */
  subjectColor?: string | null;
  outlined?: boolean;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  subjectColor,
  outlined = false,
}: BadgeProps) {
  const sizeStyles = {
    sm: {
      paddingHorizontal: spacing[1.5],
      paddingVertical: spacing[0.5],
      borderRadius: layout.borderRadius.sm,
    },
    md: {
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[1],
      borderRadius: layout.borderRadius.md,
    },
    lg: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1.5],
      borderRadius: layout.borderRadius.lg,
    },
  };

  const textSizeMap = {
    sm: 'caption' as const,
    md: 'caption' as const,
    lg: 'bodySmall' as const,
  };

  const getColors = () => {
    if (variant === 'subject' && subjectColor) {
      // Colore dinamico dalla materia (database)
      const mainColor = getSubjectColor(subjectColor, 'main');
      const lightColor = getSubjectColor(subjectColor, 'light');
      return {
        bg: outlined ? 'transparent' : lightColor,
        text: mainColor,
        border: mainColor,
      };
    }

    const variantColors = {
      default: {
        bg: colors.neutral[100],
        text: colors.neutral[700],
        border: colors.neutral[300],
      },
      primary: {
        bg: colors.primary.main + '20', // 20% opacity
        text: colors.primary.main,
        border: colors.primary.main,
      },
      success: {
        bg: colors.status.success.light,
        text: colors.status.success.text,
        border: colors.status.success.main,
      },
      warning: {
        bg: colors.status.warning.light,
        text: colors.status.warning.text,
        border: colors.status.warning.main,
      },
      error: {
        bg: colors.status.error.light,
        text: colors.status.error.text,
        border: colors.status.error.main,
      },
      info: {
        bg: colors.status.info.light,
        text: colors.status.info.text,
        border: colors.status.info.main,
      },
      subject: {
        bg: colors.neutral[100],
        text: colors.neutral[700],
        border: colors.neutral[300],
      },
    };

    return variantColors[variant];
  };

  const badgeColors = getColors();

  return (
    <View
      style={[
        styles.badge,
        sizeStyles[size],
        {
          backgroundColor: outlined ? 'transparent' : badgeColors.bg,
          borderWidth: outlined ? 1 : 0,
          borderColor: badgeColors.border,
        },
      ]}
    >
      <Text
        variant={textSizeMap[size]}
        style={{ color: badgeColors.text, fontWeight: '600' }}
      >
        {children}
      </Text>
    </View>
  );
}

// ==================== SUBJECT BADGE ====================

/**
/**
 * SubjectBadge per materie dinamiche dal database
 * 
 * Uso:
 * <DynamicSubjectBadge subject={customSubject} />
 * <SubjectBadge subject={customSubject} /> // alias
 */

/** Badge per materie dal database con colore dinamico */
interface DynamicSubjectBadgeProps {
  subject: {
    name: string;
    code?: string;
    color?: string | null;
  };
  size?: BadgeSize;
  showLabel?: boolean;
}

export function DynamicSubjectBadge({ 
  subject, 
  size = 'md', 
  showLabel = true 
}: DynamicSubjectBadgeProps) {
  return (
    <Badge variant="subject" subjectColor={subject.color} size={size}>
      {showLabel ? subject.name : (subject.code || subject.name).charAt(0)}
    </Badge>
  );
}

/**
 * SubjectBadge - alias per DynamicSubjectBadge
 * Usato per materie dinamiche dal database
 */
export const SubjectBadge = DynamicSubjectBadge;

// ==================== COUNT BADGE ====================

// Notification count badge
interface CountBadgeProps {
  count: number;
  maxCount?: number;
}

export function CountBadge({ count, maxCount = 99 }: CountBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <View style={styles.countBadge}>
      <Text variant="caption" style={styles.countBadgeText}>
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  countBadge: {
    backgroundColor: colors.status.error.main,
    borderRadius: layout.borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[1],
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default Badge;
