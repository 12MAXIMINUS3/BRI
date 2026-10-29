import { useCallback, useEffect, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { readSession, removeSession, writeSession } from '@/lib/storage';

/**
 * Keeps unsent form values in sessionStorage so they survive a failed
 * submission, an accidental reload, or the sign-in redirect added in Phase 3.
 * Only keys present in `defaults` with a matching primitive type are restored.
 * Selected files cannot be stored and must be re-attached.
 */
export function useFormDraft<T extends FieldValues>(key: string, form: UseFormReturn<T>, defaults: T) {
  const { reset, watch } = form;
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const saved = readSession<Record<string, unknown>>(key);
    if (!saved) return;
    const next: Record<string, unknown> = { ...defaults };
    let changed = false;
    for (const [field, defaultValue] of Object.entries(defaults)) {
      const value = saved[field];
      if (value !== undefined && typeof value === typeof defaultValue && value !== defaultValue) {
        next[field] = value;
        changed = true;
      }
    }
    if (changed) {
      reset(next as T, { keepDefaultValues: true });
      setRestored(true);
    }
    // Restore once per key; `defaults` and `reset` are stable for the form's lifetime.
  }, [key]);

  useEffect(() => {
    const subscription = watch((values) => writeSession(key, values));
    return () => subscription.unsubscribe();
  }, [key, watch]);

  const clear = useCallback(() => {
    removeSession(key);
    setRestored(false);
  }, [key]);

  return { restored, clear };
}
