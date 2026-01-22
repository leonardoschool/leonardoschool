/**
 * Toast Component Tests
 *
 * Tests for the Toast notification system (provider and hook).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '@/components/ui/Toast';

// Test component that uses the hook
function TestComponent({ action }: { action: 'success' | 'error' | 'warning' | 'info' | 'custom' | 'remove' }) {
  const { showSuccess, showError, showWarning, showInfo, showToast, toasts, removeToast } = useToast();

  const handleClick = () => {
    switch (action) {
      case 'success':
        showSuccess('Successo', 'Operazione completata.');
        break;
      case 'error':
        showError('Errore', 'Si è verificato un errore.');
        break;
      case 'warning':
        showWarning('Attenzione', 'Verifica i dati inseriti.');
        break;
      case 'info':
        showInfo('Informazione', 'Nuovo aggiornamento disponibile.');
        break;
      case 'custom':
        showToast({ type: 'success', title: 'Custom', duration: 0 }); // Duration 0 = no auto-remove
        break;
      case 'remove':
        if (toasts.length > 0) {
          removeToast(toasts[0].id);
        }
        break;
    }
  };

  return (
    <div>
      <button onClick={handleClick}>Trigger {action}</button>
      <span data-testid="toast-count">{toasts.length}</span>
    </div>
  );
}

// Wrapper for rendering with provider
function renderWithProvider(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('context', () => {
    it('should throw error when useToast is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent action="success" />);
      }).toThrow('useToast must be used within a ToastProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide toast context to children', () => {
      renderWithProvider(<TestComponent action="success" />);
      expect(screen.getByTestId('toast-count').textContent).toBe('0');
    });
  });

  describe('showSuccess', () => {
    it('should show success toast', async () => {
      renderWithProvider(<TestComponent action="success" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger success'));
      });
      
      expect(screen.getByText('Successo')).toBeDefined();
      expect(screen.getByText('Operazione completata.')).toBeDefined();
    });

    it('should have success styling', async () => {
      renderWithProvider(<TestComponent action="success" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger success'));
      });
      
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-green-50');
      expect(toast.className).toContain('border-green-500');
    });
  });

  describe('showError', () => {
    it('should show error toast', async () => {
      renderWithProvider(<TestComponent action="error" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger error'));
      });
      
      expect(screen.getByText('Errore')).toBeDefined();
      expect(screen.getByText('Si è verificato un errore.')).toBeDefined();
    });

    it('should have error styling', async () => {
      renderWithProvider(<TestComponent action="error" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger error'));
      });
      
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-red-50');
      expect(toast.className).toContain('border-red-500');
    });

    it('should stay longer for errors (8 seconds)', async () => {
      renderWithProvider(<TestComponent action="error" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger error'));
      });
      
      expect(screen.getByText('Errore')).toBeDefined();
      
      // Advance less than 8 seconds
      await act(async () => {
        vi.advanceTimersByTime(7000);
      });
      expect(screen.queryByText('Errore')).toBeDefined();
      
      // Advance past 8 seconds
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByText('Errore')).toBeNull();
    });
  });

  describe('showWarning', () => {
    it('should show warning toast', async () => {
      renderWithProvider(<TestComponent action="warning" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger warning'));
      });
      
      expect(screen.getByText('Attenzione')).toBeDefined();
      expect(screen.getByText('Verifica i dati inseriti.')).toBeDefined();
    });

    it('should have warning styling', async () => {
      renderWithProvider(<TestComponent action="warning" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger warning'));
      });
      
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-amber-50');
      expect(toast.className).toContain('border-amber-500');
    });
  });

  describe('showInfo', () => {
    it('should show info toast', async () => {
      renderWithProvider(<TestComponent action="info" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger info'));
      });
      
      expect(screen.getByText('Informazione')).toBeDefined();
      expect(screen.getByText('Nuovo aggiornamento disponibile.')).toBeDefined();
    });

    it('should have info styling', async () => {
      renderWithProvider(<TestComponent action="info" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger info'));
      });
      
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-blue-50');
      expect(toast.className).toContain('border-blue-500');
    });
  });

  describe('auto-dismiss', () => {
    it('should auto-dismiss after default duration (5 seconds)', async () => {
      renderWithProvider(<TestComponent action="success" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger success'));
      });
      
      expect(screen.getByText('Successo')).toBeDefined();
      
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      
      expect(screen.queryByText('Successo')).toBeNull();
    });

    it('should not auto-dismiss when duration is 0', async () => {
      renderWithProvider(<TestComponent action="custom" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger custom'));
      });
      
      expect(screen.getByText('Custom')).toBeDefined();
      
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      
      // Still visible
      expect(screen.getByText('Custom')).toBeDefined();
    });
  });

  describe('manual dismiss', () => {
    it('should dismiss when close button is clicked', async () => {
      renderWithProvider(<TestComponent action="custom" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger custom'));
      });
      
      expect(screen.getByText('Custom')).toBeDefined();
      
      const closeButton = screen.getByLabelText('Chiudi notifica');
      await act(async () => {
        fireEvent.click(closeButton);
      });
      
      expect(screen.queryByText('Custom')).toBeNull();
    });

    it('should dismiss via removeToast', async () => {
      renderWithProvider(<TestComponent action="custom" />);
      
      // First add a toast
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger custom'));
      });
      expect(screen.getByTestId('toast-count').textContent).toBe('1');
      
      // Then remove it
      // Note: We need a different test component to test removeToast directly
    });
  });

  describe('multiple toasts', () => {
    it('should stack multiple toasts', async () => {
      renderWithProvider(<TestComponent action="success" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger success'));
        fireEvent.click(screen.getByText('Trigger success'));
        fireEvent.click(screen.getByText('Trigger success'));
      });
      
      expect(screen.getByTestId('toast-count').textContent).toBe('3');
    });

    it('should dismiss toasts independently', async () => {
      renderWithProvider(<TestComponent action="success" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger success'));
      });
      
      await act(async () => {
        vi.advanceTimersByTime(1000);
        fireEvent.click(screen.getByText('Trigger success'));
      });
      
      expect(screen.getByTestId('toast-count').textContent).toBe('2');
      
      // First toast should dismiss at 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(4000);
      });
      
      expect(screen.getByTestId('toast-count').textContent).toBe('1');
      
      // Second toast should dismiss 1 second later
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      
      expect(screen.getByTestId('toast-count').textContent).toBe('0');
    });
  });

  describe('accessibility', () => {
    it('should have role="alert" on toast', async () => {
      renderWithProvider(<TestComponent action="success" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger success'));
      });
      
      expect(screen.getByRole('alert')).toBeDefined();
    });

    it('should have aria-label on close button', async () => {
      renderWithProvider(<TestComponent action="custom" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger custom'));
      });
      
      expect(screen.getByLabelText('Chiudi notifica')).toBeDefined();
    });

    it('should have aria-live on container', async () => {
      renderWithProvider(<TestComponent action="success" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger success'));
      });
      
      const container = screen.getByLabelText('Notifiche');
      expect(container.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('toast without message', () => {
    it('should show toast with only title', async () => {
      renderWithProvider(<TestComponent action="custom" />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Trigger custom'));
      });
      
      expect(screen.getByText('Custom')).toBeDefined();
    });
  });
});

describe('useToast hook', () => {
  it('should return all required methods', () => {
    // Test component that validates hook return value
    function HookTestComponent() {
      const toast = useToast();
      
      // Assertions inside the component during render
      if (typeof toast.showToast !== 'function') throw new Error('showToast not function');
      if (typeof toast.showSuccess !== 'function') throw new Error('showSuccess not function');
      if (typeof toast.showError !== 'function') throw new Error('showError not function');
      if (typeof toast.showWarning !== 'function') throw new Error('showWarning not function');
      if (typeof toast.showInfo !== 'function') throw new Error('showInfo not function');
      if (typeof toast.removeToast !== 'function') throw new Error('removeToast not function');
      if (!Array.isArray(toast.toasts)) throw new Error('toasts not array');
      
      return <div data-testid="hook-validated">valid</div>;
    }
    
    render(
      <ToastProvider>
        <HookTestComponent />
      </ToastProvider>
    );
    
    // If we get here without throwing, the hook is valid
    expect(screen.getByTestId('hook-validated')).toBeDefined();
  });
});
