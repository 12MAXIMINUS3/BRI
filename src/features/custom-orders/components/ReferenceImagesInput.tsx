import { useEffect, useId, useRef, useState } from 'react';
import { CloseIcon, UploadIcon } from '@/components/ui/icons';
import { REFERENCE_IMAGE_RULES } from '../schema';

interface ReferenceImagesInputProps {
  files: File[];
  onChange: (files: File[]) => void;
  error?: string | null;
  disabled?: boolean;
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ReferenceImagesInput({ files, onChange, error, disabled }: ReferenceImagesInputProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Object URLs are created and revoked inside the same effect so StrictMode's
  // double-invoked effects never leave previews pointing at revoked URLs.
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') return;
    const created = files.map((file) => URL.createObjectURL(file));
    setUrls(created);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  const previews = files.map((file, i) => ({ file, url: urls[i] ?? '' }));

  const remaining = REFERENCE_IMAGE_RULES.maxFiles - files.length;

  return (
    <div>
      <p id={`${id}-label`} className="mb-1.5 flex items-baseline gap-2 text-sm font-medium text-ivory-200">
        Reference images <span className="text-xs font-normal text-mist-400">Optional</span>
      </p>
      <label
        htmlFor={id}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold-400 ${
          error ? 'border-[#e07a62]' : 'border-ink-600 hover:border-gold-500/60'
        } ${remaining <= 0 || disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <UploadIcon className="size-6 text-gold-300" />
        <span className="text-sm font-medium text-gold-400">Choose images to upload</span>
        <span className="text-xs text-mist-400">
          Sketches, photos of the space, or pieces you like. JPEG, PNG, or WebP, up to 10 MB each, max{' '}
          {REFERENCE_IMAGE_RULES.maxFiles}.
        </span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple
          accept={REFERENCE_IMAGE_RULES.mimeTypes.join(',')}
          disabled={remaining <= 0 || disabled}
          aria-describedby={error ? `${id}-error` : undefined}
          className="sr-only"
          onChange={(event) => {
            const picked = Array.from(event.target.files ?? []);
            onChange([...files, ...picked]);
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-[#f2a08c]">
          {error}
        </p>
      )}
      {previews.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Selected images">
          {previews.map(({ file, url }, index) => (
            <li key={`${file.name}-${index}`} className="relative overflow-hidden rounded-xl border border-ink-700 bg-ink-850">
              {url ? (
                <img src={url} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="aspect-square bg-ink-900" />
              )}
              <div className="px-3 py-2">
                <p className="truncate text-xs font-medium text-ivory-200">{file.name}</p>
                <p className="text-xs text-mist-400">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-ink-950/85 text-ivory-50 shadow hover:bg-ink-950"
              >
                <CloseIcon className="size-4" />
                <span className="sr-only">Remove {file.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
