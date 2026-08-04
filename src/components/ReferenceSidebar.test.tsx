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
  it("fetches and renders characters, places, themes, and timeline grouped by section", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ id: 1, name: "Mira", appearance: "Scar over one eyebrow", personality: "Guarded but loyal" }])
    );
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 2, name: "Docking bay", description: "Mira is cornered here" }]));
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 3, name: "Cyberpunk", description: "Neon-lit megacorp dystopia" }]));
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 4, title: "The heist begins", description: "Night one" }]));
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferenceSidebar storyId="1" />);

    expect(await screen.findByText("Mira")).toBeInTheDocument();
    expect(screen.getByText("Scar over one eyebrow")).toBeInTheDocument();
    expect(screen.getByText("Guarded but loyal")).toBeInTheDocument();
    expect(screen.getByText("Docking bay")).toBeInTheDocument();
    expect(screen.getByText("Cyberpunk")).toBeInTheDocument();
    expect(screen.getByText("The heist begins")).toBeInTheDocument();
    expect(screen.getAllByText("Characters").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Places").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Themes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Timeline").length).toBeGreaterThan(0);
  });

  it("shows an empty-state message when nothing has been recorded", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse([])));
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferenceSidebar storyId="1" />);

    expect(await screen.findByText(/nothing recorded yet/i)).toBeInTheDocument();
  });

  it("edits a character's name, appearance, and personality inline and saves it", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ id: 1, name: "Mira", appearance: "Scar over one eyebrow", personality: "Guarded" }])
    );
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 1, name: "Mira Voss", appearance: "Scar over one eyebrow", personality: "Guarded" })
    );
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
    expect(JSON.parse(patchCall[1].body)).toEqual({
      name: "Mira Voss",
      appearance: "Scar over one eyebrow",
      personality: "Guarded",
    });

    expect(await screen.findByText("Mira Voss")).toBeInTheDocument();
  });

  it("regenerates a character's appearance and personality via the Regenerate button", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ id: 1, name: "Mira", appearance: "Old appearance", personality: "Old personality" }])
    );
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ appearance: "A hacker's cybernetic eye", personality: "Paranoid but brilliant" })
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferenceSidebar storyId="1" />);

    await screen.findByText("Mira");
    await userEvent.click(screen.getByLabelText("Edit Mira"));
    await userEvent.click(screen.getByText("Regenerate"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    const [, , , , suggestCall] = fetchMock.mock.calls;
    expect(suggestCall[0]).toBe("/api/stories/1/suggest-entity");
    expect(JSON.parse(suggestCall[1].body)).toEqual({ type: "character", name: "Mira" });

    expect(await screen.findByDisplayValue("A hacker's cybernetic eye")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Paranoid but brilliant")).toBeInTheDocument();
  });

  it("does not show a Regenerate button when editing a timeline event", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 4, title: "The heist begins", description: "Night one" }]));
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferenceSidebar storyId="1" />);

    await screen.findByText("The heist begins");
    await userEvent.click(screen.getByLabelText("Edit The heist begins"));

    expect(screen.queryByText("Regenerate")).not.toBeInTheDocument();
  });

  it("deletes an entry when the delete button is clicked", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      jsonResponse([{ id: 1, name: "Mira", appearance: "Scar", personality: "Guarded" }])
    );
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferenceSidebar storyId="1" />);

    await screen.findByText("Mira");
    await userEvent.click(screen.getByLabelText("Delete Mira"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    const [, , , , deleteCall] = fetchMock.mock.calls;
    expect(deleteCall[0]).toBe("/api/stories/1/characters/1");
    expect(deleteCall[1].method).toBe("DELETE");
    await waitFor(() => expect(screen.queryByText("Mira")).not.toBeInTheDocument());
  });

  it("hides a section when its filter is toggled off", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 1, name: "Mira", appearance: "", personality: "" }]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(<ReferenceSidebar storyId="1" />);

    await screen.findByText("Mira");
    await userEvent.click(screen.getByRole("button", { name: /Characters/i }));

    expect(screen.queryByText("Mira")).not.toBeInTheDocument();
  });
});
