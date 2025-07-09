// itsm_frontend/src/context/ThemeContext/ThemeContextProvider.test.tsx
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeContextProvider } from './ThemeContextProvider';
import { useThemeContext } from './useThemeContext';
import { themes } from '../../theme/theme'; // Actual themes for availableThemes check

// Helper component to consume and display context values
const TestConsumerComponent: React.FC<{ onRender?: (contextValue: any) => void }> = ({ onRender }) => {
  const context = useThemeContext();
  if (onRender) {
    onRender(context);
  }
  return (
    <div>
      <span data-testid="current-theme-name">{context.currentThemeName}</span>
      <button onClick={() => context.setCurrentTheme('dark')}>Set Dark</button>
      <button onClick={() => context.setCurrentTheme('light')}>Set Light</button>
      <button onClick={() => context.setCurrentTheme('invalid-theme')}>Set Invalid</button>
      <div data-testid="available-themes">{context.availableThemes.join(',')}</div>
    </div>
  );
};

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock console.warn and console.error to keep test output clean for expected warnings/errors
let consoleWarnSpy: vi.SpyInstance;
let consoleErrorSpy: vi.SpyInstance;

describe('ThemeContextProvider and useThemeContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.resetAllMocks(); // Reset any other mocks if necessary
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('useThemeContext throws error when used outside of ThemeContextProvider', () => {
    // Hide expected console error from React
    const originalError = console.error;
    console.error = vi.fn();
    expect(() => render(<TestConsumerComponent />)).toThrow(
      'useThemeContext must be used within a ThemeContextProvider',
    );
    console.error = originalError;
  });

  it('provides default theme if localStorage is empty', () => {
    render(
      <ThemeContextProvider>
        <TestConsumerComponent />
      </ThemeContextProvider>,
    );
    expect(screen.getByTestId('current-theme-name')).toHaveTextContent('light'); // Assuming 'light' is default
  });

  it('loads theme from localStorage if valid theme is stored', () => {
    localStorageMock.setItem('themeName', 'dark');
    render(
      <ThemeContextProvider>
        <TestConsumerComponent />
      </ThemeContextProvider>,
    );
    expect(screen.getByTestId('current-theme-name')).toHaveTextContent('dark');
  });

  it('defaults to default theme if localStorage contains an invalid theme name', () => {
    localStorageMock.setItem('themeName', 'invalid-stored-theme');
    render(
      <ThemeContextProvider>
        <TestConsumerComponent />
      </ThemeContextProvider>,
    );
    expect(screen.getByTestId('current-theme-name')).toHaveTextContent('light'); // Assuming 'light' is default
    // console.error is NOT called if localStorage.getItem succeeds but returns an invalid theme string.
    // It's only called if localStorage.getItem() itself throws.
    // So, for this specific scenario of an invalid theme string, no console.error is expected.
    // If localStorage.getItem were to throw, then the spy would catch it.
    // We can ensure no other console errors happened if needed, but the main point is it defaults correctly.
    // expect(consoleErrorSpy).not.toHaveBeenCalled(); // This would be too broad if other errors are possible.
  });

  it('setCurrentTheme changes the theme and updates localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeContextProvider>
        <TestConsumerComponent />
      </ThemeContextProvider>,
    );

    expect(screen.getByTestId('current-theme-name')).toHaveTextContent('light');

    // Change to dark theme
    await user.click(screen.getByRole('button', { name: /set dark/i }));
    expect(screen.getByTestId('current-theme-name')).toHaveTextContent('dark');
    expect(localStorageMock.getItem('themeName')).toBe('dark');

    // Change back to light theme
    await user.click(screen.getByRole('button', { name: /set light/i }));
    expect(screen.getByTestId('current-theme-name')).toHaveTextContent('light');
    expect(localStorageMock.getItem('themeName')).toBe('light');
  });

  it('setCurrentTheme defaults to default theme and updates localStorage if an invalid theme name is provided', async () => {
    const user = userEvent.setup();
    render(
      <ThemeContextProvider>
        <TestConsumerComponent />
      </ThemeContextProvider>,
    );

    expect(screen.getByTestId('current-theme-name')).toHaveTextContent('light');

    await user.click(screen.getByRole('button', { name: /set invalid/i }));

    expect(screen.getByTestId('current-theme-name')).toHaveTextContent('light'); // Assuming 'light' is default
    expect(localStorageMock.getItem('themeName')).toBe('light'); // Should be set to default
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Theme "invalid-theme" not found. Defaulting to "light".', // Or your default theme name
    );
  });

  it('provides availableThemes correctly', () => {
    const expectedThemes = Object.keys(themes).join(',');
    render(
      <ThemeContextProvider>
        <TestConsumerComponent />
      </ThemeContextProvider>,
    );
    expect(screen.getByTestId('available-themes')).toHaveTextContent(expectedThemes);
  });

  it('renders children correctly', () => {
    render(
      <ThemeContextProvider>
        <div>Child Component</div>
      </ThemeContextProvider>,
    );
    expect(screen.getByText('Child Component')).toBeInTheDocument();
  });
});
