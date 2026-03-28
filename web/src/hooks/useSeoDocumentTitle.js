import { useEffect } from 'react';
import { DEFAULT_PAGE_TITLE } from '../config/seoSlugs';

/**
 * Sets document.title from SEO config; restores default on unmount or when SEO is absent.
 * @param {{ title: string } | null} seo
 */
export function useSeoDocumentTitle(seo) {
  useEffect(() => {
    document.title = seo ? seo.title : DEFAULT_PAGE_TITLE;
    return () => {
      document.title = DEFAULT_PAGE_TITLE;
    };
  }, [seo]);
}
