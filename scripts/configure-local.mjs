import { readFileSync, appendFileSync } from "node:fs";
// Public project configuration only. Existing local secrets are never printed or overwritten.
let current = readFileSync(".env.local", "utf8");
const defaults = {
  NEXT_PUBLIC_SUPABASE_URL: "https://wyboymyzzoarwyuatrhk.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    "sb_publishable_4fGE6z4dUDWr9jXj_jmUEA_L_K81JKn",
  SUPABASE_SECRET_KEY: "",
  ASSEMBLYAI_API_KEY: "",
  AI_PROVIDER: "google",
  GOOGLE_GENERATIVE_AI_API_KEY: "",
  GOOGLE_AI_MODEL: "gemini-4-hydrogen",
  AI_GATEWAY_API_KEY: "",
  AI_GATEWAY_MODEL: "google/gemini-4-hydrogen",
  APP_URL: "http://localhost:3000",
};
for (const [key, value] of Object.entries(defaults))
  if (!new RegExp(`^${key}=`, "m").test(current)) {
    appendFileSync(".env.local", `\n${key}=${value}\n`);
    current += `\n${key}=`;
  }
console.log(
  "Public project configuration saved; private key values were not displayed.",
);
