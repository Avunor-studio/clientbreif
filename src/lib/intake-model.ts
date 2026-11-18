import { z } from "zod";

export const intakeFields = ["goals", "audience", "deliverables", "budget", "timeline", "references", "decisionMaker"] as const;
export type IntakeField = (typeof intakeFields)[number];
export const intakeLabels: Record<IntakeField, string> = {
  goals: "Goals & success measures", audience: "Audience", deliverables: "Requested deliverables",
  budget: "Budget", timeline: "Timeline", references: "Brand, assets & reference links", decisionMaker: "Decision maker",
};
const answer = z.string().trim().max(4000);
export const intakeAnswersSchema = z.object({
  goals: answer.min(1), audience: answer, deliverables: answer.min(1), budget: answer,
  timeline: answer, references: answer, decisionMaker: answer,
}).strict();
export const intakeSubmissionSchema = z.object({
  name: z.string().trim().min(1).max(150), email: z.email().max(254),
  answers: intakeAnswersSchema, consent: z.literal(true),
});
export type IntakeAnswers = z.infer<typeof intakeAnswersSchema>;
export type IntakeResponse = {
  id: string; project_id: string; link_id: string; name: string; email: string;
  answers: IntakeAnswers; created_at: string;
};
export const intakeRefSchema = z.object({ responseId: z.string().uuid(), field: z.enum(intakeFields) });
export type IntakeRef = z.infer<typeof intakeRefSchema>;

export const prepGenerationSchema = z.object({
  agenda: z.array(z.object({ topic: z.string(), purpose: z.string(), fields: z.array(z.enum(intakeFields)) })),
  questions: z.array(z.object({ question: z.string(), field: z.enum(intakeFields) })),
});
export const prepSchema = z.object({
  agenda: z.array(z.object({ topic: z.string().min(1).max(250), purpose: z.string().min(1).max(2000), fields: z.array(z.enum(intakeFields)).min(1).max(7) })).min(1).max(15),
  questions: z.array(z.object({ question: z.string().min(1).max(2000), field: z.enum(intakeFields) })).max(20),
});
export type IntakePrep = z.infer<typeof prepSchema>;
export function validateIntakeRefs(refs: IntakeRef[], responses: IntakeResponse[]) {
  for (const ref of refs) {
    const response = responses.find((r) => r.id === ref.responseId);
    if (!response || !response.answers[ref.field]?.trim())
      throw new Error("An output references an unknown or empty intake answer.");
  }
}
