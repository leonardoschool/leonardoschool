/**
 * Leonardo School Mobile - Input Component
 * 
 * Componente TextInput customizzato con label, errori e icone.
 */

import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Label } from './Text';
import { colors } from '../../lib/theme/colors';
import { spacing, layout } from '../../lib/theme/spacing';
import { typography } from '../../lib/theme/typography';
import { useThemedColors } from '../../contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: object;
  inputContainerStyle?: object;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconPress,
      containerStyle,
      inputContainerStyle,
      secureTextEntry,
      style,
      ...props
    },
    ref
  ) => {
    const themedColors = useThemedColors();
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const isPassword = secureTextEntry !== undefined;
    const showPassword = isPassword && isPasswordVisible;

    const getBorderColor = () => {
      if (error) return colors.status.error.main;
      if (isFocused) return colors.primary.main;
      return themedColors.border;
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Label style={styles.label}>{label}</Label>
        )}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: themedColors.input,
              borderColor: getBorderColor(),
            },
            isFocused && styles.inputContainerFocused,
            error && styles.inputContainerError,
            inputContainerStyle,
          ]}
        >
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={layout.icon.md}
              color={themedColors.textMuted}
              style={styles.leftIcon}
            />
          )}

          <TextInput
            ref={ref}
            style={[
              styles.input,
              { color: themedColors.text },
              leftIcon && styles.inputWithLeftIcon,
              (rightIcon || isPassword) && styles.inputWithRightIcon,
              style,
            ]}
            placeholderTextColor={themedColors.textMuted}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            secureTextEntry={isPassword && !showPassword}
            {...props}
          />

          {isPassword && (
            <TouchableOpacity
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              style={styles.rightIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={layout.icon.md}
                color={themedColors.textMuted}
              />
            </TouchableOpacity>
          )}

          {rightIcon && !isPassword && (
            <TouchableOpacity
              onPress={onRightIconPress}
              style={styles.rightIconButton}
              disabled={!onRightIconPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={rightIcon}
                size={layout.icon.md}
                color={themedColors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle"
              size={14}
              color={colors.status.error.main}
            />
            <Text variant="caption" style={styles.errorText}>
              {error}
            </Text>
          </View>
        )}

        {hint && !error && (
          <Text variant="caption" color="muted" style={styles.hint}>
            {hint}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  label: {
    marginBottom: spacing[1.5],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: layout.borderRadius.lg,
    height: layout.input.md,
    paddingHorizontal: spacing[3],
  },
  inputContainerFocused: {
    borderWidth: 2,
  },
  inputContainerError: {
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    paddingVertical: 0,
  },
  inputWithLeftIcon: {
    marginLeft: spacing[2],
  },
  inputWithRightIcon: {
    marginRight: spacing[2],
  },
  leftIcon: {
    marginRight: spacing[1],
  },
  rightIconButton: {
    padding: spacing[1],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  errorText: {
    color: colors.status.error.text,
    marginLeft: spacing[1],
  },
  hint: {
    marginTop: spacing[1],
  },
});

export default Input;
