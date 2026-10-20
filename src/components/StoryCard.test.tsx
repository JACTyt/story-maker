// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoryCard } from "./StoryCard";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const story = { id: 3, title: "Harbour", premise: "A crossing." };

function renderCard(overrides: Partial<React.ComponentProps<typeof StoryCard>> = {}) {
  const props = { story, coverId: null, onCoverChanged: vi.fn(), onDuplicated: vi.fn(), onDeleted: vi.fn(), ...overrides };
  render(<StoryCard {...props} />);
  return props;
}

describe("StoryCard", () => {
  it("asks before deleting, and only deletes on confirmation", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal("fetch", fetchMock);
    const props = renderCard();

    await userEvent.click(screen.getByRole("button", { name: /delete story/i }));
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /delete story/i }));
    await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    await waitFor(() => expect(props.onDeleted).toHaveBeenCalledWith(3));
    expect(fetchMock).toHaveBeenCalledWith("/api/stories/3", { method: "DELETE" });
  });

  it("makes a copy and hands it to the shelf", async () => {
    const copy = { id: 9, title: "Harbour (copy)", premise: "A crossing." };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify(copy), { status: 201 }))));
    const props = renderCard();
    await userEvent.click(screen.getByRole("button", { name: /make a copy/i }));
    await waitFor(() => expect(props.onDuplicated).toHaveBeenCalledWith(copy));
  });
});
