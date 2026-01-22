/**
 * Leonardo School Mobile - Card Component
 * 
 * Componente Card riutilizzabile con varianti.
 */

import React from 'react';
import { View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { useThemedColors } from '../../contexts/ThemeContext';
import { spacing, layout } from '../../lib/theme/spacing';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  style,
  testID,
}: CardProps) {
  const themedColors = useThemedColors();

  const paddingValues = {
    none: 0,
    sm: spacing[2],
    md: spacing[4],
    lg: spacing[6],
  };

  const getCardStyle = () => {
    const baseStyle = {
      backgroundColor: themedColors.card,
      borderRadius: layout.borderRadius.xl,
      padding: paddingValues[padding],
    };

    switch (variant) {
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: themedColors.border,
        };
      case 'elevated':
        return {
          ...baseStyle,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: themedColors.isDark ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 4,
        };
      default:
        return baseStyle;
    }
  };

  const cardStyle = [getCardStyle(), style];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  );
}

export default Card;
