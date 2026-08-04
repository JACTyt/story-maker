// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntityListPage } from "./EntityListPage";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

const CHARACTER_FIELDS = [
  { key: "name", label: "Name" },
  { key: "appearance", label: "Appearance", multiline: true },
  { key: "personality", label: "Personality", multiline: true },
];

describe("EntityListPage", () => {
  it("is disabled until a name is entered, then fills fields from the suggest-entity endpoint", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ appearance: "Scar over one eyebrow", personality: "Guarded but loyal" }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EntityListPage storyId="1" resourcePath="characters" title="Characters" fields={CHARACTER_FIELDS} />
    );

    const suggestButton = await screen.findByText("Suggest");
    expect(suggestButton.closest("button")).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText("Name"), "Zara");
    expect(suggestButton.closest("button")).toBeEnabled();

    await userEvent.click(suggestButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, suggestCall] = fetchMock.mock.calls;
    expect(suggestCall[0]).toBe("/api/stories/1/suggest-entity");
    expect(JSON.parse(suggestCall[1].body)).toEqual({ type: "character", name: "Zara" });

    expect(await screen.findByDisplayValue("Scar over one eyebrow")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Guarded but loyal")).toBeInTheDocument();
  });

  it("shows an inline error when the suggest-entity request fails", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "provider unreachable" }, 502));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EntityListPage storyId="1" resourcePath="characters" title="Characters" fields={CHARACTER_FIELDS} />
    );

    await userEvent.type(await screen.findByPlaceholderText("Name"), "Zara");
    await userEvent.click(screen.getByText("Suggest"));

    expect(await screen.findByText("provider unreachable")).toBeInTheDocument();
  });

  it("regenerates an existing item's fields via the Regenerate button in edit mode", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ id: 1, name: "Zara", appearance: "Old appearance", personality: "Old personality" }])
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ appearance: "A hacker's cybernetic eye", personality: "Paranoid but brilliant" })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EntityListPage storyId="1" resourcePath="characters" title="Characters" fields={CHARACTER_FIELDS} />
    );

    await screen.findByText("Zara");
    await userEvent.click(screen.getByText("Edit"));
    await userEvent.click(screen.getByText("Regenerate"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, suggestCall] = fetchMock.mock.calls;
    expect(suggestCall[0]).toBe("/api/stories/1/suggest-entity");
    expect(JSON.parse(suggestCall[1].body)).toEqual({ type: "character", name: "Zara" });

    expect(await screen.findByDisplayValue("A hacker's cybernetic eye")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Paranoid but brilliant")).toBeInTheDocument();
  });

  it("does not render a Suggest button for the timeline resource", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EntityListPage
        storyId="1"
        resourcePath="timeline"
        title="Timeline"
        fields={[
          { key: "title", label: "Title" },
          { key: "description", label: "Description", multiline: true },
        ]}
      />
    );

    await screen.findByPlaceholderText("Title");
    expect(screen.queryByText("Suggest")).not.toBeInTheDocument();
  });
});
