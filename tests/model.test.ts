import { describe, it, expect } from "vitest";
import {
  outputSchema,
  validateReferences,
  validateUpload,
  csvCell,
  briefMarkdown,
  type Output,
  type Segment,
} from "../src/lib/model";
const segment: Segment = {
  id: "11111111-1111-4111-8111-111111111111",
  speaker: "Speaker A",
  start_ms: 1000,
  end_ms: 2000,
  text: "We need five pages. The owner and date are not decided.",
};
function sample(): Output {
  return {
    brief: {
      overview: "Website discussion",
      scope: [{ text: "Five pages", segmentIds: [segment.id] }],
      deliverables: [],
      requirements: [],
      openQuestions: ["Who owns the work?"],
    },
    decisions: [],
    tasks: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        text: "Prepare five pages",
        segmentIds: [segment.id],
        owner: null,
        deadline: null,
        completed: false,
      },
    ],
    followUp: "Please confirm the brief.",
  };
}
describe("upload boundaries", () => {
  it.each([
    ["call.mp3", "audio/mpeg"],
    ["call.wav", "audio/wav"],
    ["call.m4a", "audio/mp4"],
    ["call.mp4", "video/mp4"],
    ["call.webm", "video/webm"],
  ])("accepts %s", (name, mime) =>
    expect(validateUpload(name, 1024, mime, 60)).toBeTruthy(),
  );
  it("rejects empty, oversized, mislabeled, unreadable and long recordings", () => {
    for (const [name, size, mime, duration] of [
      ["call.exe", 100, "audio/mpeg", 60],
      ["call.mp3", 0, "audio/mpeg", 60],
      ["call.mp3", 262144001, "audio/mpeg", 60],
      ["call.mp3", 100, "video/mp4", 60],
      ["call.mp3", 100, "audio/mpeg", Infinity],
      ["call.mp3", 100, "audio/mpeg", 3601],
    ] as const)
      expect(() => validateUpload(name, size, mime, duration)).toThrow();
  });
});
describe("evidence and outputs", () => {
  it("preserves nullable owners and deadlines", () => {
    expect(outputSchema.parse(sample()).tasks[0]).toMatchObject({
      owner: null,
      deadline: null,
    });
  });
  it("rejects invented source references", () => {
    const o = sample();
    o.tasks[0].segmentIds = ["33333333-3333-4333-8333-333333333333"];
    expect(() => validateReferences(o, [segment])).toThrow("unknown");
  });
  it("rejects duplicate task IDs", () => {
    const o = sample();
    o.tasks.push(o.tasks[0]);
    expect(() => validateReferences(o, [segment])).toThrow("unique");
  });
  it("requires evidence for every extracted item", () => {
    const o = sample();
    o.brief.scope[0].segmentIds = [];
    expect(outputSchema.safeParse(o).success).toBe(false);
  });
  it("exports readable briefs", () => {
    expect(briefMarkdown(sample().brief)).toContain("- Five pages");
  });
  it("escapes CSV quotes and neutralizes spreadsheet formulas", () => {
    expect(csvCell('say "hello"')).toBe('"say ""hello"""');
    expect(csvCell(" =CMD()")).toBe('"\' =CMD()"');
  });
});
