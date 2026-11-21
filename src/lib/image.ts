import type { ImageInput } from "./providers/types";

/** Server-side cap. Vercel functions reject bodies above ~4.5 MB. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Identify the image type from magic bytes; the declared type is never trusted. */
export function sniffMime(bytes: Uint8Array): ImageInput["mime"] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
