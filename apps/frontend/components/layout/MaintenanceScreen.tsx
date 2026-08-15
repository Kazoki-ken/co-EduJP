'use client';

import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { useSiteName } from '@/lib/siteConfig';

/**
 * Full-screen notice shown to everyone except admins while the site is closed
 * for maintenance. It carries no navigation on purpose — the rest of the app is
 * unreachable anyway — apart from the sign-in link, which is how an admin gets
 * back in to switch the mode off.
 */
export function MaintenanceScreen({ message }: { message: string }) {
  const siteName = useSiteName();

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex items-center gap-2 mb-10">
        <span className="text-2xl select-none">🎌</span>
        <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary to-diamond bg-clip-text text-transparent">
          {siteName}
        </span>
      </div>

      <div className="w-20 h-20 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mb-6">
        <Wrench size={34} className="text-accent" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold mb-3">
        Texnik ko&apos;rik ketyapti
      </h1>

      <p className="text-text-secondary max-w-md leading-relaxed">{message}</p>

      <p className="text-text-muted text-xs mt-8">
        Sahifa avtomatik tekshiriladi — ish tugagach o&apos;zi ochiladi.
      </p>

      <Link
        href="/auth/login"
        className="text-text-muted/60 hover:text-text-muted text-xs mt-6 underline underline-offset-4"
      >
        Administrator kirishi
      </Link>
    </div>
  );
}
