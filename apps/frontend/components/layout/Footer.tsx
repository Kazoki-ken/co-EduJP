import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-surface/40 mt-auto">
      <div className="page-container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="text-xl">🎌</span>
            <span className="font-bold text-text-primary">VocabJP</span>
            <span className="text-text-muted text-sm ml-2">
              — Japanese Vocabulary SRS Platform
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-text-muted">
            <Link href="/dictionary" className="hover:text-text-primary transition-colors">
              Dictionary
            </Link>
            <Link href="/games" className="hover:text-text-primary transition-colors">
              Games
            </Link>
            <Link href="/leaderboard" className="hover:text-text-primary transition-colors">
              Leaderboard
            </Link>
            <Link href="/tools/alifbo" className="hover:text-text-primary transition-colors">
              Alifbo
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-text-muted text-xs">
            © {year} VocabJP. Built with ❤️ for Japanese learners.
          </p>
        </div>
      </div>
    </footer>
  );
}
