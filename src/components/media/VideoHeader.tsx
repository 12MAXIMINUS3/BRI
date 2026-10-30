import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Background video shown behind page headers. Replace the file to change it. */
export const HEADER_VIDEO_SRC = '/media/workshop.mp4';

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
  }, []);

  return (
    <section className={cn('relative isolate overflow-hidden border-b border-gold-500/20 bg-ink-950', className)}>
      <video
        ref={videoRef}
        className="absolute inset-0 -z-20 size-full object-cover"
        src={HEADER_VIDEO_SRC}
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
