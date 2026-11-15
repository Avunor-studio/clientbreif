import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { adminDb } from "../src/lib/admin-db";
import { cleanupMeeting } from "../src/lib/processing";
it.skipIf(process.env.CLIENTBRIEF_LIVE_CLEANUP !== "1")(
  "deletes only disposable storage and meeting fixtures while preserving recording-only work",
  async () => {
    Object.assign(process.env, parseEnv(readFileSync(".env.local", "utf8")));
    const db = adminDb();
    const { data: source, error: sourceError } = await db
      .from("meetings")
      .select("organization_id,project_id")
      .eq("id", "33370aa9-443d-44fc-bbde-14e3de4cbe5a")
      .single();
    if (sourceError) throw sourceError;
    const id = randomUUID(),
      sid = randomUUID(),
      path = `${source.organization_id}/${id}/disposable-cleanup.wav`;
    function checked(r: any) {
      if (r.error) throw new Error(r.error.message);
      return r.data;
    }
    checked(
      await db
        .from("meetings")
        .insert({
          id,
          ...source,
          title: "Disposable cleanup acceptance fixture",
          mime_type: "audio/wav",
          bytes: 4,
          recording_path: path,
          status: "transcript_ready",
          transcript_revision: 1,
        }),
    );
    checked(
      await db.storage
        .from("recordings")
        .upload(path, new Uint8Array([82, 73, 70, 70]), {
          contentType: "audio/wav",
        }),
    );
    checked(
      await db
        .from("transcript_segments")
        .insert({
          id: sid,
          meeting_id: id,
          organization_id: source.organization_id,
          speaker: "Test",
          start_ms: 0,
          end_ms: 1000,
          text: "Synthetic cleanup fixture",
        }),
    );
    const version = checked(
      await db.rpc("save_output", {
        p_meeting: id,
        p_org: source.organization_id,
        p_revision: 1,
        p_user: "acceptance-test",
        p_content: {
          brief: {
            overview: "Disposable fixture",
            scope: [],
            deliverables: [],
            requirements: [],
            openQuestions: [],
          },
          decisions: [],
          tasks: [],
          followUp: "Synthetic draft",
        },
      }),
    );
    checked(
      await db.rpc("begin_cleanup", {
        p_org: source.organization_id,
        p_meeting: id,
        p_full: false,
      }),
    );
    await cleanupMeeting(id);
    expect(
      checked(await db.from("output_versions").select("id").eq("id", version))
        .length,
    ).toBe(1);
    expect(
      checked(
        await db.from("transcript_segments").select("id").eq("meeting_id", id),
      ).length,
    ).toBe(1);
    expect(
      (await db.storage.from("recordings").download(path)).error,
    ).not.toBeNull();
    checked(
      await db.rpc("begin_cleanup", {
        p_org: source.organization_id,
        p_meeting: id,
        p_full: true,
      }),
    );
    await cleanupMeeting(id);
    expect(
      checked(
        await db.from("output_versions").select("id").eq("meeting_id", id),
      ).length,
    ).toBe(0);
    expect(
      checked(
        await db.from("transcript_segments").select("id").eq("meeting_id", id),
      ).length,
    ).toBe(0);
    const tombstone = checked(
      await db
        .from("meetings")
        .select("deleted_at,cleanup_status,recording_path")
        .eq("id", id)
        .single(),
    );
    expect(tombstone.deleted_at).not.toBeNull();
    expect(tombstone.cleanup_status).toBe("completed");
    expect(tombstone.recording_path).toBeNull();
    console.info("live.cleanup.verified", { meetingId: id });
  },
  90000,
);
