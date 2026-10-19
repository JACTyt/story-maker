// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProseHistory } from "./ProseHistory";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Returns a factory, not a Response: a body can only be read once, so reusing
// one instance across the list fetch and the revert fetch empties it.
function respondWith(versions: unknown[]) {
  return vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(versions))));
}

const twoVersions = [
  { id: 2, content: "Second draft here.", source: "generated", model: "claude-opus-5", createdAt: 1757000000000 },
  { id: 1, content: "First draft.", source: "generated", model: null, createdAt: 1756900000000 },
];

describe("ProseHistory", () => {
  it("lists each saved draft with its word count", async () => {
    vi.stubGlobal("fetch", respondWith(twoVersions));

    render(<ProseHistory storyId="1" chapterId="2" refreshToken={0} onReverted={() => {}} />);

    expect(await screen.findByText(/3 words/)).toBeInTheDocument();
    expect(screen.getByText(/2 words/)).toBeInTheDocument();
  });

  it("labels the newest draft as current", async () => {
    vi.stubGlobal("fetch", respondWith(twoVersions));

    render(<ProseHistory storyId="1" chapterId="2" refreshToken={0} onReverted={() => {}} />);

    expect(await screen.findByText(/current/i)).toBeInTheDocument();
  });

  it("offers no revert control for the draft already in use", async () => {
    vi.stubGlobal("fetch", respondWith([twoVersions[0]]));

    render(<ProseHistory storyId="1" chapterId="2" refreshToken={0} onReverted={() => {}} />);

    await screen.findByText(/current/i);
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();
  });

  it("restores an older draft through the revert endpoint", async () => {
    const fetchMock = respondWith(twoVersions);
    vi.stubGlobal("fetch", fetchMock);
    const onReverted = vi.fn();

    render(<ProseHistory storyId="1" chapterId="2" refreshToken={0} onReverted={onReverted} />);
    await userEvent.click(await screen.findByRole("button", { name: /restore/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/stories/1/chapters/2/versions/1/revert",
        expect.objectContaining({ method: "POST" })
      );
      expect(onReverted).toHaveBeenCalled();
    });
  });

  it("shows what changed between an older draft and the current one", async () => {
    vi.stubGlobal("fetch", respondWith(twoVersions));

    render(<ProseHistory storyId="1" chapterId="2" refreshToken={0} onReverted={() => {}} />);
    await userEvent.click(await screen.findByRole("button", { name: /compare/i }));

    expect(await screen.findByText("First draft.")).toBeInTheDocument();
    expect(screen.getByText("Second draft here.")).toBeInTheDocument();
  });

  it("explains itself when no draft has been saved yet", async () => {
    vi.stubGlobal("fetch", respondWith([]));

    render(<ProseHistory storyId="1" chapterId="2" refreshToken={0} onReverted={() => {}} />);

    expect(await screen.findByText(/no drafts saved yet/i)).toBeInTheDocument();
  });
});
