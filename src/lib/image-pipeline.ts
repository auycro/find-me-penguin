/**
 * Client-side image preparation: decode (including HEIC), fix orientation,
 * downscale, and re-encode as JPEG. Re-encoding through a canvas also drops
 * EXIF/GPS metadata. All browser specifics are injected so the logic is testable.
 */

/** Longest side sent to the model. Larger images add cost with little accuracy gain. */
export const MAX_SIDE = 1568;
/** Stay under the server cap (4 MB) with headroom for multipart overhead. */
export const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
/** Refuse to decode absurdly large originals on a phone. */
export const MAX_INPUT_BYTES = 40 * 1024 * 1024;

const QUALITIES = [0.85, 0.72, 0.6];
const SHRINK_STEPS = [1, 0.8, 0.64, 0.5];

export type ImageErrorCode = "empty" | "too_large" | "unsupported";

export class ImageError extends Error {
  readonly code: ImageErrorCode;
  constructor(code: ImageErrorCode, message: string) {
    super(message);
    this.name = "ImageError";
    this.code = code;
  }
}

/** A decoded image. Orientation is already applied to width and height. */
export type Decoded = { width: number; height: number; close?: () => void };

export type PipelineDeps<B extends Decoded = Decoded> = {
  /** Native browser decode with EXIF orientation applied. Rejects if unsupported. */
  decode(blob: Blob): Promise<B>;
  /** HEIC decode for browsers that cannot do it natively. Loaded lazily. */
  decodeHeic(blob: Blob): Promise<B>;
  /** Draw at the given size and encode as JPEG. */
  encode(image: B, width: number, height: number, quality: number): Promise<Blob>;
};

export type PreparedImage = {
  blob: Blob;
  width: number;
  height: number;
  originalBytes: number;
  usedHeicDecoder: boolean;
};

/** Scale to fit within `max` on the longest side. Never upscales. */
export function fitWithin(width: number, height: number, max: number = MAX_SIDE) {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

/** HEIC/HEIF files start with an ISO box: 4 size bytes, "ftyp", then a brand. */
export function isHeicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const text = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  return text(4, 8) === "ftyp" && HEIC_BRANDS.has(text(8, 12));
}

async function looksLikeHeic(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return isHeicBytes(head);
}

export async function prepareImage<B extends Decoded>(
  file: Blob,
  deps: PipelineDeps<B>,
): Promise<PreparedImage> {
  if (file.size === 0) throw new ImageError("empty", "The file is empty");
  if (file.size > MAX_INPUT_BYTES) throw new ImageError("too_large", "The file is too large");

  let image: B;
  let usedHeicDecoder = false;
  try {
    // Native first: Safari decodes HEIC itself, and every browser handles JPEG/PNG/WebP.
    image = await deps.decode(file);
  } catch {
    if (!(await looksLikeHeic(file))) {
      throw new ImageError("unsupported", "This image format is not supported");
    }
    try {
      image = await deps.decodeHeic(file);
      usedHeicDecoder = true;
    } catch {
      throw new ImageError("unsupported", "This HEIC image could not be read");
    }
  }

  try {
    if (!(image.width > 0 && image.height > 0)) {
      throw new ImageError("unsupported", "The image has no size");
    }
    const base = fitWithin(image.width, image.height);

    for (const shrink of SHRINK_STEPS) {
      const width = Math.max(1, Math.round(base.width * shrink));
      const height = Math.max(1, Math.round(base.height * shrink));
      for (const quality of QUALITIES) {
        const blob = await deps.encode(image, width, height, quality);
        if (blob.size <= MAX_UPLOAD_BYTES) {
          return { blob, width, height, originalBytes: file.size, usedHeicDecoder };
        }
      }
    }
    throw new ImageError("too_large", "The image is too large to upload");
  } finally {
    image.close?.();
  }
}
