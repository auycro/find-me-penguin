import { describe, expect, it, vi } from "vitest";
import {
  fitWithin,
  ImageError,
  isHeicBytes,
  MAX_INPUT_BYTES,
  MAX_SIDE,
  MAX_UPLOAD_BYTES,
  prepareImage,
  type Decoded,
  type PipelineDeps,
} from "./image-pipeline";

describe("fitWithin", () => {
  it("leaves small images alone and never upscales", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(MAX_SIDE, 10)).toEqual({ width: MAX_SIDE, height: 10 });
  });
  it("scales the longest side down to the cap, keeping aspect ratio", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1568, height: 1176 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1176, height: 1568 });
  });
  it("never returns a zero side for extreme aspect ratios", () => {
    expect(fitWithin(100000, 1)).toEqual({ width: 1568, height: 1 });
  });
});

describe("isHeicBytes", () => {
  const box = (brand: string) =>
    new Uint8Array([0, 0, 0, 24, ...Buffer.from("ftyp"), ...Buffer.from(brand), 0, 0]);
  it("recognises HEIC/HEIF brands", () => {
    for (const b of ["heic", "heix", "mif1", "msf1", "hevc"]) expect(isHeicBytes(box(b))).toBe(true);
  });
  it("rejects other containers and short input", () => {
    expect(isHeicBytes(box("mp42"))).toBe(false);
    expect(isHeicBytes(box("avif"))).toBe(false);
    expect(isHeicBytes(new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false);
  });
});

type Img = Decoded & { id: string; closed: boolean };

function makeDeps(over: Partial<PipelineDeps<Img>> = {}, size = { width: 4032, height: 3024 }) {
  const images: Img[] = [];
  const mk = (id: string): Img => {
    const img: Img = { id, ...size, closed: false, close: () => void (img.closed = true) };
    images.push(img);
    return img;
  };
  const deps: PipelineDeps<Img> = {
    decode: vi.fn(async () => mk("native")),
    decodeHeic: vi.fn(async () => mk("heic")),
    encode: vi.fn(async () => new Blob([new Uint8Array(1000)])),
    ...over,
  };
  return { deps, images };
}

const blobOf = (bytes: number[] | Uint8Array, size?: number) => {
  const arr = new Uint8Array(size ?? (bytes as number[]).length);
  arr.set(bytes);
  return new Blob([arr]);
};
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const HEIC = [0, 0, 0, 24, ...Buffer.from("ftypheic"), 0, 0];

describe("prepareImage", () => {
  it("downscales to the cap and reports sizes", async () => {
    const { deps } = makeDeps();
    const out = await prepareImage(blobOf(JPEG, 5000), deps);
    expect(out).toMatchObject({ width: 1568, height: 1176, originalBytes: 5000, usedHeicDecoder: false });
    expect(deps.encode).toHaveBeenCalledTimes(1);
    expect(deps.decodeHeic).not.toHaveBeenCalled();
  });

  it("closes the decoded image on success and on failure", async () => {
    const ok = makeDeps();
    await prepareImage(blobOf(JPEG, 100), ok.deps);
    expect(ok.images[0].closed).toBe(true);

    const bad = makeDeps({ encode: vi.fn(async () => new Blob([new Uint8Array(MAX_UPLOAD_BYTES + 1)])) });
    await expect(prepareImage(blobOf(JPEG, 100), bad.deps)).rejects.toMatchObject({ code: "too_large" });
    expect(bad.images[0].closed).toBe(true);
  });

  it("falls back to the HEIC decoder only for HEIC files", async () => {
    const { deps } = makeDeps({
      decode: vi.fn(async () => {
        throw new Error("cannot decode");
      }),
    });
    const out = await prepareImage(blobOf(HEIC, 100), deps);
    expect(out.usedHeicDecoder).toBe(true);
    expect(deps.decodeHeic).toHaveBeenCalledTimes(1);
  });

  it("does not try the HEIC decoder for other undecodable files", async () => {
    const { deps } = makeDeps({
      decode: vi.fn(async () => {
        throw new Error("cannot decode");
      }),
    });
    await expect(prepareImage(blobOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 50), deps)).rejects.toMatchObject({
      code: "unsupported",
    });
    expect(deps.decodeHeic).not.toHaveBeenCalled();
  });

  it("reports unsupported when the HEIC decoder fails too", async () => {
    const { deps } = makeDeps({
      decode: vi.fn(async () => {
        throw new Error("no");
      }),
      decodeHeic: vi.fn(async () => {
        throw new Error("no");
      }),
    });
    await expect(prepareImage(blobOf(HEIC, 100), deps)).rejects.toBeInstanceOf(ImageError);
  });

  it("lowers quality, then shrinks, until the result fits", async () => {
    const big = new Blob([new Uint8Array(MAX_UPLOAD_BYTES + 10)]);
    const small = new Blob([new Uint8Array(1000)]);
    const encode = vi.fn(async (_i: Img, _w: number, _h: number, quality: number) => {
      void _i;
      void _w;
      void _h;
      return quality > 0.6 ? big : small; // fits only at the lowest quality
    });
    const { deps } = makeDeps({ encode });
    const out = await prepareImage(blobOf(JPEG, 100), deps);
    expect(encode.mock.calls.map((c) => c[3])).toEqual([0.85, 0.72, 0.6]);
    expect(out.width).toBe(1568);

    const alwaysBig = vi.fn(async () => big);
    const second = makeDeps({ encode: alwaysBig });
    await expect(prepareImage(blobOf(JPEG, 100), second.deps)).rejects.toMatchObject({ code: "too_large" });
    // 4 shrink steps x 3 qualities
    expect(alwaysBig).toHaveBeenCalledTimes(12);
  });

  it("rejects empty and oversized inputs before decoding", async () => {
    const { deps } = makeDeps();
    await expect(prepareImage(new Blob([]), deps)).rejects.toMatchObject({ code: "empty" });
    const huge = { size: MAX_INPUT_BYTES + 1 } as Blob;
    await expect(prepareImage(huge, deps)).rejects.toMatchObject({ code: "too_large" });
    expect(deps.decode).not.toHaveBeenCalled();
  });

  it("rejects a decoded image with no size", async () => {
    const { deps } = makeDeps({}, { width: 0, height: 0 });
    await expect(prepareImage(blobOf(JPEG, 100), deps)).rejects.toMatchObject({ code: "unsupported" });
  });
});
