import "server-only";
import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { adminDb } from "./admin-db";
import { env } from "./config";

type Bucket = "api" | "processing" | "visitor";

export class ApiBudgetError extends Error {
  constructor(readonly status: 429 | 503, readonly retryAfter: number) {
    super(status === 429
      ? `Too many requests. Try again in ${retryAfter} seconds.`
      : "Request limits are temporarily unavailable. Try again shortly.");
  }
}

async function consume(subject: string, bucket: Bucket) {
  let wait: unknown;
  try {
    const result = await adminDb().rpc("consume_api_budget", { p_subject: subject, p_bucket: bucket });
    if (result.error) throw new Error("Budget unavailable");
    wait = result.data;
  } catch {
    throw new ApiBudgetError(503, 5);
  }
  if (typeof wait !== "number" || !Number.isSafeInteger(wait) || wait < 0)
    throw new ApiBudgetError(503, 5);
  if (wait > 0) throw new ApiBudgetError(429, wait);
}

export function startsProcessing(method: string, path: string[]) {
  return method === "POST" && (
    (path[0] === "meetings" && ["process", "generate"].includes(path[2])) ||
    (path[0] === "projects" && ["prepare", "scope-check"].includes(path[2]))
  );
}

export async function limitAccount(userId: string, processing = false) {
  const subject = createHash("sha256").update(userId).digest("hex");
  await consume(subject, "api");
  if (processing) await consume(subject, "processing");
}

export async function limitVisitor(headers: Headers) {
  // Vercel supplies this header. Other hosts share a fallback until a trusted proxy is configured.
  const address = process.env.VERCEL === "1" ? headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() : undefined;
  const identity = address && isIP(address) ? address : "shared";
  const subject = createHmac("sha256", env("SUPABASE_SECRET_KEY")).update("visitor:" + identity).digest("hex");
  await consume(subject, "visitor");
}
