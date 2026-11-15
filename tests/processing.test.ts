import { describe, it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({
  db: { from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } },
  generate: vi.fn(),
}));
vi.mock("../src/lib/admin-db", () => ({ adminDb: () => mocks.db }));
vi.mock("ai", () => ({
  generateText: mocks.generate,
  Output: { object: vi.fn() },
}));
import {
  submitTranscription,
  pollTranscription,
  generateOutputs,
  cleanupMeeting,
} from "../src/lib/processing";
const meeting = {
  id: "m1",
  deleted_at: null,
  recording_deleted: false,
  recording_path: "org/m1/call.mp3",
  provider_id: "existing-job",
  transcript_revision: 1,
};
const run = {
  id: "r1",
  meeting_id: "m1",
  status: "active",
  kind: "transcribe",
  organization_id: "org",
  transcript_revision: 1,
};
function queued(...values: unknown[]) {
  return () => {
    const query: Record<string, unknown> = {};
    for (const name of [
      "select",
      "eq",
      "is",
      "update",
      "delete",
      "in",
      "order",
    ])
      query[name] = () => query;
    query.single = query.maybeSingle = () =>
      Promise.resolve({ data: values.shift(), error: null });
    query.then = (resolve: (value: unknown) => void) =>
      Promise.resolve({ data: values.shift(), error: null }).then(resolve);
    return query;
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ASSEMBLYAI_API_KEY", "test-only");
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-only");
  vi.stubEnv("AI_PROVIDER", "gateway");
  vi.stubGlobal("fetch", vi.fn());
});
describe("processing safeguards", () => {
  it("reuses a persisted transcription job on retry", async () => {
    mocks.db.from.mockImplementation(queued(run, meeting));
    expect(await submitTranscription("r1")).toBe("existing-job");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not call providers for a cancelled run", async () => {
    mocks.db.from.mockImplementation(
      queued({ ...run, status: "cancelled" }, meeting),
    );
    await expect(submitTranscription("r1")).rejects.toThrow("cancelled");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects a silent recording rather than inventing a transcript", async () => {
    mocks.db.from.mockImplementation(queued(run, meeting));
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "completed",
          text: "",
          utterances: [],
          audio_duration: 10,
        }),
      ),
    );
    await expect(pollTranscription("r1", "job")).rejects.toThrow(
      "No clear speech",
    );
    expect(mocks.db.rpc).not.toHaveBeenCalled();
  });
  it("keeps pending provider jobs pending", async () => {
    mocks.db.from.mockImplementation(queued(run, meeting));
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ status: "processing" })),
    );
    expect(await pollTranscription("r1", "job")).toBe(false);
    expect(mocks.db.rpc).not.toHaveBeenCalled();
  });
  it("surfaces provider failures without committing data", async () => {
    mocks.db.from.mockImplementation(queued(run, meeting));
    vi.mocked(fetch).mockResolvedValue(new Response("denied", { status: 401 }));
    await expect(pollTranscription("r1", "job")).rejects.toThrow("401");
    expect(mocks.db.rpc).not.toHaveBeenCalled();
  });
  it("rejects model output with fabricated evidence", async () => {
    mocks.db.from.mockImplementation(
      queued({ ...run, kind: "generate" }, meeting, []),
    );
    mocks.generate.mockResolvedValue({
      output: {
        brief: {
          overview: "Example",
          scope: [
            {
              text: "Invented",
              segmentIds: ["11111111-1111-4111-8111-111111111111"],
            },
          ],
          requirements: [],
          deliverables: [],
          openQuestions: [],
        },
        tasks: [],
        decisions: [],
        followUp: "Hi",
      },
      usage: {},
    });
    await expect(generateOutputs("r1")).rejects.toThrow("unknown");
    expect(mocks.db.rpc).not.toHaveBeenCalled();
  });
  it("stops automatic retries for Gateway billing setup without committing output", async () => {
    mocks.db.from.mockImplementation(
      queued({ ...run, kind: "generate" }, meeting, []),
    );
    mocks.generate.mockRejectedValue(
      new Error(
        "AI Gateway requires a valid credit card on file to service requests.",
      ),
    );
    const { FatalError } = await import("workflow");
    await expect(generateOutputs("r1")).rejects.toBeInstanceOf(FatalError);
    expect(mocks.db.rpc).not.toHaveBeenCalled();
  });
  it("preserves transient generation failures for Workflow retry", async () => {
    mocks.db.from.mockImplementation(
      queued({ ...run, kind: "generate" }, meeting, []),
    );
    const failure = new Error("Upstream temporarily unavailable");
    mocks.generate.mockRejectedValue(failure);
    await expect(generateOutputs("r1")).rejects.toBe(failure);
    expect(mocks.db.rpc).not.toHaveBeenCalled();
  });
  it("keeps failed cleanup visible and avoids deleting generated work", async () => {
    mocks.db.from.mockImplementation(
      queued(
        { ...meeting, deleted_at: "2026-11-14", cleanup_status: "pending" },
        null,
      ),
    );
    vi.mocked(fetch).mockResolvedValue(
      new Response("failure", { status: 500 }),
    );
    await expect(cleanupMeeting("m1")).rejects.toThrow("500");
    expect(mocks.db.from.mock.calls.map((c) => c[0])).not.toContain(
      "output_versions",
    );
  });
});
