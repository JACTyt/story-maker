export const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

export type ImageMimeType = (typeof SUPPORTED_IMAGE_TYPES)[number];

const EXTENSIONS: Record<ImageMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

/**
 * Identifies an image from its own bytes.
 *
 * The browser-declared Content-Type and the filename are both attacker
 * controlled, so neither is trusted: a file is only stored if its signature
 * says it is one of the types actually supported.
 */
export function detectImageType(bytes: Uint8Array): ImageMimeType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  // WebP is a RIFF container, so the format tag four bytes in is what counts.
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

export function extensionFor(type: ImageMimeType): string {
  return EXTENSIONS[type];
}
