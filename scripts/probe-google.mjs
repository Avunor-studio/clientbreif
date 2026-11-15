import nextEnv from "@next/env";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
nextEnv.loadEnvConfig(process.cwd(), true);
try {
  const result = await generateText({
    model: google(process.env.GOOGLE_AI_MODEL || "gemini-4-hydrogen"),
    prompt: "Return the brief 'Synthetic provider check'.",
    output: Output.object({ schema: z.object({ brief: z.string() }) }),
    maxOutputTokens: 512,
    maxRetries: 0,
  });
  console.log(
    JSON.stringify({
      ok: !!result.output.brief,
      model: result.response.modelId,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      message: error.message,
      status: error.statusCode,
      response: error.responseBody,
    }),
  );
  process.exitCode = 1;
}
