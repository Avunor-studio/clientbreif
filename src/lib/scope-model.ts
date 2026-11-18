import { z } from "zod";
import type { Output, Segment } from "./model";

const category = z.enum(["addition", "change", "clarification"]);
export const scopeGenerationSchema = z.object({ changes: z.array(z.object({
  title: z.string(), description: z.string(), reason: z.string(), category,
  segmentIds: z.array(z.string()), baselineRefs: z.array(z.string()),
})) });
export const scopeSchema = z.object({ changes: z.array(z.object({
  title: z.string().min(1).max(250), description: z.string().min(1).max(4000),
  reason: z.string().min(1).max(2000), category,
  segmentIds: z.array(z.string().uuid()).min(1).max(30),
  baselineRefs: z.array(z.string().regex(/^(scope|deliverables|requirements):\d+$/)).max(30),
})).max(40) });
export type ScopeSuggestion = z.infer<typeof scopeSchema>["changes"][number];
export const changeReviewSchema = z.object({
  revision: z.number().int().min(0), status: z.enum(["pending", "confirmed", "dismissed", "needs_clarification"]),
  review_note: z.string().trim().max(5000), budget_impact: z.string().trim().max(1000), timeline_impact: z.string().trim().max(1000),
});
export type ScopeChange = {
  id: string; run_id: string; project_id: string; meeting_id: string; baseline_version_id: string;
  suggestion: ScopeSuggestion; source_segments: Segment[]; baseline_items: { id: string; text: string }[];
  status: z.infer<typeof changeReviewSchema>["status"]; review_note: string; budget_impact: string; timeline_impact: string;
  revision: number; reviewed_by: string | null; updated_at: string; created_at: string;
};
export function baselineItems(brief: Output["brief"]) {
  return (["scope", "deliverables", "requirements"] as const).flatMap((field) =>
    brief[field].map((item, index) => ({ id: `${field}:${index}`, text: item.text })),
  );
}
export function validateScope(output: z.infer<typeof scopeSchema>, segments: Segment[], brief: Output["brief"]) {
  const ids = new Set(segments.map((s) => s.id));
  const refs = new Set(baselineItems(brief).map((b) => b.id));
  for (const item of output.changes) {
    if (item.segmentIds.some((id) => !ids.has(id))) throw new Error("Scope suggestion references an unknown transcript segment.");
    if (item.baselineRefs.some((ref) => !refs.has(ref))) throw new Error("Scope suggestion references an unknown approved brief item.");
    if (item.category === "change" && !item.baselineRefs.length) throw new Error("A changed requirement must reference the original approved item.");
  }
  return output;
}
export function changeRequestMarkdown(projectName: string, changes: ScopeChange[]) {
  const confirmed = changes.filter((c) => c.status === "confirmed");
  return [
    `# Change request — ${projectName}`, "Draft for discussion. These changes are not approved and do not amend the current brief.",
    ...confirmed.flatMap((c, i) => [
      `\n## ${i + 1}. ${c.suggestion.title}`, `Approved brief version: ${c.baseline_version_id}`,
      `Original scope: ${c.baseline_items.map((b) => b.text).join("; ") || "No matching item identified in the approved scope."}`,
      `Requested change: ${c.suggestion.description}`, `Reason: ${c.suggestion.reason}`,
      `Budget impact (agency estimate): ${c.budget_impact || "Not assessed"}`,
      `Timeline impact (agency estimate): ${c.timeline_impact || "Not assessed"}`,
      ...(c.review_note ? [`Agency note: ${c.review_note}`] : []),
      "Meeting evidence:", ...c.source_segments.map((s) => `- [${Math.floor(s.start_ms / 1000)}s] ${s.speaker}: ${s.text}`),
    ]), "\nPlease confirm the scope and impacts before work proceeds.",
  ].join("\n\n");
}
