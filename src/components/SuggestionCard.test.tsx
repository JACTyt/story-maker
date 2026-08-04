// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SuggestionCard } from "./SuggestionCard";

describe("SuggestionCard", () => {
  it("renders a place/theme/timeline suggestion with a single description field", async () => {
    const onAccept = vi.fn();
    const onDismiss = vi.fn();
    render(
      <SuggestionCard
        suggestion={{ type: "place", name: "Docking bay", description: "A rusted platform" }}
        onAccept={onAccept}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByDisplayValue("Docking bay")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Accept"));
    expect(onAccept).toHaveBeenCalledWith({ type: "place", name: "Docking bay", description: "A rusted platform" });

    await userEvent.click(screen.getByText("Dismiss"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("renders a character suggestion with separate appearance and personality fields", async () => {
    const onAccept = vi.fn();
    render(
      <SuggestionCard
        suggestion={{ type: "character", name: "Mira", appearance: "Scar over one eyebrow", personality: "Guarded" }}
        onAccept={onAccept}
        onDismiss={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("Mira")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Scar over one eyebrow")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Guarded")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Personality")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Accept"));
    expect(onAccept).toHaveBeenCalledWith({
      type: "character",
      name: "Mira",
      appearance: "Scar over one eyebrow",
      personality: "Guarded",
    });
  });
});
