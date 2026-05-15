import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import NumericInput from '@/components/ui/NumericInput';

describe('NumericInput', () => {
  it('should let users replace a larger number with a smaller one', () => {
    function ControlledField() {
      const [value, setValue] = useState(50);

      return <NumericInput value={value} onValueChange={(nextValue) => setValue(nextValue ?? value)} />;
    }

    render(<ControlledField />);

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: '10' } });
    expect(input.value).toBe('10');
  });

  it('should emit null when empty values are allowed', () => {
    const onValueChange = vi.fn();
    render(<NumericInput value={50} allowEmpty onValueChange={onValueChange} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });

    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it('should parse decimals when requested', () => {
    const onValueChange = vi.fn();
    render(<NumericInput value={1.5} parseMode="float" step="0.1" onValueChange={onValueChange} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2.75' } });

    expect(onValueChange).toHaveBeenCalledWith(2.75);
  });
});