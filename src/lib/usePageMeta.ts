import { useEffect } from 'react';
import { business } from '@/config/business';

export interface PageMetaOptions {
  /** Page-specific title. Omit on the home page. */
  title?: string;
  description: string;
  noIndex?: boolean;
}

function setMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (content === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * Updates the document title and description for client-side navigation.
 * Search engines that do not run JavaScript only see the defaults in
 * index.html; see "SEO" in the README.
 */
export function usePageMeta({ title, description, noIndex = false }: PageMetaOptions) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${business.name}` : `${business.name} | ${business.tagline}`;
    document.title = fullTitle;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'website');
    setMeta('name', 'robots', noIndex ? 'noindex' : null);
  }, [title, description, noIndex]);
}
