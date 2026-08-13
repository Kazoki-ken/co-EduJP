import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider, THEME_INIT_SCRIPT } from '@/context/ThemeContext';
import { AppLayoutShell } from '@/components/layout/AppLayoutShell';
import { GoogleOAuthProvider } from '@react-oauth/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/* The landing page is the first thing a visitor sees, and it is written in
   Uzbek — the search snippet and share preview should match it. */
export const metadata: Metadata = {
  title: {
    default: "VocabJP — Yapon tili so'zlarini o'rganish platformasi",
    template: '%s | VocabJP',
  },
  description:
    "Yaponcha so'z boyligini oraliqli takrorlash (SRS), 6 xil o'yin, AI suhbatdosh va JLPT N5–N1 darajalari bilan o'rganing. Ro'yxatdan o'tish bepul.",
  keywords: [
    'yapon tili', "yaponcha so'zlar", 'JLPT', 'SRS', 'kanji', 'hiragana',
    "yapon tilini o'rganish", 'Japanese vocabulary',
  ],
  authors: [{ name: 'VocabJP' }],
  openGraph: {
    title: "VocabJP — Yapon tili so'zlarini o'rganish platformasi",
    description:
      "Oraliqli takrorlash, o'yinlar va AI amaliyoti bilan yaponcha so'zlarni unutmaydigan qilib o'rganing.",
    type: 'website',
    locale: 'uz_UZ',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased flex flex-col min-h-screen`}>
        <GoogleOAuthProvider clientId="156336295197-pjb6ocbui8t994dhdg4nv827a22f8e84.apps.googleusercontent.com">
          <ThemeProvider>
            <AuthProvider>
              <AppLayoutShell>
                {children}
              </AppLayoutShell>
            </AuthProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
