'use client';

import { useEffect, useState } from 'react';
import api, { MAINTENANCE_EVENT } from '@/lib/api';

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
  /** 'on' while the site is closed for maintenance. */
  maintenance_mode?: string;
  maintenance_message?: string;
}

export const DEFAULT_MAINTENANCE_MESSAGE =
  "Saytda texnik ko'rik ketyapti. Iltimos, birozdan so'ng qayta urinib ko'ring.";

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

export interface MaintenanceState {
  /** null while the first check is still in flight. */
  on: boolean | null;
  message: string;
}

/**
 * Whether the site is closed for maintenance.
 *
 * This deliberately bypasses the module-scope cache above: the flag can flip
 * mid-session in both directions, so it is re-read on mount, every 45 seconds,
 * and the moment a request comes back 503.
 */
export function useMaintenance(): MaintenanceState {
  const [state, setState] = useState<MaintenanceState>({
    on: null,
    message: DEFAULT_MAINTENANCE_MESSAGE,
  });

  useEffect(() => {
    let alive = true;

    const check = async () => {
      try {
        const { data } = await api.get<SiteConfig>('/config/public');
        if (!alive) return;
        setState({
          on: data.maintenance_mode === 'on',
          message: data.maintenance_message?.trim() || DEFAULT_MAINTENANCE_MESSAGE,
        });
      } catch {
        // A failed check must not lock anyone out — an unreachable API already
        // shows its own errors on the pages that needed it.
        if (alive) setState((prev) => ({ ...prev, on: prev.on ?? false }));
      }
    };

    check();
    const timer = setInterval(check, 45_000);

    const onBlocked = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setState({
        on: true,
        message: detail?.message?.trim() || DEFAULT_MAINTENANCE_MESSAGE,
      });
    };
    window.addEventListener(MAINTENANCE_EVENT, onBlocked);

    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener(MAINTENANCE_EVENT, onBlocked);
    };
  }, []);

  return state;
}

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
