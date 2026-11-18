import { processProject, failProject } from "@/lib/project-processing";

export async function generateProject(runId: string) {
  "use workflow";
  try { await generate(runId); }
  catch (error) { await fail(runId, error instanceof Error ? error.message : "AI processing failed."); }
}
async function generate(id: string) { "use step"; await processProject(id); }
async function fail(id: string, message: string) { "use step"; await failProject(id, message); }
