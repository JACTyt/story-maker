import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

/** Header for the non-editor pages; the chapter page draws its own denser bar. */
export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-5 py-2.5">
      <Link href="/" className="flex items-center gap-2 font-semibold text-fg">
        <BookOpen size={17} /> Story Maker
      </Link>
      {children}
      <span className="flex-1" />
      <ThemeToggle />
    </header>
  );
}
