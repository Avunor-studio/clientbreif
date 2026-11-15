import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import { adminDb } from "../src/lib/admin-db";
import {
  submitTranscription,
  pollTranscription,
  failRun,
  cleanupMeeting,
} from "../src/lib/processing";
it.skipIf(process.env.CLIENTBRIEF_LIVE_SILENCE !== "1")(
  "handles a real silent recording and removes its provider artifacts",
  async () => {
    Object.assign(process.env, parseEnv(readFileSync(".env.local", "utf8")));
    const db = adminDb();
    const checked = (r: any) => {
      if (r.error) throw new Error(r.error.message);
      return r.data;
    };
    const source = checked(
      await db
        .from("meetings")
        .select("organization_id,project_id")
        .eq("id", "33370aa9-443d-44fc-bbde-14e3de4cbe5a")
        .single(),
    );
    const id = randomUUID(),
      path = `${source.organization_id}/${id}/disposable-silence.wav`;
    const wav = Buffer.alloc(44 + 32000);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(16000, 24);
    wav.writeUInt32LE(32000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(32000, 40);
    checked(
      await db
        .from("meetings")
        .insert({
          id,
          ...source,
          title: "Disposable silence acceptance fixture",
          mime_type: "audio/wav",
          bytes: wav.length,
          recording_path: path,
          duration_seconds: 1,
        }),
    );
    try {
      checked(
        await db.storage
          .from("recordings")
          .upload(path, wav, { contentType: "audio/wav" }),
      );
      const run = checked(
        await db.rpc("claim_run", {
          p_org: source.organization_id,
          p_meeting: id,
          p_kind: "transcribe",
        }),
      );
      const provider = await submitTranscription(run.id);
      let failure = "";
      for (let n = 0; n < 20; n++) {
        try {
          if (await pollTranscription(run.id, provider))
            throw new Error("Unexpected transcript for silence");
        } catch (e) {
          failure = e instanceof Error ? e.message : String(e);
          break;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      expect(failure).toMatch(/No clear speech|no.*speech|audio.*too short/i);
      await failRun(run.id, failure);
      expect(
        checked(
          await db
            .from("transcript_segments")
            .select("id")
            .eq("meeting_id", id),
        ).length,
      ).toBe(0);
    } finally {
      checked(
        await db.rpc("begin_cleanup", {
          p_org: source.organization_id,
          p_meeting: id,
          p_full: true,
        }),
      );
      await cleanupMeeting(id);
    }
    expect(
      checked(
        await db
          .from("meetings")
          .select("cleanup_status,provider_id")
          .eq("id", id)
          .single(),
      ),
    ).toEqual({ cleanup_status: "completed", provider_id: null });
  },
  100000,
);
