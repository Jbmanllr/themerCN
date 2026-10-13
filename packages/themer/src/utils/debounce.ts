// Trailing-edge debounce for the colour and HSL controls
// (components/editor/color-picker.tsx, hsl-adjustments.tsx).

/**
 * A debounced `func`: it runs once, `wait` ms after the last call, with that
 * last call's arguments. `cancel` drops the pending call; `flush` runs it now
 * (the colour picker flushes on unmount so a value typed mid-debounce still
 * commits). Both do nothing when no call is pending.
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number,
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    pendingArgs = args;
    timeoutId = setTimeout(() => {
      timeoutId = null;
      const callArgs = pendingArgs;
      pendingArgs = null;
      if (callArgs !== null) func(...callArgs);
    }, wait);
  }) as T & { cancel: () => void; flush: () => void };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingArgs = null;
  };

  debounced.flush = () => {
    if (timeoutId === null) return;
    clearTimeout(timeoutId);
    timeoutId = null;
    const callArgs = pendingArgs;
    pendingArgs = null;
    if (callArgs !== null) func(...callArgs);
  };

  return debounced;
}
