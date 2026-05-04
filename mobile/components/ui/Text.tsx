/**
 * Leonardo School Mobile - Text Component
 * 
 * Componente Text customizzato con supporto tema e stili predefiniti.
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useThemedColors } from '../../contexts/ThemeContext';
import { textStyles } from '../../lib/theme/typography';

type TextVariant = keyof typeof textStyles;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: 'primary' | 'secondary' | 'tertiary' | 'muted' | 'inverse' | 'error' | 'success' | 'warning';
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

export function Text({
  variant = 'body',
  color = 'primary',
  align = 'left',
  style,
  children,
  ...props
}: TextProps) {
  const themedColors = useThemedColors();

  const colorMap = {
    primary: themedColors.text,
    secondary: themedColors.textSecondary,
    tertiary: themedColors.textSecondary,
    muted: themedColors.textMuted,
    inverse: themedColors.textInverse,
    error: themedColors.error,
    success: themedColors.success,
    warning: themedColors.warning,
  };

  const variantStyle = textStyles[variant];

  return (
    <RNText
      style={[
        variantStyle,
        { color: colorMap[color], textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

// Convenience components
export function Heading1(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h1" {...props} />;
}

export function Heading2(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h2" {...props} />;
}

export function Heading3(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h3" {...props} />;
}

export function Heading4(props: Omit<TextProps, 'variant'>) {
  return <Text variant="h4" {...props} />;
}

export function Body(props: Omit<TextProps, 'variant'>) {
  return <Text variant="body" {...props} />;
}

export function BodySmall(props: Omit<TextProps, 'variant'>) {
  return <Text variant="bodySmall" {...props} />;
}

export function Caption(props: Omit<TextProps, 'variant'>) {
  return <Text variant="caption" color="muted" {...props} />;
}

export function Label(props: Omit<TextProps, 'variant'>) {
  return <Text variant="label" {...props} />;
}

export default Text;
