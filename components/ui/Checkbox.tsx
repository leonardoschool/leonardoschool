'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { colors } from '@/lib/theme/colors';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className = '', id, checked, disabled, ...props }, ref) => {
    const inputId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`flex items-start gap-3 ${className}`}>
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <label
            htmlFor={inputId}
            className={`
              flex items-center justify-center w-5 h-5 rounded border-2 transition-all cursor-pointer
              ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              ${error 
                ? 'border-red-500' 
                : checked 
                  ? 'bg-[#a8012b] border-[#a8012b]' 
                  : `${colors.border.primary} hover:border-[#a8012b]/50 bg-transparent dark:bg-slate-800`
              }
              peer-focus-visible:ring-2 peer-focus-visible:ring-[#a8012b]/30 peer-focus-visible:ring-offset-2
              dark:peer-focus-visible:ring-offset-slate-900
            `}
          >
            {checked && (
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            )}
          </label>
        </div>

        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label
                htmlFor={inputId}
                className={`text-sm font-medium cursor-pointer select-none ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ${colors.text.primary}`}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={`text-xs mt-0.5 ${colors.text.muted}`}>
                {description}
              </p>
            )}
            {error && (
              <p className="text-xs mt-1 text-red-500">{error}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
