import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { inputClasses } from '@/components/ui/form/Field';

/** Reads and writes list filters in the URL so views can be bookmarked and shared. */
export function useListParams<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ''])) as Record<K, string>;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const set = (changes: Partial<Record<K | 'page', string | null>>, resetPage = true) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes) as [string, string | null][]) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (resetPage && !('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };
  return { values, page, set };
}

export function SelectFilter({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium tracking-wider text-mist-400 uppercase">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClasses} w-auto min-w-44 py-2.5`}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SearchFilter({ value, onSearch, placeholder }: { value: string; onSearch: (v: string) => void; placeholder: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(draft.trim());
  };
  return (
    <form role="search" onSubmit={submit} className="flex items-end gap-2">
      <div>
        <label htmlFor="admin-search" className="mb-1.5 block text-xs font-medium tracking-wider text-mist-400 uppercase">
          Search
        </label>
        <input
          id="admin-search"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className={`${inputClasses} w-64 py-2.5`}
        />
      </div>
      <Button type="submit" size="sm" variant="secondary" className="h-[2.85rem]">
        Search
      </Button>
    </form>
  );
}
