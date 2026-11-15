import nextEnv from "@next/env";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd(), true);
const aiProvider = process.env.AI_PROVIDER || "google";
if (!["google", "gateway"].includes(aiProvider)) {
  console.error("AI_PROVIDER must be google or gateway.");
  process.exit(1);
}
console.log(`AI provider: ${aiProvider}`);
const required = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "ASSEMBLYAI_API_KEY",
  aiProvider === "google"
    ? "GOOGLE_GENERATIVE_AI_API_KEY"
    : "AI_GATEWAY_API_KEY",
  "APP_URL",
];
for (const name of required)
  console.log(`${name}: ${process.env[name] ? "configured" : "MISSING"}`);
if (existsSync(".env.example")) {
  const example = readFileSync(".env.example", "utf8");
  const present = required.filter(
    (k) => !process.env[k] && new RegExp(`^${k}=.+`, "m").test(example),
  );
  if (present.length)
    console.log(
      `Values may be set only in .env.example (not loaded by Next.js): ${present.join(", ")}`,
    );
}
const results = [];
async function probe(name, url, headers) {
  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    results.push({ service: name, status: response.status, ok: response.ok });
    return response;
  } catch (error) {
    results.push({
      service: name,
      ok: false,
      error: error.cause?.code || error.name,
    });
  }
}
const jobs = [];
if (process.env.CLERK_SECRET_KEY)
  jobs.push(
    probe("Clerk", "https://api.clerk.com/v1/instance", {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    }),
  );
if (process.env.ASSEMBLYAI_API_KEY)
  jobs.push(
    probe("AssemblyAI", "https://api.assemblyai.com/v2/transcript?limit=1", {
      Authorization: process.env.ASSEMBLYAI_API_KEY,
    }),
  );
if (aiProvider === "google" && process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  jobs.push(
    probe(
      "Google AI Studio authentication",
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        "x-goog-api-key": process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      },
    ),
  );
if (aiProvider === "gateway" && process.env.AI_GATEWAY_API_KEY)
  jobs.push(
    probe(
      "AI Gateway authentication",
      "https://ai-gateway.vercel.sh/v1/credits",
      { Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}` },
    ),
  );
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY)
  jobs.push(
    (async () => {
      try {
        const db = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SECRET_KEY,
          { auth: { persistSession: false } },
        );
        const { error, status } = await db
          .from("clients")
          .select("id", { count: "exact", head: true });
        results.push({
          service: "Supabase database",
          status,
          ok: !error,
          ...(error ? { code: error.code } : {}),
        });
        const { data, error: storageError } =
          await db.storage.getBucket("recordings");
        results.push({
          service: "Supabase private recordings",
          ok: !storageError,
          private: data ? data.public === false : undefined,
          fileLimitMB: data?.file_size_limit
            ? data.file_size_limit / 1024 / 1024
            : undefined,
        });
      } catch (error) {
        results.push({ service: "Supabase", ok: false, error: error.name });
      }
    })(),
  );
await Promise.allSettled(jobs);
for (const result of results) console.log(JSON.stringify(result));
if (required.some((name) => !process.env[name]) || results.some((r) => !r.ok))
  process.exitCode = 1;
