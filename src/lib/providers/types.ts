import type { CountResult } from "../schema";

export type ImageInput = {
  mime: "image/jpeg" | "image/png" | "image/webp";
  bytes: Uint8Array;
};

export type ProviderErrorCode = "model_error" | "timeout";

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  constructor(code: ProviderErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProviderError";
    this.code = code;
  }
}

/** A vision model that finds penguin-like figures in an image. */
export interface PenguinProvider {
  readonly name: string;
  countPenguins(image: ImageInput): Promise<CountResult>;
}
