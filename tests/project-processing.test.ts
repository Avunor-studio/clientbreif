import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: { from: vi.fn(), rpc: vi.fn() }, generate: vi.fn() }));
vi.mock("../src/lib/admin-db", () => ({ adminDb: () => mocks.db }));
vi.mock("ai", () => ({ generateText: mocks.generate, Output: { object: vi.fn() } }));
import { processProject, failProject } from "../src/lib/project-processing";
const sid = "11111111-1111-4111-8111-111111111111";
const run = { id: "run", kind: "scope_check", status: "active", meeting_id: "meeting", baseline_version_id: "baseline", organization_id: "org", project_id: "project", transcript_revision: 1 };
function queue(...rows: unknown[]) {
  return () => {
    const row = rows.shift(); const q: Record<string, unknown> = {};
    for (const name of ["select", "eq", "order", "update"]) q[name] = () => q;
    q.single = q.maybeSingle = () => Promise.resolve({ data: row, error: null });
    q.then = (resolve: (v: unknown) => void) => Promise.resolve({ data: row, error: null }).then(resolve);
    return q;
  };
}
const meeting = { id: "meeting", project_id: "project", deleted_at: null, transcript_revision: 1 };
const baseline = { meeting_id: "original", content: { brief: { overview: "Website", scope: [{ text: "Five pages" }], deliverables: [], requirements: [] } } };
const segments = [{ id: sid, speaker: "Client", start_ms: 1000, end_ms: 3000, text: "Add online booking" }];
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("AI_PROVIDER", "gateway"); vi.stubEnv("AI_GATEWAY_API_KEY", "test-only"); mocks.db.rpc.mockResolvedValue({ data: true, error: null }); });
it("does not repeat completed jobs or call a provider for cancelled jobs", async () => {
  mocks.db.from.mockImplementation(queue({ ...run, status: "completed" })); await processProject("run");
  mocks.db.from.mockImplementation(queue({ ...run, status: "cancelled" })); await expect(processProject("run")).rejects.toThrow("cancelled");
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("rejects changed/deleted evidence before calling AI", async () => {
  for (const changed of [{ ...meeting, transcript_revision: 2 }, { ...meeting, deleted_at: "2026-11-17" }]) {
    mocks.db.from.mockImplementation(queue(run, changed, baseline, segments, meeting));
    await expect(processProject("run")).rejects.toThrow();
  }
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("commits citation snapshots, without invented budget or deadline fields", async () => {
  mocks.db.from.mockImplementation(queue(run, meeting, baseline, segments, meeting));
  mocks.generate.mockResolvedValue({ output: { changes: [{ title: "Booking", description: "Add booking", reason: "New feature", category: "addition", segmentIds: [sid], baselineRefs: [] }] } });
  await processProject("run");
  const saved = mocks.db.rpc.mock.calls[0];
  expect(saved[0]).toBe("commit_project_run");
  expect(saved[1].p_result.changes[0].source_segments).toEqual(segments);
  expect(saved[1].p_result.changes[0]).not.toHaveProperty("budget_impact");
});
it("rejects fabricated citations without persisting suggestions", async () => {
  mocks.db.from.mockImplementation(queue(run, meeting, baseline, segments, meeting));
  mocks.generate.mockResolvedValue({ output: { changes: [{ title: "Booking", description: "Add booking", reason: "New", category: "change", segmentIds: [sid], baselineRefs: ["scope:99"] }] } });
  await expect(processProject("run")).rejects.toThrow("unknown approved");
  expect(mocks.db.rpc).not.toHaveBeenCalled();
});
it("validates discovery agendas before committing", async () => {
  mocks.db.from.mockImplementation(queue({ ...run, kind: "intake_prep", intake_response_id: "intake" }, { id: "intake", answers: { goals: "Leads" } }));
  mocks.generate.mockResolvedValue({ output: { agenda: [{ topic: "Goals", purpose: "Confirm measures", fields: ["goals"] }], questions: [{ question: "What is your budget?", field: "budget" }] } });
  await processProject("run");
  expect(mocks.db.rpc).toHaveBeenCalledWith("commit_project_run", expect.objectContaining({ p_result: expect.objectContaining({ agenda: expect.any(Array) }) }));
  expect(mocks.generate.mock.calls[0][0].system).toContain("untrusted");
});
it("records safe provider-setup errors for retry", async () => {
  const update = vi.fn(); const builder = { update, eq: () => builder, then: (resolve: (v: unknown) => void) => Promise.resolve({ error: null }).then(resolve) }; update.mockReturnValue(builder); mocks.db.from.mockReturnValue(builder);
  await failProject("run", "401 invalid api key, private provider details");
  expect(update.mock.calls[0][0].error).toBe("AI configuration needs attention. Check the configured provider key and billing, then retry.");
});
