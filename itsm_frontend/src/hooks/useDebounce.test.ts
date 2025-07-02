// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should update the debounced value after the specified delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 500 });
    expect(result.current).toBe('initial'); // Still initial value before delay

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('updated'); // Updated after delay
  });

  it('should only update with the latest value after multiple rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    );

    expect(result.current).toBe('first');

    rerender({ value: 'second', delay: 500 });
    act(() => { vi.advanceTimersByTime(100); }); // Not enough time
    expect(result.current).toBe('first');

    rerender({ value: 'third', delay: 500 });
    act(() => { vi.advanceTimersByTime(100); }); // Still not enough
    expect(result.current).toBe('first');

    rerender({ value: 'final', delay: 500 });
    expect(result.current).toBe('first'); // Should still be 'first' as timeout for 'final' has just started

    act(() => {
      vi.advanceTimersByTime(500); // Advance by the full delay for the 'final' value
    });
    expect(result.current).toBe('final'); // Should now be the final value
  });

  it('should handle changes in delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 1000 }); // Change value and delay
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(500); // Not enough for new delay
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(500); // Total 1000ms for new delay
    });
    expect(result.current).toBe('updated');
  });

  it('should clear timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useDebounce('test', 500));

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });
});
