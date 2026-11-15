import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateText, Output } from "ai";
import { z } from "zod";
import { generationModel } from "../src/lib/generation-model";
import { missingConfig } from "../src/lib/config";

beforeEach(() => {
  vi.stubEnv("AI_PROVIDER", "google");
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "google-test-key");
  vi.stubEnv("GOOGLE_AI_MODEL", "gemini-4-hydrogen");
  vi.stubEnv("AI_GATEWAY_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("generation provider selection", () => {
  it("generates schema-validated JSON directly through Google's SDK adapter", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                role: "model",
                parts: [{ text: '{"brief":"Test brief"}' }],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: {
            promptTokenCount: 1,
            candidatesTokenCount: 4,
            totalTokenCount: 5,
          },
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", request);
    const result = await generateText({
      model: generationModel(),
      prompt: "Synthetic meeting",
      output: Output.object({ schema: z.object({ brief: z.string() }) }),
      maxRetries: 0,
    });
    expect(result.output).toEqual({ brief: "Test brief" });
    expect(request).toHaveBeenCalledTimes(1);
    const [url, init] = request.mock.calls[0];
    expect(String(url)).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent",
    );
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe(
      "google-test-key",
    );
    expect(JSON.parse(init.body).generationConfig.responseMimeType).toBe(
      "application/json",
    );
    expect(missingConfig()).not.toContain("AI_GATEWAY_API_KEY");
  });
  it("requires the selected provider's key instead of silently using Gateway", () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.stubEnv("AI_GATEWAY_API_KEY", "unused-gateway-key");
    expect(() => generationModel()).toThrow("GOOGLE_GENERATIVE_AI_API_KEY");
    expect(missingConfig()).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
    expect(missingConfig(false)).not.toContain("GOOGLE_GENERATIVE_AI_API_KEY");
  });
  it("retains explicitly selected Gateway routing", () => {
    vi.stubEnv("AI_PROVIDER", "gateway");
    vi.stubEnv("AI_GATEWAY_API_KEY", "gateway-test-key");
    vi.stubEnv("AI_GATEWAY_MODEL", "google/gemini-4-hydrogen");
    expect(generationModel()).toBe("google/gemini-4-hydrogen");
    expect(missingConfig()).not.toContain("GOOGLE_GENERATIVE_AI_API_KEY");
  });
  it("rejects an unknown provider before submitting a request", () => {
    vi.stubEnv("AI_PROVIDER", "unknown");
    expect(() => generationModel()).toThrow(
      "AI_PROVIDER must be google or gateway",
    );
  });
});
