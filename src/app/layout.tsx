import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
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
    // The boot script sets data-theme before hydration, so the attribute is
    // expected to differ from the server render.
    <html lang="en" className={`${newsreader.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex h-full min-h-screen flex-col bg-bg text-fg">{children}</body>
    </html>
  );
}
