// ─── Hook générique de debounce ──────────────────────────────────────────────
import { useState, useEffect } from 'react';

/**
 * Retourne une valeur debouncée qui ne se met à jour
 * qu'après `delay` ms d'inactivité.
 */
const useDebounce = <T>(value: T, delay = 400): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
