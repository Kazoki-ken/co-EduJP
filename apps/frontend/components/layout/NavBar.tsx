'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  BookOpen,
  Gamepad2,
  Trophy,
  User,
  MessageCircle,
  Wrench,
  Menu,
  X,
  LogOut,
  Settings,
  Flame,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn, leagueIcon } from '@/lib/utils';

// ─── Nav Items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/',             label: 'Home',        icon: BookOpen   },
  { href: '/dictionary',   label: 'Dictionary',  icon: BookOpen   },
  { href: '/games',        label: 'Games',       icon: Gamepad2   },
  { href: '/leaderboard',  label: 'Leaderboard', icon: Trophy     },
  { href: '/chat',         label: 'AI Chat',     icon: MessageCircle },
  { href: '/tools',        label: 'Tools',       icon: Wrench     },
];

// ─── NavBar ───────────────────────────────────────────────────────────────────

export function NavBar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [siteName, setSiteName] = useState('VocabJP');

  useEffect(() => {
    api.get<{ site_name?: string }>('/config/public')
      .then(({ data }) => { if (data.site_name) setSiteName(data.site_name); })
      .catch(() => {});
  }, []);

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
                      {user.profile?.league ?? 'BRONZE'}
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
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-text-primary">{user.username}</p>
                        <p className="text-xs text-text-muted">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary
                                     hover:text-text-primary hover:bg-surface-2 transition-colors"
                        >
                          <User size={14} /> My Profile
                        </Link>
                        {user.role === 'ADMIN' && (
                          <Link
                            href="/admin"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary
                                       hover:text-text-primary hover:bg-surface-2 transition-colors"
                          >
                            <Settings size={14} /> Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm
                                     text-danger hover:bg-danger/10 transition-colors"
                        >
                          <LogOut size={14} /> Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className="btn-ghost text-sm py-2 px-4">
                Sign In
              </Link>
              <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
                Get Started
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
