// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChapterList, StoryHeader } from "./StoryOverviewParts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const chapters = [
  { id: 1, title: "The Map", orderIndex: 0, status: "generated" },
  { id: 2, title: "The Crossing", orderIndex: 1, status: "drafting" },
];

describe("ChapterList", () => {
  it("deletes a chapter only after confirmation", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal("fetch", fetchMock);
    const onChange = vi.fn();
    render(<ChapterList storyId="5" chapters={chapters} castFor={() => []} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete The Crossing" }));
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith([chapters[0]]));
    expect(fetchMock).toHaveBeenCalledWith("/api/stories/5/chapters/2", { method: "DELETE" });
  });

  it("lists chapters in reading order with who appears in them", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<ChapterList storyId="5" chapters={[...chapters].reverse()} castFor={(id) => (id === 1 ? ["Liz", "Tom"] : [])} onChange={vi.fn()} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent("The Map");
    expect(links[0]).toHaveTextContent("Liz, Tom");
  });
});

describe("StoryHeader", () => {
  it("saves an edited title on blur", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) =>
      Promise.resolve(new Response(init?.method === "PATCH" ? "{}" : "[]", { status: 200 }))
    );
    vi.stubGlobal("fetch", fetchMock);
    const onChange = vi.fn();
    render(<StoryHeader story={{ id: 5, title: "Harbour", premise: "" }} onChange={onChange} />);
    const title = screen.getByRole("textbox", { name: /story title/i });
    await userEvent.clear(title);
    await userEvent.type(title, "The Harbour{enter}");
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ title: "The Harbour" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/stories/5", expect.objectContaining({ method: "PATCH" }));
  });
});
