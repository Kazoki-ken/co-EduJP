import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { NavBar } from '@/components/layout/NavBar';
import { Footer } from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'VocabJP — Japanese Vocabulary SRS',
    template: '%s | VocabJP',
  },
  description:
    'Master Japanese vocabulary with spaced-repetition, interactive games, AI practice, and a live league system.',
  keywords: ['Japanese', 'vocabulary', 'SRS', 'flashcards', 'language learning', 'kanji'],
  authors: [{ name: 'VocabJP' }],
  openGraph: {
    title: 'VocabJP — Japanese Vocabulary SRS',
    description: 'Master Japanese vocabulary with AI-powered spaced repetition.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased flex flex-col min-h-screen`}>
        {/* Google Identity Services — custom Google sign-in button uses window.google.accounts.id */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="beforeInteractive"
        />
        <AuthProvider>
          <NavBar />
          {/* Push content below the fixed NavBar */}
          <main className="flex-1 pt-16">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
