import type { CountResult } from "../schema";
import { ProviderError, type ImageInput, type PenguinProvider } from "./types";

type MockOptions = {
  result?: CountResult;
  /** When set, countPenguins rejects with this error. */
  error?: ProviderError;
};

/** Deterministic provider for tests and local development without an API key. */
export class MockProvider implements PenguinProvider {
  readonly name = "mock";
  readonly calls: ImageInput[] = [];
  private readonly options: MockOptions;

  constructor(options: MockOptions = {}) {
    this.options = options;
  }

  async countPenguins(image: ImageInput): Promise<CountResult> {
    this.calls.push(image);
    if (this.options.error) throw this.options.error;
    return (
      this.options.result ?? {
        points: [
          { x: 0.25, y: 0.6 },
          { x: 0.5, y: 0.55 },
          { x: 0.75, y: 0.62 },
        ],
      }
    );
  }
}
