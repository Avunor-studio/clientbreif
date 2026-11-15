import { NextRequest, NextResponse } from "next/server";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { start } from "workflow/api";
import { HookConflictError } from "workflow/errors";
import { context, checked, scopedMeeting, HttpError } from "@/lib/server";
import { adminDb } from "@/lib/admin-db";
import { missingConfig, env, generationApiKeyName } from "@/lib/config";
import {
  idSchema,
  outputSchema,
  validateReferences,
  validateUpload,
  briefMarkdown,
  csvCell,
  type Segment,
} from "@/lib/model";
import {
  transcribeMeeting,
  generateMeeting,
  deleteMeeting,
} from "@/workflows/meeting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const ok = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const clientSchema = z.object({
  name: z.string().trim().min(1).max(150),
  contact_email: z.union([z.email(), z.literal("")]).optional(),
});
const projectSchema = z.object({
  name: z.string().trim().min(1).max(150),
  client_id: idSchema,
  description: z.string().max(5000).default(""),
});

async function reviewRead(token: string) {
  const db = adminDb();
  const link = checked(
    await db
      .from("review_links")
      .select("id,version_id,expires_at,revoked_at")
      .eq("token_hash", hash(token))
      .maybeSingle(),
  );
  if (!link || link.revoked_at || new Date(link.expires_at) <= new Date())
    throw new HttpError(410, "This review link has expired or been revoked.");
  const v = checked(
    await db
      .from("output_versions")
      .select("content,meeting_id,created_at")
      .eq("id", link.version_id)
      .single(),
  );
  const m = checked(
    await db
      .from("meetings")
      .select("title,deleted_at")
      .eq("id", v.meeting_id)
      .single(),
  );
  if (m.deleted_at)
    throw new HttpError(410, "This brief is no longer available.");
  const response = checked(
    await db
      .from("review_responses")
      .select("decision,comments,created_at,name")
      .eq("link_id", link.id)
      .maybeSingle(),
  );
  return {
    title: m.title,
    brief: v.content.brief,
    versionDate: v.created_at,
    expiresAt: link.expires_at,
    response,
  };
}

async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await params).path;
    const method = req.method;
    if (method !== "GET") {
      const origin = req.headers.get("origin");
      const allowed = new URL(process.env.APP_URL || req.url).origin;
      if (origin && origin !== allowed)
        throw new HttpError(403, "Request origin is not allowed.");
      if (Number(req.headers.get("content-length") || 0) > 2_000_000)
        throw new HttpError(413, "Request is too large.");
    }
    if (path[0] === "review" && method === "POST") {
      const body = await req.json();
      const token = tokenSchema.parse(body.token);
      if (path[1] === "read") return ok(await reviewRead(token));
      if (path[1] === "respond") {
        const input = z
          .object({
            name: z.string().trim().min(1).max(150),
            email: z.email().max(254),
            decision: z.enum(["approved", "changes_requested"]),
            comments: z.string().max(5000).default(""),
          })
          .parse(body);
        if (input.decision === "changes_requested" && !input.comments.trim())
          throw new HttpError(400, "Describe the changes you need.");
        await reviewRead(token);
        const response = checked(
          await adminDb().rpc("submit_review", {
            p_hash: hash(token),
            p_name: input.name,
            p_email: input.email,
            p_decision: input.decision,
            p_comments: input.comments,
          }),
        );
        return ok({
          decision: response.decision,
          comments: response.comments,
          name: response.name,
          created_at: response.created_at,
        });
      }
    }
    const missing = missingConfig(false);
    if (missing.length)
      throw new HttpError(
        503,
        `Setup required: configure ${missing.join(", ")}.`,
      );
    const ctx = await context();
    const db = ctx.db;
    const organization_id = ctx.orgId;
    if (path[0] === "bootstrap" && method === "GET") {
      const results = await Promise.all([
        db
          .from("clients")
          .select("*")
          .order("created_at", { ascending: false }),
        db
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false }),
        db
          .from("meetings")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        db
          .from("review_links")
          .select(
            "id,version_id,expires_at,revoked_at,review_responses(decision,created_at)",
          )
          .order("created_at", { ascending: false }),
        db
          .from("output_versions")
          .select("id,meeting_id,created_at")
          .order("created_at", { ascending: false }),
        db
          .from("processing_runs")
          .select("id,meeting_id,kind,status,created_at,finished_at,error"),
        db
          .from("meetings")
          .select("id,title,cleanup_status,cleanup_error,deleted_at")
          .in("cleanup_status", ["pending", "failed"]),
      ]);
      const [clients, projects, meetings, links, versions, runs, cleanup] =
        results.map(checked);
      return ok({
        clients,
        projects,
        meetings,
        links,
        versions,
        runs,
        cleanup,
        isAdmin: ctx.isAdmin,
        missing: missingConfig(),
        orgId: organization_id,
      });
    }
    if (path[0] === "clients" || path[0] === "projects") {
      const resource = path[0];
      if (method === "POST" || method === "PATCH") {
        const data = (
          resource === "clients" ? clientSchema : projectSchema
        ).parse(await req.json());
        const result =
          method === "POST"
            ? await db
                .from(resource)
                .insert({ ...data, organization_id })
                .select()
                .single()
            : await db
                .from(resource)
                .update(data)
                .eq("id", idSchema.parse(path[1]))
                .eq("organization_id", organization_id)
                .select()
                .single();
        return ok(checked(result), method === "POST" ? 201 : 200);
      }
    }
    if (path[0] === "meetings") {
      if (method === "POST" && path.length === 1) {
        const b = z
          .object({
            project_id: idSchema,
            title: z.string().trim().min(1).max(200),
            name: z.string().max(255),
            size: z.number().int(),
            mime: z.string(),
            duration: z.number(),
            consent: z.literal(true),
          })
          .parse(await req.json());
        const ext = validateUpload(b.name, b.size, b.mime, b.duration);
        const project = checked(
          await db
            .from("projects")
            .select("id")
            .eq("id", b.project_id)
            .maybeSingle(),
        );
        if (!project) throw new HttpError(404, "Project not found.");
        const id = randomUUID(),
          recording_path = `${organization_id}/${id}/recording.${ext}`;
        const row = checked(
          await adminDb()
            .from("meetings")
            .insert({
              id,
              organization_id,
              project_id: b.project_id,
              title: b.title,
              recording_path,
              mime_type: b.mime,
              bytes: b.size,
              duration_seconds: b.duration,
            })
            .select()
            .single(),
        );
        return ok(row, 201);
      }
      const id = idSchema.parse(path[1]);
      const m = await scopedMeeting(ctx, id, path[2] === "cleanup");
      if (method === "GET" && path.length === 2) {
        const [segments, versions, links] = await Promise.all([
          db
            .from("transcript_segments")
            .select("*")
            .eq("meeting_id", id)
            .order("start_ms"),
          db
            .from("output_versions")
            .select("*")
            .eq("meeting_id", id)
            .order("created_at", { ascending: false }),
          db
            .from("review_links")
            .select(
              "id,version_id,expires_at,revoked_at,review_responses(name,decision,comments,created_at)",
            )
            .order("created_at", { ascending: false }),
        ]);
        let recordingUrl = null;
        if (
          m.recording_path &&
          !m.recording_deleted &&
          m.status !== "uploading"
        )
          recordingUrl = checked(
            await adminDb()
              .storage.from("recordings")
              .createSignedUrl(m.recording_path, 300),
          ).signedUrl;
        return ok({
          meeting: m,
          segments: checked(segments),
          versions: checked(versions),
          links: checked(links).filter((l) =>
            checked(versions).some((v) => v.id === l.version_id),
          ),
          recordingUrl,
          isAdmin: ctx.isAdmin,
        });
      }
      if (
        method === "POST" &&
        (path[2] === "process" || path[2] === "generate")
      ) {
        const kind = path[2] === "generate" ? "generate" : "transcribe";
        env(
          kind === "generate" ? generationApiKeyName() : "ASSEMBLYAI_API_KEY",
        );
        if (kind === "transcribe") {
          if (m.recording_deleted)
            throw new HttpError(409, "Recording has been deleted.");
          const parts = m.recording_path.split("/");
          const files = checked(
            await adminDb()
              .storage.from("recordings")
              .list(parts.slice(0, -1).join("/"), { search: parts.at(-1) }),
          );
          const file = files.find((f) => f.name === parts.at(-1));
          if (!file || Number(file.metadata?.size) !== Number(m.bytes))
            throw new HttpError(
              409,
              "Upload is incomplete. Resume the recording upload first.",
            );
        }
        const run = checked(
          await adminDb().rpc("claim_run", {
            p_org: organization_id,
            p_meeting: id,
            p_kind: kind,
          }),
        );
        if (run.kind !== kind)
          throw new HttpError(
            409,
            "Wait for the current processing stage to finish.",
          );
        if (!run.workflow_id) {
          // The processing run ID is the idempotency boundary for durable commits.
          try {
            let workflowId: string;
            try {
              const started = await start(
                kind === "generate" ? generateMeeting : transcribeMeeting,
                [run.id],
                {
                  experimental_hook: {
                    token: `processing:${run.id}`,
                    experimental_minRetention: "7 days",
                  },
                },
              );
              workflowId = started.runId;
            } catch (error) {
              if (HookConflictError.is(error) && error.conflictingRunId)
                workflowId = error.conflictingRunId;
              else throw error;
            }
            checked(
              await adminDb()
                .from("processing_runs")
                .update({ workflow_id: workflowId })
                .eq("id", run.id),
            );
          } catch (error) {
            // An uncertain enqueue may already be running. Keep the same domain run ID for a safe retry.
            throw error;
          }
        }
        return ok({ runId: run.id, status: "processing" }, 202);
      }
      if (method === "PATCH" && path[2] === "transcript") {
        const input = z
          .object({
            revision: z.number().int(),
            segments: z
              .array(
                z.object({
                  id: idSchema,
                  speaker: z.string().trim().min(1).max(150),
                  text: z.string().max(15000),
                }),
              )
              .min(1)
              .max(10000),
          })
          .parse(await req.json());
        const result = await adminDb().rpc("edit_transcript", {
          p_meeting: id,
          p_org: organization_id,
          p_revision: input.revision,
          p_segments: input.segments,
        });
        if (result.error) throw new Error(result.error.message);
        return ok({ saved: true });
      }
      if (method === "POST" && path[2] === "outputs") {
        const input = z
          .object({ revision: z.number().int(), content: outputSchema })
          .parse(await req.json());
        const segments = checked(
          await db.from("transcript_segments").select("*").eq("meeting_id", id),
        ) as Segment[];
        validateReferences(input.content, segments);
        const versionId = checked(
          await adminDb().rpc("save_output", {
            p_meeting: id,
            p_org: organization_id,
            p_content: input.content,
            p_revision: input.revision,
            p_user: ctx.userId,
          }),
        );
        return ok({ id: versionId }, 201);
      }
      if (method === "POST" && path[2] === "share") {
        await context(true);
        const input = z.object({ versionId: idSchema }).parse(await req.json());
        const version = checked(
          await db
            .from("output_versions")
            .select("id")
            .eq("id", input.versionId)
            .eq("meeting_id", id)
            .single(),
        );
        const token = randomBytes(32).toString("hex");
        checked(
          await adminDb().rpc("create_review_link", {
            p_org: organization_id,
            p_meeting: id,
            p_version: version.id,
            p_hash: hash(token),
          }),
        );
        return ok(
          {
            url: `${process.env.APP_URL || req.nextUrl.origin}/review#token=${token}`,
          },
          201,
        );
      }
      if (method === "POST" && path[2] === "revoke") {
        await context(true);
        const input = z.object({ linkId: idSchema }).parse(await req.json());
        const versions = checked(
          await db.from("output_versions").select("id").eq("meeting_id", id),
        );
        checked(
          await adminDb()
            .from("review_links")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", input.linkId)
            .eq("organization_id", organization_id)
            .in(
              "version_id",
              versions.map((v) => v.id),
            ),
        );
        return ok({ revoked: true });
      }
      if (method === "DELETE" || (method === "POST" && path[2] === "cleanup")) {
        await context(true);
        const full =
          method === "DELETE" ? path[2] !== "recording" : !!m.deleted_at;
        const result = await adminDb().rpc("begin_cleanup", {
          p_org: organization_id,
          p_meeting: id,
          p_full: full,
        });
        if (result.error) throw new Error(result.error.message);
        await start(deleteMeeting, [id]);
        return ok({ cleanup: "pending" }, 202);
      }
      if (method === "GET" && path[2] === "export") {
        const format = req.nextUrl.searchParams.get("format");
        let text = "";
        let mime = "text/plain";
        let filename = "transcript.txt";
        if (format === "transcript") {
          const segments = checked(
            await db
              .from("transcript_segments")
              .select("*")
              .eq("meeting_id", id)
              .order("start_ms"),
          );
          text = segments
            .map(
              (s) =>
                `[${Math.floor(s.start_ms / 1000)}s] ${s.speaker}: ${s.text}`,
            )
            .join("\n\n");
        } else {
          const v = checked(
            await db
              .from("output_versions")
              .select("*")
              .eq("meeting_id", id)
              .eq("id", idSchema.parse(req.nextUrl.searchParams.get("version")))
              .single(),
          );
          if (format === "brief") {
            text = briefMarkdown(v.content.brief);
            filename = "brief.md";
            mime = "text/markdown";
          } else if (format === "tasks") {
            text = [
              ["Task", "Owner", "Deadline", "Completed", "Source segment IDs"]
                .map(csvCell)
                .join(","),
              ...v.content.tasks.map(
                (t: {
                  text: string;
                  owner: string | null;
                  deadline: string | null;
                  completed: boolean;
                  segmentIds: string[];
                }) =>
                  [
                    t.text,
                    t.owner,
                    t.deadline,
                    t.completed,
                    t.segmentIds.join(" "),
                  ]
                    .map(csvCell)
                    .join(","),
              ),
            ].join("\r\n");
            filename = "tasks.csv";
            mime = "text/csv";
          } else throw new HttpError(400, "Unknown export format.");
        }
        return new NextResponse(text, {
          headers: {
            "Content-Type": `${mime}; charset=utf-8`,
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
          },
        });
      }
    }
    throw new HttpError(404, "Endpoint not found.");
  } catch (error) {
    if (error instanceof z.ZodError)
      return ok(
        {
          error: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status =
      error instanceof HttpError
        ? error.status
        : message.startsWith("Setup required")
          ? 503
          : /changed|already processing|not ready|cancelled|unavailable|Wait for/.test(
                message,
              )
            ? 409
            : 500;
    console.error("api.error", { status, message });
    return ok(
      {
        error:
          status === 500 &&
          !/Setup required|Transcription|Generation/.test(message)
            ? "The request could not be completed. Check the server logs and service configuration."
            : message,
      },
      status,
    );
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
