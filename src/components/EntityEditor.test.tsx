// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntityEditor } from "./EntityEditor";
import { ChapterRail } from "./ChapterRail";
import type { BibleState, Bible } from "@/lib/bibleClient";
import { entityViews } from "@/lib/bibleClient";
import { buildMatcher } from "@/lib/mentions";
import { bibleMentionEntities } from "@/lib/bibleEntities";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function makeBible(): Bible {
  return {
    characters: [
      {
        id: 1,
        storyId: 1,
        name: "Elizabeth",
        aliases: ["Liz"],
        role: "protagonist",
        summary: "Runs from debts.",
        appearance: "",
        personality: "",
        backstory: "",
        goals: "",
        notes: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    places: [],
    themes: [],
    timeline: [],
    relationships: [],
    chapters: [{ id: 7, title: "The Crossing", orderIndex: 0, status: "generated" }],
    portraits: {},
    appearances: { "character:1": [{ chapterId: 7, count: 3 }] },
  };
}

function state(bible = makeBible()): BibleState {
  const views = entityViews(bible);
  return {
    bible,
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
    views,
    byKey: new Map(views.map((v) => [v.key, v])),
    matcher: buildMatcher(bibleMentionEntities(bible)),
  };
}

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe("EntityEditor", () => {
  it("shows an existing character's fields, aliases and where it appears", () => {
    vi.stubGlobal("fetch", vi.fn(() => ok([])));
    render(<EntityEditor storyId="1" bible={state()} target={{ key: "character:1" }} />);
    expect(screen.getByDisplayValue("Elizabeth")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Liz")).toBeInTheDocument();
    expect(screen.getByText("The Crossing")).toBeInTheDocument();
    expect(screen.getByText(/3 mentions/)).toBeInTheDocument();
  });

  it("creates a new place prefilled from the selection, sending aliases as a list", async () => {
    const fetchMock = vi.fn(() => ok({ id: 9 }));
    vi.stubGlobal("fetch", fetchMock);
    const bible = state();
    const onSaved = vi.fn();
    render(<EntityEditor storyId="1" bible={bible} target={{ create: "place", name: "Old Harbour" }} onSaved={onSaved} />);
    expect(screen.getByDisplayValue("Old Harbour")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/also called/i), "the harbour, docks");
    await userEvent.click(screen.getByRole("button", { name: /add place/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("place:9"));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/stories/1/places");
    expect(JSON.parse(String(init.body)).aliases).toEqual(["the harbour", "docks"]);
    expect(bible.refresh).toHaveBeenCalled();
  });
});

describe("ChapterRail", () => {
  it("lists entities mentioned in the prose and lights them up on hover", async () => {
    const onFocus = vi.fn();
    render(
      <ChapterRail storyId="1" bible={state()} chapterId={7} prose="Liz ran." activeKey={null} onOpen={vi.fn()} onFocus={onFocus} />
    );
    const row = screen.getByRole("button", { name: /elizabeth/i });
    await userEvent.hover(row);
    expect(onFocus).toHaveBeenCalledWith("character:1");
  });

  it("says when nothing is mentioned", () => {
    render(<ChapterRail storyId="1" bible={state()} chapterId={7} prose="Nobody here." activeKey={null} onOpen={vi.fn()} onFocus={vi.fn()} />);
    expect(screen.getByText(/no characters, places or events mentioned yet/i)).toBeInTheDocument();
  });
});
