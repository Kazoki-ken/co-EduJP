'use client';

import Link from 'next/link';
import { useSiteName } from '@/lib/siteConfig';

/**
 * Guest footer. It is only rendered on the signed-out shell, so the links point
 * at pages a visitor can actually open — the app's own sections (games,
 * leaderboard, tools) all sit behind the login wall and used to dead-end here.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const siteName = useSiteName();

  const columns = [
    {
      title: 'Mahsulot',
      links: [
        { href: '/#imkoniyatlar', label: 'Imkoniyatlar' },
        { href: '/#qanday-ishlaydi', label: 'Qanday ishlaydi' },
        { href: '/dictionary', label: "Lug'at" },
      ],
    },
    {
      title: 'Boshlash',
      links: [
        { href: '/auth/register', label: "Ro'yxatdan o'tish" },
        { href: '/auth/login', label: 'Kirish' },
        { href: '/premium', label: 'Premium' },
      ],
    },
    {
      title: 'Yordam',
      links: [
        { href: '/#savollar', label: 'Savollar' },
        { href: '/#tariflar', label: 'Tariflar' },
      ],
    },
  ];

  return (
    <footer className="border-t border-border/60 bg-surface/40 mt-auto">
      <div className="page-container py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🎌</span>
              <span className="font-black text-text-primary text-lg tracking-tight">{siteName}</span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed max-w-xs">
              {"Yapon tili so'z boyligini oraliqli takrorlash, o'yinlar va AI amaliyoti bilan o'rganish platformasi."}
            </p>
          </div>

          {columns.map(({ title, links }) => (
            <div key={title}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted mb-4">
                {title}
              </p>
              <ul className="space-y-2.5">
                {links.map(({ href, label }) => (
                  <li key={href + label}>
                    <Link
                      href={href}
                      className="text-sm text-text-secondary hover:text-primary transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-text-muted text-xs">
            {'© '}{year}{' '}{siteName}
          </p>
          <p className="text-text-muted text-xs">
            {"Yapon tilini o'rganuvchilar uchun ❤️ bilan yaratildi"}
          </p>
        </div>
      </div>
    </footer>
  );
}
