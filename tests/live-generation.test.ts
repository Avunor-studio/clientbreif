import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { adminDb } from "../src/lib/admin-db";
import { generateOutputs, failRun } from "../src/lib/processing";
import { outputSchema } from "../src/lib/model";

// Explicit opt-in: calls a real provider and saves a draft only on the named
// synthetic meeting. Ordinary npm test runs never access live services.
it.skipIf(process.env.CLIENTBRIEF_LIVE_GENERATION !== "1")(
  "generates and persists a real draft for the existing synthetic smoke meeting",
  async () => {
    // NODE_ENV=test intentionally skips .env.local in Next's normal loader.
    Object.assign(process.env, parseEnv(readFileSync(".env.local", "utf8")));
    expect(process.env.AI_PROVIDER || "google").toBe("google");
    const db = adminDb();
    const meetingId = "33370aa9-443d-44fc-bbde-14e3de4cbe5a";
    const { data: meeting, error } = await db
      .from("meetings")
      .select(
        "id,title,organization_id,transcript_revision,provider_id,status,deleted_at",
      )
      .eq("id", meetingId)
      .single();
    if (error) throw new Error(error.message);
    expect(meeting.title).toBe("Synthetic client discovery — end-to-end test");
    expect(meeting.deleted_at).toBeNull();
    expect(meeting.transcript_revision).toBeGreaterThan(0);
    const { data: run, error: claimError } = await db.rpc("claim_run", {
      p_org: meeting.organization_id,
      p_meeting: meetingId,
      p_kind: "generate",
    });
    if (claimError) throw new Error(claimError.message);
    expect(run.kind).toBe("generate");
    // Do not race an already-enqueued Workflow execution.
    expect(run.workflow_id).toBeNull();
    try {
      await generateOutputs(run.id);
    } catch (failure) {
      await failRun(
        run.id,
        failure instanceof Error ? failure.message : "Live generation failed.",
      );
      throw failure;
    }
    const { data: version, error: versionError } = await db
      .from("output_versions")
      .select("id,content,transcript_revision")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (versionError) throw new Error(versionError.message);
    const content = outputSchema.parse(version.content);
    expect(content.brief.overview.length).toBeGreaterThan(0);
    expect(content.tasks.every((task) => task.deadline === null)).toBe(true);
    expect(version.transcript_revision).toBe(meeting.transcript_revision);
    const { data: after } = await db
      .from("meetings")
      .select("status,provider_id")
      .eq("id", meetingId)
      .single();
    expect(after?.status).toBe("ready");
    expect(after?.provider_id).toBe(meeting.provider_id);
    console.info("live.google.verified", {
      versionId: version.id,
      tasks: content.tasks.length,
      transcriptionReused: true,
    });
  },
  180000,
);
