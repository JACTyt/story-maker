import { describe, it, expect } from "vitest";
import { detectImageType, extensionFor } from "./sniff";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array([...values, ...new Array(32).fill(0)]);
}

const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const GIF = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);

function webp(): Uint8Array {
  const buf = new Uint8Array(32);
  buf.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  buf.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
  return buf;
}

describe("detectImageType", () => {
  it("recognises a PNG by its signature", () => {
    expect(detectImageType(PNG)).toBe("image/png");
  });

  it("recognises a JPEG by its signature", () => {
    expect(detectImageType(JPEG)).toBe("image/jpeg");
  });

  it("recognises a GIF by its signature", () => {
    expect(detectImageType(GIF)).toBe("image/gif");
  });

  it("recognises a WebP by its RIFF container", () => {
    expect(detectImageType(webp())).toBe("image/webp");
  });

  it("rejects content that is not an image", () => {
    expect(detectImageType(new TextEncoder().encode("<?php echo 1; ?>"))).toBeNull();
  });

  it("rejects a RIFF container that is not WebP", () => {
    const wav = new Uint8Array(32);
    wav.set([0x52, 0x49, 0x46, 0x46], 0);
    wav.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
    expect(detectImageType(wav)).toBeNull();
  });

  it("rejects a file too short to carry a signature", () => {
    expect(detectImageType(new Uint8Array([0x89, 0x50]))).toBeNull();
  });
});

describe("extensionFor", () => {
  it("maps each supported type to its file extension", () => {
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/gif")).toBe("gif");
    expect(extensionFor("image/webp")).toBe("webp");
  });
});
