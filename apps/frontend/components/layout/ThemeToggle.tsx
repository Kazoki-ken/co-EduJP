'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

/* Compact icon button — sits in the profile dropdown header for signed-in
   users, and directly in the navbar for signed-out visitors. */
export function ThemeToggleButton({
  className,
  size = 18,
}: {
  className?: string;
  /** Icon size in px — smaller where the button sits inside a dense row. */
  size?: number;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Kunduzgi rejimga o‘tish' : 'Tungi rejimga o‘tish'}
      title={isDark ? 'Kunduzgi rejim' : 'Tungi rejim'}
      className={cn(
        'p-2 rounded-lg text-text-secondary hover:text-text-primary',
        'hover:bg-surface-2 transition-colors',
        className,
      )}
    >
      {isDark ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  );
}
