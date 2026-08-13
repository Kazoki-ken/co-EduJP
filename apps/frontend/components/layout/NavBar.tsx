'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BookOpen,
  Compass,
  Crown,
  HelpCircle,
  Sparkles,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  Flame,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn, leagueIcon } from '@/lib/utils';
import { useSiteName } from '@/lib/siteConfig';
import { ThemeToggleButton } from '@/components/layout/ThemeToggle';

// ─── Nav Items ────────────────────────────────────────────────────────────────

/**
 * This navbar is rendered for signed-out visitors only (AppLayoutShell swaps in
 * the sidebar once you are logged in), so it advertises the product rather than
 * listing the app's sections. Games, leagues, AI and tools all need an account,
 * so linking them from here only produced login walls; they are presented as
 * content on the landing page instead.
 *
 * `Lug'at` stays because the dictionary is genuinely browsable while logged out.
 * The rest are anchors into the landing page sections.
 */
const NAV_ITEMS = [
  { href: '/dictionary',        label: "Lug'at",          icon: BookOpen },
  { href: '/#imkoniyatlar',     label: 'Imkoniyatlar',    icon: Sparkles },
  { href: '/#qanday-ishlaydi',  label: 'Qanday ishlaydi', icon: Compass },
  { href: '/#tariflar',         label: 'Tariflar',        icon: Crown },
  { href: '/#savollar',         label: 'Savollar',        icon: HelpCircle },
];

// ─── NavBar ───────────────────────────────────────────────────────────────────

export function NavBar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const siteName = useSiteName();

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <nav className="page-container flex items-center justify-between h-full gap-4">

        {/* ── Logo ─────────────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <span className="text-2xl select-none">🎌</span>
          <span className="font-extrabold text-lg tracking-tight
                           bg-gradient-to-r from-primary to-diamond bg-clip-text text-transparent
                           group-hover:opacity-90 transition-opacity">
            {siteName}
          </span>
        </Link>

        {/* ── Desktop Nav Links ─────────────────────────────────────── */}
        <ul className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-primary/20 text-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* ── Right Side ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2">

          {isLoading ? (
            <div className="h-8 w-24 skeleton rounded-lg" />
          ) : isAuthenticated && user ? (
            <>
              {/* ── Streak Pill ─────────────────────────── */}
              <div className="stat-pill hidden sm:flex">
                <Flame
                  size={14}
                  className={cn(
                    'transition-colors',
                    (user.profile?.streak ?? 0) > 0
                      ? 'text-orange-400 animate-pulse-glow'
                      : 'text-text-muted',
                  )}
                />
                <span className="text-text-primary font-semibold">
                  {user.profile?.streak ?? 0}
                </span>
              </div>

              {/* ── Coins Pill ──────────────────────────── */}
              <div className="stat-pill hidden sm:flex">
                <span className="text-accent">🪙</span>
                <span className="text-text-primary font-semibold">
                  {(user.profile?.coins ?? 0).toLocaleString()}
                </span>
              </div>

              {/* ── Profile Dropdown ────────────────────── */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg
                             hover:bg-surface-2 transition-colors group"
                  aria-label="Open profile menu"
                >
                  {/* Avatar circle */}
                  <div className="w-8 h-8 rounded-full bg-primary/30 border border-primary/50
                                  flex items-center justify-center text-sm font-bold text-primary
                                  group-hover:border-primary transition-colors">
                    {user.username[0]?.toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-text-primary leading-none">
                      {user.username}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {leagueIcon(user.profile?.league ?? 'BRONZE')}{' '}
                      {{
                        BRONZE: 'Bronza',
                        SILVER: 'Kumush',
                        GOLD: 'Oltin',
                        PLATINUM: 'Platina',
                        DIAMOND: 'Olmos',
                      }[user.profile?.league ?? 'BRONZE'] ?? (user.profile?.league ?? 'BRONZE')} ligasi
                    </p>
                  </div>
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-52 z-50
                                    card-glass border border-border/80 animate-slide-in">
                      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-border">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{user.username}</p>
                          <p className="text-xs text-text-muted truncate">{user.email}</p>
                        </div>
                        <ThemeToggleButton className="-mr-1 shrink-0 border border-border" />
                      </div>
                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary
                                     hover:text-text-primary hover:bg-surface-2 transition-colors"
                        >
                          <User size={14} /> Mening profilim
                        </Link>
                        {user.role === 'ADMIN' && (
                          <Link
                            href="/admin"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary
                                       hover:text-text-primary hover:bg-surface-2 transition-colors"
                          >
                            <Settings size={14} /> Admin paneli
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm
                                     text-danger hover:bg-danger/10 transition-colors"
                        >
                          <LogOut size={14} /> Chiqish
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <ThemeToggleButton />
              {/* On a phone the ghost button competes with the hamburger for
                  the same strip, so it moves into the dropdown below. */}
              <Link href="/auth/login" className="btn-ghost text-sm py-2 px-4 hidden sm:inline-flex">
                Kirish
              </Link>
              <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
                Boshlash
              </Link>
            </div>
          )}

          {/* ── Mobile Menu Toggle ───────────────────────────────── */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg hover:bg-surface-2 transition-colors
                       text-text-secondary hover:text-text-primary"
            aria-label="Toggle mobile menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile Dropdown ────────────────────────────────────────── */}
      {menuOpen && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl
                        animate-slide-in px-4 py-3 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}

          {/* Guest actions — the ghost "Kirish" is hidden in the top strip on
              phones, so it lives here instead. */}
          {!isAuthenticated && (
            <div className="flex gap-2 pt-3 border-t border-border/60 mt-2 sm:hidden">
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="btn-ghost flex-1 text-sm text-center"
              >
                Kirish
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMenuOpen(false)}
                className="btn-primary flex-1 text-sm text-center"
              >
                Boshlash
              </Link>
            </div>
          )}

          {/* Mobile stats */}
          {isAuthenticated && user && (
            <div className="flex gap-2 pt-2 border-t border-border mt-2">
              <div className="stat-pill flex-1 justify-center">
                <Flame size={14} className="text-orange-400" />
                <span className="text-text-primary font-semibold">{user.profile?.streak ?? 0}</span>
              </div>
              <div className="stat-pill flex-1 justify-center">
                <span>🪙</span>
                <span className="text-text-primary font-semibold">
                  {(user.profile?.coins ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
