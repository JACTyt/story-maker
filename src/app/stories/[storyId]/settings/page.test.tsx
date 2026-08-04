// @vitest-environment jsdom
import { Suspense } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "./page";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Settings page", () => {
  it("loads current settings and saves changes", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: 1, defaultProvider: "anthropic", defaultModel: "claude-sonnet-5", ollamaHost: "http://localhost:11434" })
      )
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: 1, defaultProvider: "anthropic", defaultModel: "claude-sonnet-5", ollamaHost: "http://localhost:11434" })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <SettingsPage params={Promise.resolve({ storyId: "1" })} />
        </Suspense>
      );
    });

    expect(await screen.findByDisplayValue("claude-sonnet-5")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/Extra guidance/), "Write in first person.");
    await userEvent.click(screen.getByLabelText("Extended thinking"));

    await userEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, patchCall] = fetchMock.mock.calls;
    expect(patchCall[1].method).toBe("PATCH");
    const patchBody = JSON.parse(patchCall[1].body);
    expect(patchBody.systemPrompt).toBe("Write in first person.");
    expect(patchBody.extendedThinking).toBe(true);
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("shows an error when saving fails", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: 1, defaultProvider: "anthropic", defaultModel: "claude-sonnet-5", ollamaHost: "http://localhost:11434" })
      )
    );
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "bad" }), { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <SettingsPage params={Promise.resolve({ storyId: "1" })} />
        </Suspense>
      );
    });

    expect(await screen.findByDisplayValue("claude-sonnet-5")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Save"));

    expect(await screen.findByText(/Couldn.t save/)).toBeInTheDocument();
  });
});
