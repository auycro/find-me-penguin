import { MockProvider } from "./mock";
import type { PenguinProvider } from "./types";

export type { ImageInput, PenguinProvider } from "./types";
export { ProviderError } from "./types";

/** Pick a provider by name (env `PROVIDER`). Real providers are added in later tasks. */
export function getProvider(name: string | undefined = process.env.PROVIDER): PenguinProvider {
  switch (name) {
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`Unknown provider: ${name ?? "(unset)"}`);
  }
}
