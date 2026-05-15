'use client';

import { forwardRef, useEffect, useState, type InputHTMLAttributes } from 'react';

type ParseMode = 'int' | 'float';

interface NumericInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  parseMode?: ParseMode;
  allowEmpty?: boolean;
}

const formatValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }

  return String(value);
};

const parseValue = (rawValue: string, parseMode: ParseMode): number => {
  return parseMode === 'float'
    ? Number.parseFloat(rawValue)
    : Number.parseInt(rawValue, 10);
};

const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      value,
      onValueChange,
      parseMode = 'int',
      allowEmpty = false,
      onBlur,
      onFocus,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [draftValue, setDraftValue] = useState(() => formatValue(value));

    useEffect(() => {
      if (!isFocused) {
        setDraftValue(formatValue(value));
      }
    }, [isFocused, value]);

    return (
      <input
        {...props}
        ref={ref}
        type="number"
        value={isFocused ? draftValue : formatValue(value)}
        onFocus={(event) => {
          setIsFocused(true);
          setDraftValue(formatValue(value));
          onFocus?.(event);
        }}
        onChange={(event) => {
          const rawValue = event.target.value;
          setDraftValue(rawValue);

          if (rawValue === '') {
            if (allowEmpty) {
              onValueChange(null);
            }

            return;
          }

          const parsedValue = parseValue(rawValue, parseMode);

          if (!Number.isNaN(parsedValue)) {
            onValueChange(parsedValue);
          }
        }}
        onBlur={(event) => {
          setIsFocused(false);

          if (draftValue === '' && !allowEmpty) {
            setDraftValue(formatValue(value));
          }

          onBlur?.(event);
        }}
      />
    );
  }
);

NumericInput.displayName = 'NumericInput';

export default NumericInput;