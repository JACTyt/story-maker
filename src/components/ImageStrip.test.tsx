// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageStrip } from "./ImageStrip";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const oneImage = [{ id: 5, caption: "Mira in the docking bay", mimeType: "image/png", storedName: "abc.png" }];

function respondWith(payload: unknown, status = 200) {
  return vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(payload), { status })));
}

function pngFile() {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "portrait.png", { type: "image/png" });
}

describe("ImageStrip", () => {
  it("shows the images already attached to the entity", async () => {
    vi.stubGlobal("fetch", respondWith(oneImage));

    render(<ImageStrip storyId="1" entityType="character" entityId={7} />);

    expect(await screen.findByAltText("Mira in the docking bay")).toBeInTheDocument();
  });

  it("points each thumbnail at the image endpoint", async () => {
    vi.stubGlobal("fetch", respondWith(oneImage));

    render(<ImageStrip storyId="1" entityType="character" entityId={7} />);

    expect(await screen.findByAltText("Mira in the docking bay")).toHaveAttribute(
      "src",
      "/api/stories/1/images/5"
    );
  });

  it("requests only the images for its own entity", async () => {
    const fetchMock = respondWith([]);
    vi.stubGlobal("fetch", fetchMock);

    render(<ImageStrip storyId="1" entityType="character" entityId={7} />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/stories/1/images?entityType=character&entityId=7")
    );
  });

  it("uploads a chosen file to the images endpoint", async () => {
    const fetchMock = respondWith([]);
    vi.stubGlobal("fetch", fetchMock);

    render(<ImageStrip storyId="1" entityType="character" entityId={7} />);
    await userEvent.upload(await screen.findByLabelText(/add image/i), pngFile());

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/stories/1/images", expect.objectContaining({ method: "POST" }))
    );
  });

  it("reports the server's reason when an upload is rejected", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(new Response(JSON.stringify([]))))
      .mockImplementationOnce(() =>
        Promise.resolve(new Response(JSON.stringify({ error: "unsupported image format" }), { status: 400 }))
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<ImageStrip storyId="1" entityType="character" entityId={7} />);
    await userEvent.upload(await screen.findByLabelText(/add image/i), pngFile());

    expect(await screen.findByText(/unsupported image format/i)).toBeInTheDocument();
  });

  it("removes an image through the delete endpoint", async () => {
    const fetchMock = respondWith(oneImage);
    vi.stubGlobal("fetch", fetchMock);

    render(<ImageStrip storyId="1" entityType="character" entityId={7} />);
    await userEvent.click(await screen.findByRole("button", { name: /remove image/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/stories/1/images/5", expect.objectContaining({ method: "DELETE" }))
    );
  });

  it("offers no remove control when the strip is read-only", async () => {
    vi.stubGlobal("fetch", respondWith(oneImage));

    render(<ImageStrip storyId="1" entityType="character" entityId={7} readOnly />);

    await screen.findByAltText("Mira in the docking bay");
    expect(screen.queryByRole("button", { name: /remove image/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/add image/i)).not.toBeInTheDocument();
  });
});

describe("ImageStrip gallery", () => {
  it("makes an image the main portrait", async () => {
    const fetchMock = respondWith(oneImage);
    vi.stubGlobal("fetch", fetchMock);
    const onChanged = vi.fn();
    render(<ImageStrip storyId="1" entityType="character" entityId={7} onChanged={onChanged} />);
    await userEvent.click(await screen.findByRole("button", { name: /make main portrait/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/stories/1/images/5",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ isPrimary: true }) })
      )
    );
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("opens a full-size viewer and saves an edited caption", async () => {
    const fetchMock = respondWith(oneImage);
    vi.stubGlobal("fetch", fetchMock);
    render(<ImageStrip storyId="1" entityType="character" entityId={7} />);
    await userEvent.click(await screen.findByRole("button", { name: /view image/i }));
    const caption = screen.getByRole("textbox", { name: /caption/i });
    await userEvent.clear(caption);
    await userEvent.type(caption, "At dusk{enter}");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/stories/1/images/5",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ caption: "At dusk" }) })
      )
    );
  });
});
