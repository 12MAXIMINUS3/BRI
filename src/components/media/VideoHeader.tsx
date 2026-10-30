import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { DEFAULT_HEADER_VIDEO, headerVideoUrl, siteMediaStore } from '@/config/images';
import { cn } from '@/lib/cn';

interface VideoHeaderProps {
  children: ReactNode;
  className?: string;
  /** Stronger overlay for headers with a lot of small text. */
  overlay?: 'normal' | 'strong';
}

/**
 * A page-header section with a muted, looping background video behind a dark
 * overlay that keeps gold and ivory text readable. The video is decorative
 * (hidden from assistive technology) and stays paused for visitors who ask
 * their system for reduced motion.
 */
export function VideoHeader({ children, className, overlay = 'normal' }: VideoHeaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // The video can be replaced in Admin → Logo & Photos. If the uploaded file
  // can't be played on this device, fall back to the original video.
  useSyncExternalStore(siteMediaStore.subscribe, siteMediaStore.getVersion);
  const preferred = headerVideoUrl();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = failedSrc === preferred ? DEFAULT_HEADER_VIDEO : preferred;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      if (query.matches) {
        video.pause();
        return;
      }
      // Autoplay can be blocked (e.g. battery saver); the overlay still looks right.
      video.play()?.catch(() => {});
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [src]);

  return (
    <section className={cn('relative isolate overflow-hidden border-b border-gold-500/20 bg-ink-950', className)}>
      <video
        ref={videoRef}
        className="absolute inset-0 -z-20 size-full object-cover"
        key={src}
        src={src}
        onError={() => {
          if (src !== DEFAULT_HEADER_VIDEO) setFailedSrc(src);
        }}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
      />
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 -z-10',
          overlay === 'strong'
            ? 'bg-gradient-to-r from-ink-950/95 via-ink-950/85 to-ink-950/70'
            : 'bg-gradient-to-r from-ink-950/90 via-ink-950/70 to-ink-950/45',
        )}
      />
      {/* Fade into the page below so the header edge feels intentional. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-ink-950 to-transparent" />
      {children}
    </section>
  );
}
