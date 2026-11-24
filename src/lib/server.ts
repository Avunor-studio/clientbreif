import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "./config";
import { ApiBudgetError, limitAccount } from "./rate-limit";
import { adminDb } from "./admin-db";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const MAX_JSON_BODY_BYTES = 2_000_000;

export async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "Send a JSON object.");
  const decoder = new TextDecoder();
  let json = "";
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_JSON_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        throw new HttpError(413, "Request is too large.");
      }
      json += decoder.decode(value, { stream: true });
    }
    json += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  let body: unknown;
  try {
    body = JSON.parse(json);
  } catch {
    throw new HttpError(400, "Send valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new HttpError(400, "Send a JSON object.");
  return body as Record<string, unknown>;
}
export async function context(admin = false, request?: { processing: boolean }) {
  const session = await auth();
  if (!session.userId) throw new HttpError(401, "Sign in to continue.");
  if (request) await limitAccount(session.userId, request.processing);
  if (!session.orgId)
    throw new HttpError(403, "Choose or create an agency workspace.");
  // Check current membership rather than relying only on a potentially stale session role.
  const clerk = await clerkClient();
  const { data } = await clerk.organizations.getOrganizationMembershipList({
    organizationId: session.orgId,
    userId: [session.userId],
  });
  const membership = data.find(
    (m) => m.publicUserData?.userId === session.userId,
  );
  if (!membership)
    throw new HttpError(403, "You no longer have access to this workspace.");
  const isAdmin = membership.role === "org:admin";
  if (!isAdmin && membership.role !== "org:member")
    throw new HttpError(403, "This workspace role has no ClientBrief access.");
  if (admin && !isAdmin)
    throw new HttpError(403, "An agency admin is required for this action.");
  const db = createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      accessToken: () => session.getToken(),
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return { db, orgId: session.orgId, userId: session.userId, isAdmin };
}
export function checked<T>(result: {
  data: T;
  error: { message: string; code?: string } | null;
}): NonNullable<T> {
  if (result.error) {
    if (result.error.code === "PT402") throw new HttpError(402, result.error.message);
    if (result.error.code === "PT429") throw new ApiBudgetError(429, 60);
    if (/No suitable key|wrong key type/i.test(result.error.message)) {
      throw new HttpError(
        503,
        "Supabase cannot verify your Clerk session. In Supabase Authentication → Third-party auth, enable Clerk with this app’s Clerk issuer domain, then enable Supabase compatibility in Clerk and sign in again.",
      );
    }
    throw new Error(result.error.message);
  }
  return result.data!;
}
export async function scopedMeeting(
  ctx: Awaited<ReturnType<typeof context>>,
  id: string,
  includeDeleted = false,
) {
  if (includeDeleted && !ctx.isAdmin)
    throw new HttpError(403, "An agency admin is required for cleanup.");
  const db = includeDeleted ? adminDb() : ctx.db;
  let q = db
    .from("meetings")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.orgId);
  if (!includeDeleted) q = q.is("deleted_at", null);
  const row = checked(await q.maybeSingle());
  if (!row) throw new HttpError(404, "Meeting not found.");
  return row;
}
