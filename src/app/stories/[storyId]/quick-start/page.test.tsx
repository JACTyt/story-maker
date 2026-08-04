// @vitest-environment jsdom
import { Suspense } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuickStartPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("QuickStartPage", () => {
  it("generates variants, keeps one, and saves it", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        characters: [{ name: "Mira", appearance: "Scar over one eyebrow", personality: "Guarded but loyal" }],
        places: [],
        themes: [],
      })
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 1, name: "Mira", appearance: "Scar over one eyebrow", personality: "Guarded but loyal" })
    );
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <QuickStartPage params={Promise.resolve({ storyId: "1" })} />
        </Suspense>
      );
    });

    const textarea = screen.getByPlaceholderText("What's this story about?");
    await userEvent.type(textarea, "A heist with a found-family crew");
    await userEvent.click(screen.getByText("Generate"));

    const checkboxes = await screen.findAllByRole("checkbox");
    await userEvent.click(checkboxes[0]);
    await userEvent.click(screen.getByText("Add selected to story bible"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, saveCall] = fetchMock.mock.calls;
    expect(saveCall[0]).toBe("/api/stories/1/characters");
    expect(JSON.parse(saveCall[1].body)).toEqual({
      name: "Mira",
      appearance: "Scar over one eyebrow",
      personality: "Guarded but loyal",
    });
  });

  it("shows an inline error and preserves the description when generation fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ error: "provider unreachable" }, 502));
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <QuickStartPage params={Promise.resolve({ storyId: "1" })} />
        </Suspense>
      );
    });

    const textarea = screen.getByPlaceholderText("What's this story about?");
    await userEvent.type(textarea, "A heist idea");
    await userEvent.click(screen.getByText("Generate"));

    expect(await screen.findByText("provider unreachable")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A heist idea")).toBeInTheDocument();
  });

  it("shows a notice and still offers blank cards when the model returns zero markers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ characters: [], places: [], themes: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <QuickStartPage params={Promise.resolve({ storyId: "1" })} />
        </Suspense>
      );
    });

    const textarea = screen.getByPlaceholderText("What's this story about?");
    await userEvent.type(textarea, "space smugglers");
    await userEvent.click(screen.getByText("Generate"));

    expect(await screen.findByText(/didn't get anything usable back/i)).toBeInTheDocument();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
  });
});
