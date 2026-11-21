import { AnthropicProvider, createAnthropicClient } from "./anthropic";
import { MockProvider } from "./mock";
import type { PenguinProvider } from "./types";

export type { ImageInput, PenguinProvider } from "./types";
export { ProviderError } from "./types";

/** Pick a provider by name (env `PROVIDER`). OpenRouter is added later. */
export function getProvider(name: string | undefined = process.env.PROVIDER): PenguinProvider {
  switch (name) {
    case "mock":
      return new MockProvider();
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
      return new AnthropicProvider({
        client: createAnthropicClient(apiKey),
        model: process.env.ANTHROPIC_MODEL || undefined,
      });
    }
    default:
      throw new Error(`Unknown provider: ${name ?? "(unset)"}`);
  }
}
