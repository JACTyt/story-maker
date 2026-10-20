// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("switches to dark, sets the html attribute and remembers it", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: /dark theme/i }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("starts from the theme the boot script applied", async () => {
    document.documentElement.dataset.theme = "dark";
    render(<ThemeToggle />);
    expect(await screen.findByRole("button", { name: /light theme/i })).toBeInTheDocument();
  });
});
