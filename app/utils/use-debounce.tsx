import * as React from "react";

export function useDebounce<T>(value: T, delayMs: number) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delayMs);

      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delayMs] // Only re-call effect if value or delay changes
  );

  return debouncedValue;
}

/** useDebounceEnd only debounces the value when it goes from truthy to falsy. */
export function useDebounceEnd<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    if (Boolean(value)) {
      // Set value to true right away
      setDebouncedValue(value);
    } else {
      // Delay setting value to false
      const handler = setTimeout(() => setDebouncedValue(value), delayMs);
      return () => clearTimeout(handler);
    }
  }, [value, delayMs]);

  return debouncedValue;
}
