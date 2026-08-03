// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatThread } from "./ChatThread";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function streamResponse(text: string) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    })
  );
}

describe("ChatThread", () => {
  it("loads history, sends a message, and appends the streamed reply", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]))); // initial history load
    fetchMock.mockResolvedValueOnce(streamResponse("Hello back!")); // POST message stream
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { id: 1, role: "user", content: "Hi there", incomplete: false },
          { id: 2, role: "assistant", content: "Hello back!", incomplete: false },
        ])
      )
    ); // refresh after stream
    vi.stubGlobal("fetch", fetchMock);

    render(<ChatThread storyId="1" chapterId="2" />);

    const input = await screen.findByPlaceholderText("Write to your co-writer...");
    await userEvent.type(input, "Hi there");
    await userEvent.click(screen.getByText("Send"));

    await waitFor(() => expect(screen.getByText("Hello back!")).toBeInTheDocument());
    expect(screen.getByText("Hi there")).toBeInTheDocument();
  });

  it("shows a thinking indicator and disables Send while waiting for the reply", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]))); // initial history load
    let resolvePost!: (value: Response) => void;
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });
    fetchMock.mockImplementationOnce(() => postPromise); // POST message (held open)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify([]))); // refresh after stream
    vi.stubGlobal("fetch", fetchMock);

    render(<ChatThread storyId="1" chapterId="2" />);

    const input = await screen.findByPlaceholderText("Write to your co-writer...");
    await userEvent.type(input, "Hi there");
    await userEvent.click(screen.getByText("Send"));

    expect(await screen.findByText("Thinking...")).toBeInTheDocument();
    expect(screen.getByText("Send").closest("button")).toBeDisabled();

    resolvePost(streamResponse("Hello back!"));

    await waitFor(() => expect(screen.queryByText("Thinking...")).not.toBeInTheDocument());
    expect(screen.getByText("Send").closest("button")).not.toBeDisabled();
  });
});
