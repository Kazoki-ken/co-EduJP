'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Tag, Upload, Settings, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin',         label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { href: '/admin/users',   label: 'Users',        icon: Users            },
  { href: '/admin/topics',  label: 'Manage Topics', icon: Tag             },
  { href: '/admin/upload',  label: 'Bulk Upload',  icon: Upload           },
  { href: '/admin/config',  label: 'Site Config',  icon: Settings         },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0">
      <div className="card-glass p-2 sticky top-20">
        <p className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-widest">
          Admin Panel
        </p>
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-primary/20 text-primary'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
              )}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={15} />
                {label}
              </span>
              {active && <ChevronRight size={13} className="text-primary/60" />}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
