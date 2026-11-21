import { prepareImage, type Decoded, type PipelineDeps, type PreparedImage } from "./image-pipeline";

type BrowserImage = Decoded & { source: ImageBitmap };

function wrap(bitmap: ImageBitmap): BrowserImage {
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
}

const browserDeps: PipelineDeps<BrowserImage> = {
  async decode(blob) {
    // Explicit so EXIF rotation from phone cameras is applied before we measure or draw.
    return wrap(await createImageBitmap(blob, { imageOrientation: "from-image" }));
  },

  async decodeHeic(blob) {
    // Large WASM decoder: loaded only when a HEIC file needs it.
    const { heicTo } = await import("heic-to");
    return wrap(await heicTo({ blob, type: "bitmap" }));
  },

  async encode(image, width, height, quality) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    // JPEG has no alpha: flatten transparent PNG/WebP onto white instead of black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image.source, 0, 0, width, height);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("JPEG encoding failed"))),
        "image/jpeg",
        quality,
      );
    });
  },
};

/** Prepare a user-picked photo for upload (browser only). */
export function prepareImageForUpload(file: File): Promise<PreparedImage> {
  return prepareImage(file, browserDeps);
}
