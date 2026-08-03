import type { Metadata } from "next";
import { Space_Grotesk, Newsreader, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Story Maker",
  description: "Draft stories with an AI co-writer, chapter by chapter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${newsreader.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-screen flex-col bg-ink text-paper">
        <header className="flex items-center justify-between border-b border-ink-line px-6 py-3">
          <Link href="/" className="flex items-center gap-2 font-display text-lg tracking-wide text-paper">
            <BookOpen size={18} /> Story Maker
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/40">
            draft &middot; revise &middot; bind
          </span>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
