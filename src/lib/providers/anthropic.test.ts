import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { AnthropicProvider, DEFAULT_MODEL, type MessagesClient } from "./anthropic";
import { getProvider } from "./index";

const image = { mime: "image/jpeg" as const, bytes: new Uint8Array([0xff, 0xd8, 0xff, 1, 2]) };

function reply(
  text: string,
  stop_reason: Anthropic.Message["stop_reason"] = "end_turn",
): Anthropic.Message {
  return {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: DEFAULT_MODEL,
    stop_reason,
    content: [{ type: "text", text, citations: null }],
  } as unknown as Anthropic.Message;
}

function fake(impl: () => Promise<Anthropic.Message>) {
  const create = vi.fn(async (params: Anthropic.MessageCreateParamsNonStreaming) => {
    void params;
    return impl();
  });
  const client: MessagesClient = { messages: { create } };
  return { client, create };
}

describe("AnthropicProvider", () => {
  it("sends the image as base64 with the default model and parses points", async () => {
    const { client, create } = fake(async () =>
      reply('{"points":[{"x":0.2,"y":0.4},{"x":0.6,"y":0.5}]}'),
    );
    const result = await new AnthropicProvider({ client }).countPenguins(image);
    expect(result.points).toEqual([
      { x: 0.2, y: 0.4 },
      { x: 0.6, y: 0.5 },
    ]);

    const params = create.mock.calls[0][0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.system).toBeTruthy();
    const content = (params.messages[0].content as Anthropic.ContentBlockParam[])[0];
    expect(content).toMatchObject({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: "/9j/AQI=" },
    });
  });

  it("does not send prefill, temperature or thinking overrides", async () => {
    const { client, create } = fake(async () => reply('{"points":[]}'));
    await new AnthropicProvider({ client }).countPenguins(image);
    const params = create.mock.calls[0][0] as unknown as Record<string, unknown>;
    expect(params.temperature).toBeUndefined();
    expect(params.thinking).toBeUndefined();
    expect((params.messages as { role: string }[]).at(-1)?.role).toBe("user");
  });

  it("passes effort only when configured", async () => {
    const a = fake(async () => reply('{"points":[]}'));
    await new AnthropicProvider({ client: a.client }).countPenguins(image);
    expect((a.create.mock.calls[0][0] as unknown as Record<string, unknown>).output_config).toBeUndefined();

    const b = fake(async () => reply('{"points":[]}'));
    await new AnthropicProvider({ client: b.client, effort: "low" }).countPenguins(image);
    expect((b.create.mock.calls[0][0] as unknown as Record<string, unknown>).output_config).toEqual({
      effort: "low",
    });
  });

  it("returns an empty result with a note", async () => {
    const { client } = fake(async () => reply('{"points":[],"note":"too blurry"}'));
    expect(await new AnthropicProvider({ client }).countPenguins(image)).toEqual({
      points: [],
      note: "too blurry",
    });
  });

  it("ignores non-text blocks such as thinking", async () => {
    const msg = reply('{"points":[{"x":0.5,"y":0.5}]}');
    (msg.content as unknown[]).unshift({ type: "thinking", thinking: "", signature: "s" });
    const { client } = fake(async () => msg);
    const r = await new AnthropicProvider({ client }).countPenguins(image);
    expect(r.points).toHaveLength(1);
  });

  it("rejects unusable output as model_error", async () => {
    const { client } = fake(async () => reply("I see some penguins"));
    await expect(new AnthropicProvider({ client }).countPenguins(image)).rejects.toMatchObject({
      code: "model_error",
    });
  });

  it("rejects refusals and truncated output as model_error", async () => {
    for (const reason of ["refusal", "max_tokens"] as const) {
      const { client } = fake(async () => reply('{"points":[]}', reason));
      await expect(new AnthropicProvider({ client }).countPenguins(image)).rejects.toMatchObject({
        code: "model_error",
      });
    }
  });

  it("maps timeouts to timeout", async () => {
    const { client } = fake(async () => {
      throw new Anthropic.APIConnectionTimeoutError();
    });
    await expect(new AnthropicProvider({ client }).countPenguins(image)).rejects.toMatchObject({
      code: "timeout",
    });
  });

  it("maps API errors to model_error without leaking provider text", async () => {
    const { client } = fake(async () => {
      throw new Error("sk-ant-secret in message");
    });
    const err = await new AnthropicProvider({ client }).countPenguins(image).catch((e) => e);
    expect(err.code).toBe("model_error");
    expect(err.message).not.toContain("secret");
  });
});

describe("getProvider(anthropic)", () => {
  it("requires ANTHROPIC_API_KEY", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => getProvider("anthropic")).toThrow(/ANTHROPIC_API_KEY/);
    vi.unstubAllEnvs();
  });

  it("builds the provider when the key is set", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    expect(getProvider("anthropic").name).toBe("anthropic");
    vi.unstubAllEnvs();
  });
});
