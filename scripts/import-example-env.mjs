import { readFileSync, writeFileSync } from "node:fs";
const allowed = new Set([
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "ASSEMBLYAI_API_KEY",
  "AI_PROVIDER",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_AI_MODEL",
  "AI_GATEWAY_API_KEY",
  "AI_GATEWAY_MODEL",
  "APP_URL",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL",
]);
const example = readFileSync(".env.example", "utf8");
let local = readFileSync(".env.local", "utf8");
const moved = [];
for (const line of example.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (!m || !allowed.has(m[1]) || !m[2].trim()) continue;
  const [name, raw] = [m[1], m[2].trim()];
  if (/^<?(?:your|replace|insert|example)/i.test(raw)) continue;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  local = pattern.test(local)
    ? local.replace(pattern, () => `${name}=${raw}`)
    : `${local}\n${name}=${raw}\n`;
  moved.push(name);
}
writeFileSync(".env.local", local);
writeFileSync(
  ".env.example",
  example
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
      return m &&
        (/KEY/.test(m[1]) || ["NEXT_PUBLIC_SUPABASE_URL"].includes(m[1]))
        ? `${m[1]}=`
        : line;
    })
    .join("\n"),
);
console.log("Loaded values into ignored .env.local: " + moved.join(", "));
console.log("Example key fields reset to empty values. No values printed.");
