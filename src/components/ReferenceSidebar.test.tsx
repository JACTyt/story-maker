// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReferenceSidebar } from "./ReferenceSidebar";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body));
}

describe("ReferenceSidebar", () => {
  it("fetches and renders characters, scenes, themes, and timeline grouped by section", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 1, name: "Mira", description: "A smuggler" }]));
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 2, title: "Docking bay ambush", description: "Mira is cornered" }]));
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 3, name: "Betrayal", description: "Trust broken" }]));
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 4, title: "The heist begins", description: "Night one" }]));
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferenceSidebar storyId="1" />);

    expect(await screen.findByText("Mira")).toBeInTheDocument();
    expect(screen.getByText("A smuggler")).toBeInTheDocument();
    expect(screen.getByText("Docking bay ambush")).toBeInTheDocument();
    expect(screen.getByText("Betrayal")).toBeInTheDocument();
    expect(screen.getByText("The heist begins")).toBeInTheDocument();
    expect(screen.getByText("Characters")).toBeInTheDocument();
    expect(screen.getByText("Scenes")).toBeInTheDocument();
    expect(screen.getByText("Themes")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
  });

  it("shows an empty-state message when nothing has been recorded", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse([])));
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferenceSidebar storyId="1" />);

    expect(await screen.findByText(/nothing recorded yet/i)).toBeInTheDocument();
  });

  it("edits a character's name and description inline and saves it", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 1, name: "Mira", description: "A smuggler" }]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, name: "Mira Voss", description: "A reformed smuggler" }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferenceSidebar storyId="1" />);

    await screen.findByText("Mira");
    await userEvent.click(screen.getByLabelText("Edit Mira"));

    const nameInput = screen.getByDisplayValue("Mira");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Mira Voss");
    await userEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    const [, , , , patchCall] = fetchMock.mock.calls;
    expect(patchCall[0]).toBe("/api/stories/1/characters/1");
    expect(patchCall[1].method).toBe("PATCH");
    expect(JSON.parse(patchCall[1].body)).toEqual({ name: "Mira Voss", description: "A smuggler" });

    expect(await screen.findByText("Mira Voss")).toBeInTheDocument();
  });
});
