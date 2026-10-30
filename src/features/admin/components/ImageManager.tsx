import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '@/lib/errors';
import { WoodImage } from '@/components/media/WoodImage';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { inputClasses } from '@/components/ui/form/Field';
import { CATALOG_IMAGE_RULES, deleteImage, listImages, updateImage, uploadImage, type CatalogImage, type CatalogKind } from '../api/catalog';
import { adminKeys } from '../keys';
import { Panel } from './AdminUi';

/** Upload, describe, reorder, and remove photos. The first image is the cover. */
export function ImageManager({ kind, parentId }: { kind: CatalogKind; parentId: string }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const images = useQuery({ queryKey: adminKeys.images(kind, parentId), queryFn: () => listImages(kind, parentId) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.all });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const start = images.data?.length ?? 0;
      for (const [i, file] of files.entries()) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`);
        await uploadImage(kind, parentId, file, '', start + i);
      }
    },
    onSettled: () => {
      setProgress(null);
      void refresh();
    },
  });
  const remove = useMutation({ mutationFn: (img: CatalogImage) => deleteImage(kind, img), onSuccess: refresh });
  const edit = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: { alt?: string; position?: number } }) => updateImage(kind, id, changes),
    onSuccess: refresh,
  });

  const move = async (index: number, delta: number) => {
    const list = images.data ?? [];
    const target = list[index + delta];
    const current = list[index];
    if (!target || !current) return;
    await updateImage(kind, current.id, { position: index + delta });
    await updateImage(kind, target.id, { position: index });
    void refresh();
  };

  const error = upload.error ?? remove.error ?? edit.error;

  return (
    <Panel
      title="Photos"
      actions={
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={CATALOG_IMAGE_RULES.mimeTypes.join(',')}
            className="sr-only"
            id={`upload-${parentId}`}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) upload.mutate(files);
              e.target.value = '';
            }}
          />
          <Button size="sm" loading={upload.isPending} onClick={() => inputRef.current?.click()}>
            Upload Photos
          </Button>
        </>
      }
    >
      <p className="-mt-3 mb-5 text-xs text-mist-400">
        JPEG, PNG, WebP, or AVIF up to 8 MB. The first photo is used as the cover. Describe each photo for visitors
        using screen readers.
      </p>
      {progress && <p role="status" className="mb-4 text-sm text-gold-300">{progress}</p>}
      {error && <Alert tone="error" className="mb-4">{errorMessage(error)}</Alert>}

      {images.data?.length === 0 ? (
        <p className="text-mist-400">No photos yet. The site shows a placeholder until you add one.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(images.data ?? []).map((img, i, all) => (
            <li key={img.id} className="rounded-sm border border-ink-700 bg-ink-900 p-3">
              <WoodImage image={{ id: img.id, url: img.url, alt: img.alt, tone: img.tone }} sizes="300px" className="aspect-[4/3] rounded-sm" />
              {i === 0 && <p className="mt-2 text-xs font-semibold tracking-wider text-gold-400 uppercase">Cover</p>}
              <label className="mt-2 block text-xs text-mist-400" htmlFor={`alt-${img.id}`}>
                Description
              </label>
              <input
                id={`alt-${img.id}`}
                defaultValue={img.alt}
                maxLength={300}
                className={`${inputClasses} mt-1 py-2 text-sm`}
                onBlur={(e) => {
                  const alt = e.target.value.trim();
                  if (alt && alt !== img.alt) edit.mutate({ id: img.id, changes: { alt } });
                }}
              />
              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <span className="flex gap-1">
                  <button type="button" disabled={i === 0} onClick={() => void move(i, -1)} className="rounded-sm px-2 py-1 text-ivory-300 hover:bg-ink-800 disabled:opacity-30">
                    ← Earlier
                  </button>
                  <button type="button" disabled={i === all.length - 1} onClick={() => void move(i, 1)} className="rounded-sm px-2 py-1 text-ivory-300 hover:bg-ink-800 disabled:opacity-30">
                    Later →
                  </button>
                </span>
                <button type="button" onClick={() => remove.mutate(img)} className="px-2 py-1 text-mist-400 hover:text-[#f2a08c]">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
