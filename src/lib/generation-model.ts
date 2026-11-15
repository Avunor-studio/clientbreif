import { google } from "@ai-sdk/google";
import { env, generationApiKeyName, generationProvider } from "./config";

export function generationModel() {
  env(generationApiKeyName());
  if (generationProvider() === "google")
    return google(process.env.GOOGLE_AI_MODEL || "gemini-4-hydrogen");
  return process.env.AI_GATEWAY_MODEL || "google/gemini-4-hydrogen";
}
