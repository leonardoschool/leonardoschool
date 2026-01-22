/**
 * Test Utilities
 * Common utilities and helpers for testing
 */

import { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from 'vitest';

// ==================== Custom Render ====================

/**
 * Custom render function that wraps components with necessary providers
 * Extend this as you add more providers (Theme, Auth, etc.)
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add provider options here as needed
  initialRoute?: string;
}

function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const { ...renderOptions } = options;

  // Setup user event
  const user = userEvent.setup();

  // Render with providers
  const result = render(ui, {
    ...renderOptions,
    // Add wrapper here when you have providers
    // wrapper: ({ children }) => <Providers>{children}</Providers>,
  });

  return {
    ...result,
    user,
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent };

// Override render with custom render
export { customRender as render };

// ==================== Test Data Generators ====================

/**
 * Generate a random email
 */
export const generateEmail = (prefix = 'test'): string => {
  const randomId = Math.random().toString(36).substring(7);
  return `${prefix}-${randomId}@example.com`;
};

/**
 * Generate a random Italian fiscal code (Codice Fiscale)
 * Note: This generates a valid format but not necessarily a real person
 */
export const generateCodiceFiscale = (): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  
  let cf = '';
  // 6 letters (surname + name)
  for (let i = 0; i < 6; i++) {
    cf += letters[Math.floor(Math.random() * letters.length)];
  }
  // 2 digits (year)
  for (let i = 0; i < 2; i++) {
    cf += digits[Math.floor(Math.random() * digits.length)];
  }
  // 1 letter (month)
  cf += letters[Math.floor(Math.random() * letters.length)];
  // 2 digits (day)
  const day = Math.floor(Math.random() * 31) + 1;
  cf += day.toString().padStart(2, '0');
  // 1 letter (comune code start)
  cf += letters[Math.floor(Math.random() * letters.length)];
  // 3 digits (comune code)
  for (let i = 0; i < 3; i++) {
    cf += digits[Math.floor(Math.random() * digits.length)];
  }
  // 1 letter (check digit)
  cf += letters[Math.floor(Math.random() * letters.length)];
  
  return cf;
};

/**
 * Generate a random Italian phone number
 */
export const generatePhoneNumber = (): string => {
  const prefixes = ['320', '328', '333', '339', '347', '348', '349', '366', '388', '393'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `+39 ${prefix} ${number.slice(0, 3)} ${number.slice(3)}`;
};

/**
 * Generate a random CAP (Italian postal code)
 */
export const generateCAP = (): string => {
  // Random CAP between 00010 and 98168
  const cap = Math.floor(Math.random() * (98168 - 10)) + 10;
  return cap.toString().padStart(5, '0');
};

// ==================== Wait Utilities ====================

/**
 * Wait for a specified amount of time
 */
export const wait = (ms: number): Promise<void> => 
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait for next tick
 */
export const waitForNextTick = (): Promise<void> => 
  new Promise((resolve) => setTimeout(resolve, 0));

// ==================== Mock Request/Response ====================

/**
 * Create a mock Request object
 */
export const createMockRequest = (
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    cookies?: Record<string, string>;
  } = {}
): Request => {
  const { method = 'GET', headers = {}, body } = options;
  
  return new Request(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  });
};

/**
 * Create a mock Response object
 */
export const createMockResponse = (
  data: unknown,
  options: {
    status?: number;
    headers?: Record<string, string>;
  } = {}
): Response => {
  const { status = 200, headers = {} } = options;
  
  return new Response(JSON.stringify(data), {
    status,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
  });
};

// ==================== Assertion Helpers ====================

/**
 * Assert that an async function throws an error with a specific message
 */
export const expectAsyncError = async (
  fn: () => Promise<unknown>,
  expectedMessage?: string | RegExp
): Promise<void> => {
  let error: Error | null = null;
  
  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }
  
  expect(error).not.toBeNull();
  
  if (expectedMessage) {
    if (typeof expectedMessage === 'string') {
      expect(error?.message).toContain(expectedMessage);
    } else {
      expect(error?.message).toMatch(expectedMessage);
    }
  }
};

/**
 * Assert that an element has specific CSS classes
 */
export const expectClasses = (
  element: HTMLElement,
  classes: string[]
): void => {
  classes.forEach((className) => {
    expect(element.classList.contains(className)).toBe(true);
  });
};
