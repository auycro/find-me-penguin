import Anthropic from "@anthropic-ai/sdk";
import { parseModelOutput, type CountResult } from "../schema";
import { SYSTEM_PROMPT, USER_PROMPT } from "./prompt";
import { ProviderError, type ImageInput, type PenguinProvider } from "./types";

export const DEFAULT_MODEL = "claude-haiku-5-5";

/** The only part of the SDK this adapter uses, so tests can inject a fake. */
export type MessagesClient = {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
};

export type AnthropicProviderOptions = {
  client: MessagesClient;
  model?: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
};

/** Build a real SDK client: no SDK retries (errors surface to the user), bounded wait. */
export function createAnthropicClient(apiKey: string): MessagesClient {
  return new Anthropic({ apiKey, maxRetries: 0, timeout: 25_000 });
}

export class AnthropicProvider implements PenguinProvider {
  readonly name = "anthropic";
  private readonly client: MessagesClient;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly effort?: "low" | "medium" | "high";

  constructor(options: AnthropicProviderOptions) {
    this.client = options.client;
    this.model = options.model ?? DEFAULT_MODEL;
    // 500 points at roughly 15 tokens each, plus headroom for thinking and the note.
    this.maxTokens = options.maxTokens ?? 12_000;
    this.effort = options.effort;
  }

  async countPenguins(image: ImageInput): Promise<CountResult> {
    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: SYSTEM_PROMPT,
        ...(this.effort ? { output_config: { effort: this.effort } } : {}),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: image.mime,
                  data: Buffer.from(image.bytes).toString("base64"),
                },
              },
              { type: "text", text: USER_PROMPT },
            ],
          },
        ],
      });
    } catch (err) {
      if (err instanceof Anthropic.APIConnectionTimeoutError) {
        throw new ProviderError("timeout", "Model request timed out", { cause: err });
      }
      const status = err instanceof Anthropic.APIError ? ` (status ${err.status})` : "";
      throw new ProviderError("model_error", `Model request failed${status}`, { cause: err });
    }

    if (response.stop_reason === "refusal") {
      throw new ProviderError("model_error", "Model declined the request");
    }
    if (response.stop_reason === "max_tokens") {
      throw new ProviderError("model_error", "Model output was cut off");
    }

    const text = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("\n");

    const result = parseModelOutput(text);
    if (!result) throw new ProviderError("model_error", "Model returned unusable output");
    return result;
  }
}
