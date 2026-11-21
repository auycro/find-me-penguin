export type ShareOutcome = "shared" | "cancelled";

type ShareNav = Pick<Navigator, "canShare" | "share">;

/** True when the browser can hand this file to the native share sheet (most phones). */
export function canShareFile(file: File, nav: Partial<ShareNav> | undefined = typeof navigator === "undefined" ? undefined : navigator): boolean {
  try {
    return typeof nav?.canShare === "function" && typeof nav.share === "function" && nav.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Open the native share sheet. Closing it without choosing is not an error. */
export async function shareFile(
  file: File,
  title: string,
  nav: Partial<ShareNav> | undefined = typeof navigator === "undefined" ? undefined : navigator,
): Promise<ShareOutcome> {
  if (!nav?.share) throw new Error("Sharing is not supported");
  try {
    await nav.share({ files: [file], title });
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    throw err;
  }
}

/** Save a file through a temporary link (the desktop and fallback path). */
export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function canvasToPngFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(new File([blob], name, { type: "image/png" }));
      else reject(new Error("PNG encoding failed"));
    }, "image/png");
  });
}
