'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Timer, Languages, Wrench, ChevronRight, type LucideIcon } from 'lucide-react';

const TOOLS: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  tone: string;
  border: string;
}[] = [
  {
    href:  '/tools/pomodoro',
    icon:  Timer,
    title: 'Pomodoro Timer',
    desc:  'Focus sessions with short and long breaks. Built-in AudioContext chime when time is up.',
    tone:  'text-rose-400 bg-rose-500/10 border-rose-500/20',
    border: 'hover:border-rose-500/50',
  },
  {
    href:  '/tools/alifbo',
    icon:  Languages,
    title: 'Kana Reference',
    desc:  'Full hiragana and katakana chart. Click any character to hear its pronunciation.',
    tone:  'text-sky-400 bg-sky-500/10 border-sky-500/20',
    border: 'hover:border-sky-500/50',
  },
];

export default function ToolsPage() {
  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-text-primary mb-2 flex items-center justify-center gap-2.5">
          <Wrench size={26} className="text-primary" />
          Study Tools
        </h1>
        <p className="text-text-muted">Utilities to support your Japanese learning journey.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
        {TOOLS.map(({ href, icon: Icon, title, desc, tone, border }, i) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link
              href={href}
              className={`group card-glass p-7 flex flex-col gap-4 hover:-translate-y-1
                          transition-all duration-200 ${border}`}
            >
              <span
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center
                            group-hover:scale-105 transition-transform ${tone}`}
              >
                <Icon size={22} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors mb-1 flex items-center gap-1.5">
                  {title}
                  <ChevronRight
                    size={16}
                    className="text-text-muted opacity-0 -translate-x-1 group-hover:opacity-100
                               group-hover:translate-x-0 transition-all"
                  />
                </h2>
                <p className="text-sm text-text-muted">{desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
