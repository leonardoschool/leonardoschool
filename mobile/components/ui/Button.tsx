/**
 * Leonardo School Mobile - Button Component
 * 
 * Componente Button riutilizzabile con varianti e loading state.
 */

import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { colors } from '../../lib/theme/colors';
import { layout, spacing } from '../../lib/theme/spacing';
import { useThemedColors } from '../../contexts/ThemeContext';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  ...props
}: ButtonProps) {
  const themedColors = useThemedColors();
  
  const isDisabled = disabled || loading;

  const sizeStyles = {
    sm: {
      height: layout.button.sm,
      paddingHorizontal: spacing[3],
      borderRadius: layout.borderRadius.md,
    },
    md: {
      height: layout.button.md,
      paddingHorizontal: spacing[4],
      borderRadius: layout.borderRadius.lg,
    },
    lg: {
      height: layout.button.lg,
      paddingHorizontal: spacing[6],
      borderRadius: layout.borderRadius.lg,
    },
  };

  const textSizeVariant = {
    sm: 'buttonSmall' as const,
    md: 'button' as const,
    lg: 'buttonLarge' as const,
  };

  const getContent = () => (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#FFFFFF' : colors.primary.main}
          size="small"
        />
      ) : (
        <>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          <Text
            variant={textSizeVariant[size]}
            style={{
              color: getTextColor(),
            }}
          >
            {children}
          </Text>
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </>
      )}
    </View>
  );

  const getTextColor = () => {
    if (isDisabled) return colors.neutral[400];
    
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return themedColors.text;
      case 'outline':
      case 'ghost':
        return colors.primary.main;
      default:
        return themedColors.text;
    }
  };

  const getBackgroundColor = () => {
    if (isDisabled) {
      return themedColors.isDark ? colors.neutral[800] : colors.neutral[200];
    }
    
    switch (variant) {
      case 'secondary':
        return themedColors.backgroundSecondary;
      case 'outline':
      case 'ghost':
        return 'transparent';
      case 'danger':
        return colors.status.error.main;
      default:
        return colors.primary.main;
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') {
      return isDisabled ? colors.neutral[300] : colors.primary.main;
    }
    return 'transparent';
  };

  // Primary variant uses gradient
  if (variant === 'primary' && !isDisabled) {
    return (
      <TouchableOpacity
        style={[
          styles.button,
          sizeStyles[size],
          fullWidth && styles.fullWidth,
          style,
        ]}
        disabled={isDisabled}
        activeOpacity={0.8}
        {...props}
      >
        <LinearGradient
          colors={[colors.primary.main, colors.primary.dark, colors.primary.main]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: sizeStyles[size].borderRadius },
          ]}
        />
        {getContent()}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        sizeStyles[size],
        fullWidth && styles.fullWidth,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1.5 : 0,
        },
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      {getContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing[2],
  },
  iconRight: {
    marginLeft: spacing[2],
  },
});

export default Button;
