import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "./config";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function adminDb() {
  return createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function context(admin = false) {
  const session = await auth();
  if (!session.userId) throw new HttpError(401, "Sign in to continue.");
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
  error: { message: string } | null;
}): NonNullable<T> {
  if (result.error) {
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
  let q = ctx.db
    .from("meetings")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.orgId);
  if (!includeDeleted) q = q.is("deleted_at", null);
  const row = checked(await q.maybeSingle());
  if (!row) throw new HttpError(404, "Meeting not found.");
  return row;
}
