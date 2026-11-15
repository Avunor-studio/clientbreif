import { sleep } from "workflow";
import * as processing from "@/lib/processing";

export async function transcribeMeeting(runId: string) {
  "use workflow";
  try {
    const providerId = await submit(runId);
    for (let attempt = 0; attempt < 240; attempt++) {
      if (await poll(runId, providerId)) return;
      await sleep("15s");
    }
    await failed(
      runId,
      "Transcription timed out. Retry to resume the existing provider job.",
    );
  } catch (error) {
    await failed(
      runId,
      error instanceof Error ? error.message : "Transcription failed.",
    );
  }
}
export async function generateMeeting(runId: string) {
  "use workflow";
  try {
    await generate(runId);
  } catch (error) {
    await failed(
      runId,
      error instanceof Error ? error.message : "Generation failed.",
    );
  }
}
export async function deleteMeeting(id: string) {
  "use workflow";
  await cleanup(id);
}
async function submit(id: string) {
  "use step";
  return processing.submitTranscription(id);
}
async function poll(id: string, provider: string) {
  "use step";
  return processing.pollTranscription(id, provider);
}
async function generate(id: string) {
  "use step";
  return processing.generateOutputs(id);
}
async function failed(id: string, message: string) {
  "use step";
  await processing.failRun(id, message);
}
async function cleanup(id: string) {
  "use step";
  await processing.cleanupMeeting(id);
}
