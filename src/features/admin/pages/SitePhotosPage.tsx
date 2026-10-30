import { useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BRAND_LOGO_KEY,
  BRAND_VIDEO_KEY,
  EDITABLE_PHOTO_GROUPS,
  SITE_PHOTOS,
  headerVideoUrl,
  siteMediaStore,
  type EditablePhoto,
} from '@/config/images';
import { errorMessage } from '@/lib/errors';
import { catalogImageUrl } from '@/lib/supabase';
import { Logo } from '@/components/layout/Logo';
import { WoodImage } from '@/components/media/WoodImage';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextAreaField } from '@/components/ui/form/Field';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { CATALOG_IMAGE_RULES } from '../api/catalog';
import {
  BRAND_RULES,
  listSitePhotos,
  replaceBrandMedia,
  replaceSitePhoto,
  resetSitePhoto,
  saveSitePhotoDescription,
  type BrandKey,
  type SitePhotoRow,
} from '../api/sitePhotos';
import { AdminPageHeader } from '../components/AdminUi';
import { adminKeys } from '../keys';

const slug = (page: string) => page.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function SitePhotosPage() {
  const photos = useQuery({ queryKey: adminKeys.sitePhotos(), queryFn: listSitePhotos });
  const total = EDITABLE_PHOTO_GROUPS.reduce((n, g) => n + g.photos.length, 0);
  const replaced = photos.data ? EDITABLE_PHOTO_GROUPS.flatMap((g) => g.photos).filter((p) => photos.data.has(p.key)).length : 0;

  return (
    <>
      <AdminPageHeader
        title="Logo, Photos and Video"
        description="Your logo, the background video, and every photo on your website's pages, grouped by page. Upload your own or edit what a photo says, and the website updates straight away."
      />

      <Alert className="mb-8" title="Photos of products and past projects are managed separately">
        Open a product in{' '}
        <Link to="/admin/products" className="font-semibold underline">
          Products
        </Link>{' '}
        or a project in{' '}
        <Link to="/admin/portfolio" className="font-semibold underline">
          Portfolio
        </Link>{' '}
        and use <strong>Upload Photos</strong> there.
      </Alert>

      {photos.isPending ? (
        <LoadingState />
      ) : photos.isError ? (
        <ErrorState message={errorMessage(photos.error)} onRetry={() => photos.refetch()} />
      ) : (
        <>
          <nav aria-label="Jump to page" className="mb-10 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-2 text-mist-400">
              {replaced} of {total} replaced with your own photos ·
            </span>
            <a
              href="#logo-video"
              className="rounded-[10px] border border-gold-500/25 px-3 py-1.5 text-ivory-300 hover:border-gold-500/60 hover:text-gold-300"
            >
              Logo and video
            </a>
            {EDITABLE_PHOTO_GROUPS.map((group) => (
              <a
                key={group.page}
                href={`#${slug(group.page)}`}
                className="rounded-[10px] border border-gold-500/25 px-3 py-1.5 text-ivory-300 hover:border-gold-500/60 hover:text-gold-300"
              >
                {group.page}
              </a>
            ))}
          </nav>

          <div className="grid gap-14">
            <section id="logo-video" aria-labelledby="logo-video-h" className="scroll-mt-28">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-ink-700 pb-3">
                <h2 id="logo-video-h" className="text-3xl">
                  Logo and background video
                </h2>
                <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm text-gold-300 hover:underline">
                  Open the website ↗
                </a>
              </div>
              <ul className="grid gap-6 md:grid-cols-2">
                <li>
                  <BrandCard
                    mediaKey={BRAND_LOGO_KEY}
                    name="Logo"
                    where="Top left of every page, at the bottom of every page, and in this dashboard."
                    row={photos.data.get(BRAND_LOGO_KEY)}
                  />
                </li>
                <li>
                  <BrandCard
                    mediaKey={BRAND_VIDEO_KEY}
                    name="Background video"
                    where="Plays silently behind the top section of every page (Home, Categories, Our Work, Shop, About, Contact)."
                    row={photos.data.get(BRAND_VIDEO_KEY)}
                  />
                </li>
              </ul>
            </section>

            {EDITABLE_PHOTO_GROUPS.map((group) => (
              <section key={group.page} id={slug(group.page)} aria-labelledby={`${slug(group.page)}-h`} className="scroll-mt-28">
                <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-ink-700 pb-3">
                  <h2 id={`${slug(group.page)}-h`} className="text-3xl">
                    {group.page}
                  </h2>
                  <a href={group.path} target="_blank" rel="noopener noreferrer" className="text-sm text-gold-300 hover:underline">
                    Open this page on the website ↗
                  </a>
                </div>
                <ul className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
                  {group.photos.map((photo) => (
                    <li key={photo.key}>
                      <PhotoCard photo={photo} row={photos.data.get(photo.key)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function PhotoCard({ photo, row }: { photo: EditablePhoto; row: SitePhotoRow | undefined }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const defaults = SITE_PHOTOS[photo.key];
  const currentAlt = row?.alt ?? defaults.alt;
  const currentUrl = row ? catalogImageUrl(row.storage_path) : defaults.src;
  const isOwnPhoto = !!row && !row.storage_path.startsWith('/');
  const changed = !!row;

  const [alt, setAlt] = useState(currentAlt);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.sitePhotos() });
  const done = (message: string) => () => {
    setNotice(message);
    void refresh();
  };

  const upload = useMutation({
    mutationFn: (file: File) => replaceSitePhoto(photo.key, file, alt, row),
    onMutate: () => setNotice(null),
    onSuccess: done('New photo saved. It now shows on the website.'),
  });
  const describe = useMutation({
    mutationFn: () => saveSitePhotoDescription(photo.key, alt, row),
    onMutate: () => setNotice(null),
    onSuccess: done('Description saved.'),
  });
  const reset = useMutation({
    mutationFn: () => resetSitePhoto(photo.key, row),
    onMutate: () => setNotice(null),
    onSuccess: () => {
      setAlt(defaults.alt);
      setConfirmReset(false);
      done('Back to the original photo and description.')();
    },
  });
  const busy = upload.isPending || describe.isPending || reset.isPending;
  const error = upload.error ?? describe.error ?? reset.error;
  const altChanged = alt.trim() !== currentAlt;

  return (
    <article className="flex h-full flex-col rounded-sm border border-ink-700 bg-ink-850" aria-labelledby={`${photo.key}-name`}>
      <div className="relative">
        <WoodImage
          image={{ id: photo.key, url: currentUrl, alt: currentAlt, tone: 'walnut' }}
          sizes="(min-width: 1536px) 30vw, (min-width: 768px) 45vw, 100vw"
          className="aspect-[4/3] rounded-t-sm"
        />
        {upload.isPending && (
          <div className="absolute inset-0 grid place-items-center bg-ink-950/70 text-gold-200" role="status">
            Uploading your photo…
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id={`${photo.key}-name`} className="text-2xl">
            {photo.name}
          </h3>
          {isOwnPhoto ? <Badge tone="success">Your photo</Badge> : <Badge tone="neutral">Sample photo</Badge>}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ivory-300">
          <span className="font-semibold text-mist-400">Where it appears: </span>
          {photo.where}
        </p>

        <TextAreaField
          label="Description"
          hint="What the photo shows, in a few words. Read aloud to blind visitors and used by Google."
          rows={2}
          maxLength={300}
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          className="mt-4"
        />

        {notice && !busy && !error && (
          <p role="status" className="mt-3 text-sm text-[#a8d08d]">
            ✓ {notice}
          </p>
        )}
        {error && (
          <Alert tone="error" className="mt-3">
            {errorMessage(error)}
          </Alert>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <input
            ref={fileInput}
            type="file"
            accept={CATALOG_IMAGE_RULES.mimeTypes.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = '';
            }}
          />
          <Button size="sm" loading={upload.isPending} disabled={busy} onClick={() => fileInput.current?.click()}>
            Upload New Photo
          </Button>
          {altChanged && (
            <Button size="sm" variant="secondary" loading={describe.isPending} disabled={busy} onClick={() => describe.mutate()}>
              Save Description
            </Button>
          )}
          {changed && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmReset(true)}>
              Use Original
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmReset} onClose={() => !reset.isPending && setConfirmReset(false)} title="Go back to the original?">
        <p className="leading-relaxed text-ivory-200">
          <strong>{photo.name}</strong> will show the original sample photo and description again.
          {isOwnPhoto && ' The photo you uploaded will be deleted.'}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Keep Mine
          </Button>
          <Button loading={reset.isPending} onClick={() => reset.mutate()}>
            Use Original
          </Button>
        </div>
      </Dialog>
    </article>
  );
}

function BrandCard({ mediaKey, name, where, row }: { mediaKey: BrandKey; name: string; where: string; row: SitePhotoRow | undefined }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useSyncExternalStore(siteMediaStore.subscribe, siteMediaStore.getVersion);
  const isVideo = mediaKey === BRAND_VIDEO_KEY;
  const rules = BRAND_RULES[mediaKey];
  const refresh = () => queryClient.invalidateQueries({ queryKey: adminKeys.sitePhotos() });

  const upload = useMutation({
    mutationFn: (file: File) => replaceBrandMedia(mediaKey, file, row),
    onMutate: () => setNotice(null),
    onSuccess: () => {
      setNotice(`New ${isVideo ? 'video' : 'logo'} saved. It now shows on the website.`);
      void refresh();
    },
  });
  const reset = useMutation({
    mutationFn: () => resetSitePhoto(mediaKey, row),
    onMutate: () => setNotice(null),
    onSuccess: () => {
      setConfirmReset(false);
      setNotice(`Back to the original ${isVideo ? 'video' : 'logo'}.`);
      void refresh();
    },
  });
  const busy = upload.isPending || reset.isPending;
  const error = upload.error ?? reset.error;

  return (
    <article className="flex h-full flex-col rounded-sm border border-ink-700 bg-ink-850" aria-labelledby={`${mediaKey}-name`}>
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-t-sm bg-ink-950">
        {isVideo ? (
          <video
            key={headerVideoUrl()}
            // Browsers only autoplay videos that are muted before play() is called.
            ref={(el) => {
              if (!el) return;
              el.muted = true;
              void el.play().catch(() => {});
            }}
            src={headerVideoUrl()}
            className="absolute inset-0 size-full object-cover"
            muted
            loop
            playsInline
            autoPlay
            aria-label="Preview of the background video"
          />
        ) : (
          <div className="pointer-events-none px-6" inert>
            <Logo />
          </div>
        )}
        {upload.isPending && (
          <div className="absolute inset-0 grid place-items-center bg-ink-950/75 px-4 text-center text-gold-200" role="status">
            Uploading{isVideo ? ' your video. Large videos can take a minute' : ''}…
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id={`${mediaKey}-name`} className="text-2xl">
            {name}
          </h3>
          {row ? <Badge tone="success">Yours</Badge> : <Badge tone="neutral">Original</Badge>}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ivory-300">
          <span className="font-semibold text-mist-400">Where it appears: </span>
          {where}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-mist-400">{rules.help}</p>
        {!isVideo && (
          <p className="mt-1 text-sm leading-relaxed text-mist-400">
            A wide logo with a transparent background looks best on the dark header.
          </p>
        )}

        {notice && !busy && !error && (
          <p role="status" className="mt-3 text-sm text-[#a8d08d]">
            ✓ {notice}
          </p>
        )}
        {error && (
          <Alert tone="error" className="mt-3">
            {errorMessage(error)}
          </Alert>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <input
            ref={fileInput}
            type="file"
            accept={rules.mimeTypes.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = '';
            }}
          />
          <Button size="sm" loading={upload.isPending} disabled={busy} onClick={() => fileInput.current?.click()}>
            {isVideo ? 'Upload New Video' : 'Upload New Logo'}
          </Button>
          {row && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmReset(true)}>
              Use Original
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmReset} onClose={() => !reset.isPending && setConfirmReset(false)} title={`Go back to the original ${isVideo ? 'video' : 'logo'}?`}>
        <p className="leading-relaxed text-ivory-200">
          The website will show the original {isVideo ? 'background video' : 'BuiltRight logo'} again, and the file you uploaded will be deleted.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Keep Mine
          </Button>
          <Button loading={reset.isPending} onClick={() => reset.mutate()}>
            Use Original
          </Button>
        </div>
      </Dialog>
    </article>
  );
}
