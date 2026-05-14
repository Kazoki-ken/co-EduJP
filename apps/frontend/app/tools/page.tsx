'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const TOOLS = [
  {
    href:  '/tools/pomodoro',
    icon:  '🍅',
    title: 'Pomodoro Timer',
    desc:  'Focus sessions with short and long breaks. Built-in AudioContext chime when time is up.',
    gradient: 'from-red-600/20 to-rose-900/20',
    border:   'hover:border-rose-500/50',
  },
  {
    href:  '/tools/alifbo',
    icon:  '🈳',
    title: 'Kana Reference',
    desc:  'Full hiragana and katakana chart. Click any character to hear its pronunciation.',
    gradient: 'from-sky-600/20 to-blue-900/20',
    border:   'hover:border-sky-500/50',
  },
];

export default function ToolsPage() {
  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-text-primary mb-2">🛠️ Study Tools</h1>
        <p className="text-text-muted">Utilities to support your Japanese learning journey.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
        {TOOLS.map((tool, i) => (
          <motion.div
            key={tool.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link
              href={tool.href}
              className={`group card-glass p-7 flex flex-col gap-4 hover:-translate-y-1
                          transition-all duration-200 ${tool.border}`}
            >
              <span className="text-4xl">{tool.icon}</span>
              <div>
                <h2 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors mb-1">
                  {tool.title}
                </h2>
                <p className="text-sm text-text-muted">{tool.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
