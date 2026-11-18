import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { start } from "workflow/api";
import { HookConflictError } from "workflow/errors";
import { checked, context, HttpError } from "./server";
import { adminDb } from "./admin-db";
import { idSchema } from "./model";
import { intakeSubmissionSchema } from "./intake-model";
import { changeReviewSchema } from "./scope-model";
import { env, generationApiKeyName } from "./config";
import { generateProject } from "@/workflows/project";
import type { NextRequest } from "next/server";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export async function publicIntake(req: NextRequest, action: string) {
  const body = await req.json();
  const token = tokenSchema.parse(body.token);
  const db = adminDb();
  const link = checked(await db.from("intake_links").select("id,project_id,expires_at,revoked_at").eq("token_hash", hash(token)).maybeSingle());
  if (!link || link.revoked_at || Date.parse(link.expires_at) <= Date.now()) throw new HttpError(410, "This intake link has expired or been revoked. Ask the agency for a new link.");
  if (action === "read") {
    const project = checked(await db.from("projects").select("name").eq("id", link.project_id).single());
    const response = checked(await db.from("intake_responses").select("id").eq("link_id", link.id).maybeSingle());
    // No prior answers, contact details, internal description, or other project data is exposed.
    return { projectName: project.name, expiresAt: link.expires_at, submitted: Boolean(response) };
  }
  if (action === "submit") {
    const input = intakeSubmissionSchema.parse(body);
    checked(await db.rpc("submit_intake", { p_hash: hash(token), p_name: input.name, p_email: input.email, p_answers: input.answers }));
    return { submitted: true };
  }
  throw new HttpError(404, "Endpoint not found.");
}

export async function projectFeature(req: NextRequest, path: string[], ctx: Awaited<ReturnType<typeof context>>) {
  const id = idSchema.parse(path[1]);
  const project = checked(await ctx.db.from("projects").select("*").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle());
  if (!project) throw new HttpError(404, "Project not found.");
  const db = ctx.db;
  const method = req.method;
  if (method === "GET" && path.length === 2) {
    const [links, intakes, runs, changes, meetings] = await Promise.all([
      db.from("intake_links").select("id,expires_at,revoked_at,created_at").eq("project_id", id).order("created_at", { ascending: false }),
      db.from("intake_responses").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      db.from("project_runs").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      db.from("scope_changes").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      db.from("meetings").select("id,title,transcript_revision,created_at").eq("project_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
    ]);
    const meetingRows = checked(meetings);
    const versions = meetingRows.length ? checked(await db.from("output_versions").select("id,meeting_id,created_at,content").in("meeting_id", meetingRows.map((m) => m.id)).order("created_at", { ascending: false })) : [];
    const approvals = versions.length ? checked(await db.from("review_links").select("version_id,review_responses(decision)").in("version_id", versions.map((v) => v.id))) : [];
    return { project, links: checked(links), intakes: checked(intakes), runs: checked(runs), changes: checked(changes), meetings: meetingRows,
      baselines: versions.filter((v) => approvals.some((a) => a.version_id === v.id && a.review_responses.some((r) => r.decision === "approved"))), isAdmin: ctx.isAdmin };
  }
  if (path[2] === "intake-links" && method === "POST") {
    if (!ctx.isAdmin) throw new HttpError(403, "An agency admin is required to share intake forms.");
    const token = randomBytes(32).toString("hex");
    const link = checked(await adminDb().from("intake_links").insert({ organization_id: ctx.orgId, project_id: id, token_hash: hash(token) }).select("id,expires_at").single());
    return { ...link, url: `${new URL(process.env.APP_URL || req.url).origin}/intake#token=${token}` };
  }
  if (path[2] === "intake-links" && method === "DELETE") {
    if (!ctx.isAdmin) throw new HttpError(403, "An agency admin is required to revoke intake forms.");
    const result = checked(await adminDb().from("intake_links").update({ revoked_at: new Date().toISOString() }).eq("id", idSchema.parse(path[3])).eq("organization_id", ctx.orgId).eq("project_id", id).select("id").maybeSingle());
    if (!result) throw new HttpError(404, "Intake link not found.");
    return { revoked: true };
  }
  if (path[2] === "prepare" || path[2] === "scope-check") {
    if (method !== "POST") throw new HttpError(405, "Use POST for this action.");
    env(generationApiKeyName());
    const body = await req.json();
    const input = path[2] === "prepare"
      ? { p_intake: idSchema.parse(body.intakeId), p_meeting: null, p_baseline: null }
      : { p_intake: null, p_meeting: idSchema.parse(body.meetingId), p_baseline: idSchema.parse(body.baselineId) };
    const run = checked(await adminDb().rpc("claim_project_run", { p_org: ctx.orgId, p_project: id, p_kind: path[2] === "prepare" ? "intake_prep" : "scope_check", ...input }));
    if (run.status === "active" && !run.workflow_id) {
      let workflowId: string;
      try {
        workflowId = (await start(generateProject, [run.id], { experimental_hook: { token: `project:${run.id}`, experimental_minRetention: "7 days" } })).runId;
      } catch (error) {
        if (HookConflictError.is(error) && error.conflictingRunId) workflowId = error.conflictingRunId;
        else throw error;
      }
      checked(await adminDb().from("project_runs").update({ workflow_id: workflowId }).eq("id", run.id));
    }
    return { runId: run.id, status: run.status };
  }
  if (path[2] === "changes" && method === "PATCH") {
    const input = changeReviewSchema.parse(await req.json());
    // The scoped read also excludes deleted meetings and deleted baselines.
    const change = checked(await db.from("scope_changes").select("id,revision").eq("id", idSchema.parse(path[3])).eq("project_id", id).maybeSingle());
    if (!change) throw new HttpError(404, "Scope suggestion not found.");
    const result = checked(await adminDb().rpc("review_scope_change", { p_org: ctx.orgId, p_project: id, p_change: change.id, p_revision: input.revision, p_status: input.status, p_note: input.review_note, p_budget: input.budget_impact, p_timeline: input.timeline_impact, p_user: ctx.userId }));
    return result;
  }
  throw new HttpError(404, "Endpoint not found.");
}
