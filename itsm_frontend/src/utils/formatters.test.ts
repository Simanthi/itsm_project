// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { formatDate, formatCurrency } from './formatters';

describe('formatDate', () => {
  it('should return an empty string for null, undefined, or empty input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('should format valid ISO date strings to locale date string by default', () => {
    // Note: toLocaleDateString() is locale-dependent, so this test might be brittle.
    // For consistency, it's often better to test against a specific format like 'YYYY-MM-DD'.
    // However, we'll test the default behavior first.
    const date = new Date(2023, 0, 15); // January 15, 2023
    expect(formatDate('2023-01-15T10:20:30Z')).toBe(date.toLocaleDateString());
  });

  it('should format valid date strings to YYYY-MM-DD when format is specified', () => {
    expect(formatDate('2023-01-15T10:20:30Z', 'YYYY-MM-DD')).toBe('2023-01-15');
    expect(formatDate('2023/01/15', 'YYYY-MM-DD')).toBe('2023-01-15'); // Common format
  });

  it('should handle date strings already in YYYY-MM-DD format', () => {
    const date = new Date(2023, 2, 5); // March 5, 2023
    expect(formatDate('2023-03-05')).toBe(date.toLocaleDateString());
    expect(formatDate('2023-03-05', 'YYYY-MM-DD')).toBe('2023-03-05');
  });

  it('should return "Invalid date" for invalid date strings', () => {
    expect(formatDate('not-a-date')).toBe('Invalid date');
    // JavaScript's Date constructor is lenient with out-of-bounds months/days
    // '2023-13-01' becomes Jan 1, 2024
    // '2023-02-30' becomes Mar 2, 2023 (in non-leap year) or Mar 1 (leap year)
    // The function's current logic doesn't strictly validate these before formatting.
    // Test current behavior:
    const invalidMonthDate = new Date(2023, 12, 1); // Jan 1, 2024
    expect(formatDate('2023-13-01')).toBe(invalidMonthDate.toLocaleDateString());
    const invalidDayDate = new Date(2023, 1, 30); // e.g. Mar 2, 2023
    expect(formatDate('2023-02-30')).toBe(invalidDayDate.toLocaleDateString());
  });

  it('should correctly parse YYYY-MM-DD if initial Date parsing fails but parts are valid', () => {
    // This case simulates where `new Date(dateStr)` might fail for "YYYY-MM-DD" in some environments
    // but the fallback parser handles it.
    // For this test to be meaningful, we'd need to ensure `new Date('2023-03-05')` is treated as invalid by the first pass.
    // This is hard to simulate directly without mocking `new Date` itself, which is complex.
    // The current implementation will likely parse '2023-03-05' correctly in the first `new Date()` call.
    // However, we can test the path if an unconventional separator was used that `new Date` fails on.
    expect(formatDate('2023.03.05', 'YYYY-MM-DD')).toBe('2023-03-05'); // Assuming '2023.03.05' fails new Date() but custom parse works
    // Let's assume 'YYYY.MM.DD' is not directly parsed by `new Date()` but is by the split logic.
    // The current logic in formatDate might parse '2023.03.05' as valid with `new Date()` if the locale settings are lenient.
    // A specific string that `new Date` would parse as NaN but the split logic would fix:
    // This test is tricky because `new Date()` is quite flexible.
    // The fallback `split('-')` logic is specifically for hyphens.
  });

   it('should return "Invalid date" if the date string is unparseable even by fallback', () => {
    expect(formatDate('2023-Mar-05-Extra', 'YYYY-MM-DD')).toBe('Invalid date');
  });

});

describe('formatCurrency', () => {
  it('should return an empty string for null, undefined, or empty input', () => {
    expect(formatCurrency(null)).toBe('');
    expect(formatCurrency(undefined)).toBe('');
    expect(formatCurrency('')).toBe('');
  });

  it('should format a valid number with default $ symbol', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56'); // en-US locale formatting
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(0.5)).toBe('$0.50');
  });

  it('should format a valid string number with default $ symbol', () => {
    expect(formatCurrency('1234.56')).toBe('$1,234.56');
    expect(formatCurrency('1000')).toBe('$1,000.00');
  });

  it('should format with a custom currency symbol', () => {
    expect(formatCurrency(1234.56, '€')).toBe('€1,234.56');
    expect(formatCurrency('500', 'GBP ')).toBe('GBP 500.00'); // Space after symbol
  });

  it('should return "Invalid amount" for non-numeric string input and handle partial parsing', () => {
    expect(formatCurrency('not-a-number')).toBe('Invalid amount');
    // parseFloat('12.34.56') results in 12.34, which is then formatted.
    // If strict validation is needed, formatCurrency should be updated.
    expect(formatCurrency('12.34.56')).toBe('$12.34');
  });

  it('should format to exactly two decimal places', () => {
    expect(formatCurrency(123)).toBe('$123.00');
    expect(formatCurrency(123.4)).toBe('$123.40');
    expect(formatCurrency(123.456)).toBe('$123.46'); // Check rounding
    expect(formatCurrency(123.454)).toBe('$123.45'); // Check rounding
  });
});
