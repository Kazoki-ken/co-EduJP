'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { NavBar } from './NavBar';
import { Footer } from './Footer';
import api from '@/lib/api';
import {
  BookOpen,
  Gamepad2,
  Trophy,
  User,
  MessageCircle,
  Wrench,
  LogOut,
  Settings,
  Flame,
  LayoutDashboard,
  Library,
  ChevronRight,
  Crown
} from 'lucide-react';
import { cn, leagueIcon } from '@/lib/utils';

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
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

  // If still loading auth status, show a beautiful dark loading screen to prevent layout shifts
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-text-primary">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-xl">🎌</span>
        </div>
        <p className="text-text-secondary text-sm mt-4 font-semibold animate-pulse">
          Yuklanmoqda...
        </p>
      </div>
    );
  }

  // Guest Layout (unauthenticated)
  if (!isAuthenticated || !user) {
    return (
      <>
        <NavBar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </>
    );
  }

  // Authenticated Sidebar/Bottom-Nav Layout
  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dictionary', label: "Lug'at & Mavzular", icon: BookOpen },
    { href: '/library', label: "Mening lug'atim", icon: Library },
    { href: '/games', label: "Mashg'ulot & O'yinlar", icon: Gamepad2 },
    { href: '/chat', label: "AI Suhbatdosh", icon: MessageCircle },
    { href: '/leaderboard', label: 'Reyting', icon: Trophy },
    { href: '/tools', label: 'Uskunalar', icon: Wrench },
    { href: '/premium', label: 'Premium', icon: Crown },
    { href: '/profile', label: 'Mening Profilim', icon: User },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary flex">
      {/* ─── 1. Desktop Sidebar ────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed top-0 bottom-0 left-0 w-64 bg-surface border-r border-border/60 z-40">
        {/* Brand logo */}
        <div className="h-16 flex items-center px-6 border-b border-border/60">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl select-none group-hover:scale-110 transition-transform">🎌</span>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary to-diamond bg-clip-text text-transparent group-hover:opacity-90">
              {siteName}
            </span>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group',
                  active
                    ? 'bg-primary/15 text-primary border border-primary/20 shadow-glow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={cn('transition-transform group-hover:scale-110', active ? 'text-primary' : 'text-text-muted group-hover:text-text-primary')} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight size={14} className="text-primary" />}
              </Link>
            );
          })}

          {user.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group',
                pathname.startsWith('/admin')
                  ? 'bg-accent/15 text-accent border border-accent/20 shadow-glow-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              )}
            >
              <Settings size={18} className="text-text-muted group-hover:text-text-primary" />
              <span>Admin paneli</span>
            </Link>
          )}
        </nav>

        {/* Footer of Sidebar */}
        <div className="p-4 border-t border-border/60 space-y-2">
          {/* User profile preview */}
          <div className="flex items-center gap-3 p-2 rounded-xl bg-surface-2/40">
            <div className="w-9 h-9 rounded-full bg-primary/25 border border-primary/40 flex items-center justify-center font-bold text-primary text-sm uppercase">
              {user.username[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-primary truncate flex items-center gap-1.5">
                {user.username}
                {user.entitlements?.isPremium && (
                  <Crown size={11} className="text-accent shrink-0" aria-label="Premium" />
                )}
              </p>
              <p className="text-[10px] text-text-muted truncate capitalize">
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
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut size={16} />
            <span>Chiqish</span>
          </button>
        </div>
      </aside>

      {/* ─── 2. Main Page Layout (Header + Content) ────────────────────────── */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 pb-16 lg:pb-0">
        
        {/* Top Header */}
        <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-background/80 backdrop-blur-xl border-b border-border/60 z-30 flex items-center justify-between px-4 sm:px-6">
          {/* Mobile Logo / Page Title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="lg:hidden flex items-center gap-1.5 group">
              <span className="text-xl">🎌</span>
              <span className="font-black text-base bg-gradient-to-r from-primary to-diamond bg-clip-text text-transparent">
                {siteName}
              </span>
            </Link>
            
            {/* Page title on Desktop */}
            <span className="hidden lg:inline text-xs font-bold bg-surface-2 border border-border/40 text-text-muted px-2.5 py-1 rounded-full uppercase tracking-wider">
              {pathname === '/' ? 'Bosh sahifa' : navItems.find((i) => pathname.startsWith(i.href) && i.href !== '/')?.label || 'Ilova'}
            </span>
          </div>

          {/* Stats & Profile Dropdown */}
          <div className="flex items-center gap-2">
            {/* Streak */}
            <div className="stat-pill">
              <Flame
                size={14}
                className={cn(
                  'transition-colors',
                  (user.profile?.streak ?? 0) > 0 ? 'text-orange-400 animate-pulse-glow' : 'text-text-muted'
                )}
              />
              <span className="text-text-primary font-bold">{user.profile?.streak ?? 0}</span>
            </div>

            {/* Coins */}
            <div className="stat-pill">
              <span className="text-accent text-xs">🪙</span>
              <span className="text-text-primary font-bold">
                {(user.profile?.coins ?? 0).toLocaleString()}
              </span>
            </div>

            {/* Avatar Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary text-xs uppercase hover:border-primary transition-colors cursor-pointer"
              >
                {user.username[0]}
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 z-50 card-glass border border-border/80 animate-slide-in">
                    <div className="px-4 py-3 border-b border-border/50">
                      <p className="text-sm font-semibold text-text-primary truncate">{user.username}</p>
                      <p className="text-xs text-text-muted truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                      >
                        <User size={14} /> Mening profilim
                      </Link>
                      {user.role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                        >
                          <Settings size={14} /> Admin paneli
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors border-t border-border/40 mt-1"
                      >
                        <LogOut size={14} /> Chiqish
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 pt-16 px-4 sm:px-6 md:px-8">
          {children}
        </main>
      </div>

      {/* ─── 3. Mobile Bottom Navigation Bar ────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl border-t border-border/60 z-40 flex items-center justify-around px-2 pb-safe">
        {navItems.filter(item => ['/', '/dictionary', '/games', '/chat', '/profile'].includes(item.href)).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-all',
                active ? 'text-primary' : 'text-text-secondary'
              )}
            >
              <Icon size={20} className={cn(active && 'scale-110')} />
              <span className="text-[10px] font-bold tracking-tight">
                {item.href === '/' ? 'Home' : item.href === '/dictionary' ? "Lug'at" : item.href === '/games' ? "O'yinlar" : item.href === '/chat' ? 'AI Chat' : 'Profil'}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
