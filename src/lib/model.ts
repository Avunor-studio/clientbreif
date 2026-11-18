import { z } from "zod";
import { intakeRefSchema, validateIntakeRefs, type IntakeResponse } from "./intake-model";
export const idSchema = z.string().uuid();
export const evidenceSchema = z.object({
  text: z.string().min(1).max(5000),
  segmentIds: z.array(idSchema).max(30),
  intakeRefs: z.array(intakeRefSchema).max(30).optional(),
}).refine((item) => item.segmentIds.length > 0 || (item.intakeRefs?.length || 0) > 0, "Every extracted item needs a transcript or intake source.");
export const taskSchema = evidenceSchema.safeExtend({
  id: idSchema,
  owner: z.string().max(200).nullable(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  completed: z.boolean(),
});
export const outputSchema = z.object({
  brief: z.object({
    overview: z.string().max(10000),
    scope: z.array(evidenceSchema).max(100),
    deliverables: z.array(evidenceSchema).max(100),
    requirements: z.array(evidenceSchema).max(100),
    openQuestions: z.array(z.string().max(2000)).max(50),
  }),
  decisions: z.array(evidenceSchema).max(100),
  tasks: z.array(taskSchema).max(100),
  followUp: z.string().max(15000),
});
export type Output = z.infer<typeof outputSchema>;
// Google rejects some bounded/nested JSON schemas. Send only the shape to the
// provider; outputSchema still enforces every constraint before persistence.
const generationEvidence = z.object({
  text: z.string(),
  segmentIds: z.array(z.string()),
  intakeRefs: z.array(z.object({ responseId: z.string(), field: z.string() })),
});
export const generationSchema = z.object({
  brief: z.object({
    overview: z.string(),
    scope: z.array(generationEvidence),
    deliverables: z.array(generationEvidence),
    requirements: z.array(generationEvidence),
    openQuestions: z.array(z.string()),
  }),
  decisions: z.array(generationEvidence),
  tasks: z.array(
    generationEvidence.extend({
      id: z.string(),
      owner: z.string().nullable(),
      deadline: z.string().nullable(),
      completed: z.boolean(),
    }),
  ),
  followUp: z.string(),
});
export type Segment = {
  id: string;
  speaker: string;
  start_ms: number;
  end_ms: number;
  text: string;
};
export type Meeting = {
  id: string;
  organization_id: string;
  project_id: string;
  title: string;
  status: string;
  error: string | null;
  recording_path: string | null;
  recording_deleted: boolean;
  cleanup_status: string;
  transcript_revision: number;
  provider_id: string | null;
  duration_seconds: number | null;
  created_at: string;
};
export type Version = {
  id: string;
  meeting_id: string;
  content: Output;
  created_at: string;
  transcript_revision: number;
};
export function validateReferences(output: Output, segments: Segment[], intakes: IntakeResponse[] = []) {
  const ids = new Set(segments.map((s) => s.id));
  const items = [
    ...output.brief.scope,
    ...output.brief.deliverables,
    ...output.brief.requirements,
    ...output.decisions,
    ...output.tasks,
  ];
  if (items.some((i) => i.segmentIds.some((id) => !ids.has(id))))
    throw new Error("An output references an unknown transcript segment.");
  if (items.some((i) => !i.segmentIds.length && !i.intakeRefs?.length))
    throw new Error("Every extracted item needs a transcript or intake source.");
  for (const item of items) validateIntakeRefs(item.intakeRefs || [], intakes);
  if (output.decisions.some((item) => !item.segmentIds.length))
    throw new Error("Meeting decisions require transcript evidence; intake requests are not agreements.");
  if (new Set(output.tasks.map((t) => t.id)).size !== output.tasks.length)
    throw new Error("Task IDs must be unique.");
  return output;
}
export const MAX_BYTES = 250 * 1024 * 1024;
export const MAX_SECONDS = 3600;
export const mediaTypes: Record<string, string[]> = {
  mp3: ["audio/mpeg", "audio/mp3"],
  wav: ["audio/wav", "audio/x-wav"],
  m4a: ["audio/mp4", "audio/x-m4a"],
  mp4: ["video/mp4"],
  webm: ["video/webm", "audio/webm"],
};
export function validateUpload(
  name: string,
  size: number,
  mime: string,
  duration: number,
) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!mediaTypes[ext]?.includes(mime))
    throw new Error("Choose an MP3, WAV, M4A, MP4, or WebM recording.");
  if (size <= 0 || size > MAX_BYTES)
    throw new Error("Recordings must be between 1 byte and 250 MB.");
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_SECONDS)
    throw new Error("Recordings must be no longer than 60 minutes.");
  return ext;
}
export function csvCell(v: unknown) {
  let s = String(v ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return `"${s.replaceAll('"', '""')}"`;
}
export function briefMarkdown(brief: Output["brief"]) {
  return [
    "# Project brief",
    brief.overview,
    ...(["scope", "deliverables", "requirements"] as const).flatMap((k) => [
      `\n## ${k[0].toUpperCase() + k.slice(1)}`,
      ...brief[k].map((i) => `- ${i.text}`),
    ]),
    "\n## Open questions",
    ...brief.openQuestions.map((q) => `- ${q}`),
  ].join("\n");
}
