// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SuggestionCard } from "./SuggestionCard";

describe("SuggestionCard", () => {
  it("renders the suggestion and calls onAccept with edited fields", async () => {
    const onAccept = vi.fn();
    const onDismiss = vi.fn();
    render(
      <SuggestionCard
        suggestion={{ type: "character", name: "Mira", description: "A smuggler" }}
        onAccept={onAccept}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByDisplayValue("Mira")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Accept"));
    expect(onAccept).toHaveBeenCalledWith({ type: "character", name: "Mira", description: "A smuggler" });

    await userEvent.click(screen.getByText("Dismiss"));
    expect(onDismiss).toHaveBeenCalled();
  });
});
