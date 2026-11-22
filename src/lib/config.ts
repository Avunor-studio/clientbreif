import "server-only";

export const workspaceEnv = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
] as const;
export function generationProvider() {
  const provider = process.env.AI_PROVIDER || "google";
  if (provider !== "google" && provider !== "gateway")
    throw new Error("Setup required: AI_PROVIDER must be google or gateway.");
  return provider;
}
export function generationApiKeyName() {
  return generationProvider() === "google"
    ? "GOOGLE_GENERATIVE_AI_API_KEY"
    : "AI_GATEWAY_API_KEY";
}
export function missingConfig(includeProcessing = true) {
  const required: string[] = [...workspaceEnv];
  if (includeProcessing)
    required.push("ASSEMBLYAI_API_KEY", generationApiKeyName());
  return required.filter((k) => !process.env[k]);
}
export function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Setup required: configure ${name} in .env.local.`);
  return v;
}
