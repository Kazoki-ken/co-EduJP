'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

/**
 * Public site settings, fetched once per page load.
 *
 * Three components wanted the site name — the app shell, the guest navbar and
 * the chat header — and each fetched it independently. The shell renders the
 * navbar, so a signed-out visitor fired the same request twice on every
 * navigation; one of the pair was measured taking 1.2 s.
 *
 * The promise is cached at module scope rather than in a provider: the value
 * never changes during a session, so there is nothing to re-render on, and a
 * provider would only add a tree wrapper to achieve the same thing.
 */

export interface SiteConfig {
  site_name?: string;
}

let cache: Promise<SiteConfig> | null = null;

/** Shared fetch. Concurrent callers get the same in-flight promise. */
export const loadSiteConfig = (): Promise<SiteConfig> => {
  cache ??= api
    .get<SiteConfig>('/config/public')
    .then(({ data }) => data)
    .catch(() => {
      // Let a later caller retry rather than caching the failure forever —
      // the shell asks again on the next navigation.
      cache = null;
      return {};
    });
  return cache;
};

/** The site name, with the product default until the request resolves. */
export function useSiteName(fallback = 'VocabJP'): string {
  const [name, setName] = useState(fallback);

  useEffect(() => {
    let alive = true;
    loadSiteConfig().then((cfg) => {
      if (alive && cfg.site_name) setName(cfg.site_name);
    });
    return () => {
      alive = false;
    };
  }, []);

  return name;
}
