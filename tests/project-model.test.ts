import { describe, it, expect } from "vitest";
import { intakeSubmissionSchema, prepSchema, type IntakeResponse } from "../src/lib/intake-model";
import { outputSchema, validateReferences, type Output, type Segment } from "../src/lib/model";
import { scopeSchema, validateScope, changeRequestMarkdown, type ScopeChange } from "../src/lib/scope-model";

const sid = "11111111-1111-4111-8111-111111111111";
const iid = "22222222-2222-4222-8222-222222222222";
const intake = { id: iid, answers: { goals: "More qualified leads", audience: "", deliverables: "Five-page website", budget: "", timeline: "", references: "", decisionMaker: "" } } as IntakeResponse;
const segments: Segment[] = [{ id: sid, speaker: "Client", start_ms: 1000, end_ms: 4000, text: "Can we add a booking system?" }];
const brief: Output["brief"] = { overview: "Website", scope: [{ text: "Five pages", segmentIds: [sid] }], deliverables: [], requirements: [], openQuestions: [] };
const suggestion = { title: "Booking system", description: "Client requested booking", reason: "Additional functionality", category: "addition", segmentIds: [sid], baselineRefs: [] } as const;
const scope = () => scopeSchema.parse({ changes: [suggestion] });
function output(): Output { return { brief: { ...brief, scope: [{ text: "More qualified leads", segmentIds: [], intakeRefs: [{ responseId: iid, field: "goals" }] }] }, tasks: [], decisions: [], followUp: "Please confirm." }; }

describe("client intake evidence", () => {
  it("accepts explicit consent and leaves optional answers empty", () => {
    const parsed = intakeSubmissionSchema.parse({ name: "Client", email: "client@example.test", consent: true, answers: intake.answers });
    expect(parsed.answers.budget).toBe("");
  });
  it("requires goals, deliverables, email and consent", () => {
    for (const overrides of [{ consent: false }, { email: "invalid" }, { answers: { ...intake.answers, goals: " " } }, { answers: { ...intake.answers, deliverables: "" } }])
      expect(intakeSubmissionSchema.safeParse({ name: "Client", email: "client@example.test", consent: true, answers: intake.answers, ...overrides }).success).toBe(false);
  });
  it("caps answers and rejects arbitrary source fields", () => {
    expect(intakeSubmissionSchema.safeParse({ name: "Client", email: "client@example.test", consent: true, answers: { ...intake.answers, goals: "x".repeat(4001) } }).success).toBe(false);
    expect(prepSchema.safeParse({ agenda: [{ topic: "T", purpose: "P", fields: ["secret"] }], questions: [] }).success).toBe(false);
  });
  it("accepts intake citations without fabricating transcript timestamps", () => {
    const result = validateReferences(outputSchema.parse(output()), [], [intake]);
    expect(result.brief.scope[0].segmentIds).toEqual([]);
    expect(result.brief.scope[0].intakeRefs?.[0].field).toBe("goals");
  });
  it("rejects missing, foreign-project, and empty intake sources", () => {
    expect(() => validateReferences(output(), [], [])).toThrow("unknown or empty");
    expect(() => validateReferences(output(), [], [{ ...intake, id: sid }])).toThrow("unknown or empty");
    const result = output(); result.brief.scope[0].intakeRefs![0].field = "budget";
    expect(() => validateReferences(result, [], [intake])).toThrow("unknown or empty");
  });
  it("still rejects items with no evidence", () => {
    const result = output(); result.brief.scope[0].intakeRefs = [];
    expect(outputSchema.safeParse(result).success).toBe(false);
  });
});
describe("scope suggestions", () => {
  it("accepts no-change results", () => expect(validateScope({ changes: [] }, segments, brief)).toEqual({ changes: [] }));
  it("allows additions without an existing item", () => expect(validateScope(scope(), segments, brief).changes).toHaveLength(1));
  it("rejects invented meeting evidence", () => {
    const result = scope(); result.changes[0].segmentIds = [iid];
    expect(() => validateScope(result, segments, brief)).toThrow("unknown transcript");
  });
  it("rejects invented approved scope citations", () => {
    const result = scope(); result.changes[0].baselineRefs = ["scope:9"];
    expect(() => validateScope(result, segments, brief)).toThrow("unknown approved");
  });
  it("requires an original requirement for a change", () => {
    const result = scope(); result.changes[0].category = "change";
    expect(() => validateScope(result, segments, brief)).toThrow("original approved");
    result.changes[0].baselineRefs = ["scope:0"];
    expect(validateScope(result, segments, brief).changes).toHaveLength(1);
  });
  it("exports only confirmed changes and never supplies invented estimates", () => {
    const change = { suggestion: scope().changes[0], status: "confirmed", source_segments: segments, baseline_items: [], baseline_version_id: iid, budget_impact: "", timeline_impact: "", review_note: "" } as unknown as ScopeChange;
    const result = changeRequestMarkdown("Example", [change, { ...change, status: "dismissed", suggestion: { ...change.suggestion, title: "Dismissed work" } }]);
    expect(result).toContain("not approved"); expect(result).toContain("Not assessed"); expect(result).toContain("[1s]"); expect(result).not.toContain("Dismissed work");
  });
});
