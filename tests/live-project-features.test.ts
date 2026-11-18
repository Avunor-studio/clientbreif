import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { adminDb } from "../src/lib/admin-db";
import { generateOutputs, failRun } from "../src/lib/processing";
import { prepSchema } from "../src/lib/intake-model";
import { scopeSchema, validateScope, changeRequestMarkdown, type ScopeChange } from "../src/lib/scope-model";
import { outputSchema, validateReferences } from "../src/lib/model";

// Explicit live opt-in; only the named synthetic project is mutated.
it.skipIf(process.env.CLIENTBRIEF_LIVE_PROJECTS !== "1")("verifies live intake preparation, scope comparison, review, and intake-backed brief", async () => {
  Object.assign(process.env, parseEnv(readFileSync(".env.local", "utf8")));
  const db = adminDb();
  function read<T>(r: {data:T; error: {message:string}|null}): NonNullable<T> { if(r.error) throw new Error(r.error.message); return r.data!; }
  const projectId = "32c56473-25d7-40b8-82ad-a0ee7b37f378";
  const project = read(await db.from("projects").select("*").eq("id",projectId).single());
  expect(project.name).toBe("Intake & scope — synthetic feature test");
  const intakes = read(await db.from("intake_responses").select("*").eq("project_id",projectId));
  expect(intakes.length).toBeGreaterThan(0);
  const runs = read(await db.from("project_runs").select("*").eq("project_id",projectId));
  const prep = runs.find(r=>r.kind==='intake_prep');
  expect(prep?.status).toBe('completed'); prepSchema.parse(prep!.result);
  const comparison = runs.find(r=>r.kind==='scope_check');
  expect(comparison?.status).toBe('completed');
  const changes = read(await db.from("scope_changes").select("*").eq("run_id",comparison!.id)) as ScopeChange[];
  expect(changes.length).toBeGreaterThan(0);
  const segments = read(await db.from("transcript_segments").select("*").eq("meeting_id", comparison!.meeting_id));
  const baseline = read(await db.from("output_versions").select("*").eq("id",comparison!.baseline_version_id).single());
  validateScope(scopeSchema.parse({changes:changes.map(c=>c.suggestion)}),segments,baseline.content.brief);
  expect(JSON.stringify(changes.map(c=>c.suggestion))).not.toMatch(/90000|90,000/);
  expect(changes.some(c=>/booking|deposit/i.test(c.suggestion.description))).toBe(true);
  const change=changes[0];
  const reviewed=read(await db.rpc('review_scope_change',{p_org:project.organization_id,p_project:projectId,p_change:change.id,p_revision:change.revision,p_status:'confirmed',p_note:'Synthetic acceptance test only.',p_budget:'',p_timeline:'',p_user:'synthetic_test'}));
  expect(reviewed.status).toBe('confirmed');
  expect(changeRequestMarkdown(project.name,[reviewed])).toContain('Not assessed');
  const after=read(await db.from('output_versions').select('content').eq('id',baseline.id).single());
  expect(after.content).toEqual(baseline.content);
  // Baseline meeting is a synthetic fixture, with no recording or provider artifact.
  const run=read(await db.rpc('claim_generation',{p_org:project.organization_id,p_meeting:baseline.meeting_id,p_intake:intakes[0].id}));
  expect(run.workflow_id).toBeNull();
  try { await generateOutputs(run.id); } catch(e) { await failRun(run.id,(e as Error).message); throw e; }
  const version=read(await db.from('output_versions').select('*').eq('meeting_id',baseline.meeting_id).order('created_at',{ascending:false}).limit(1).single());
  const originalSegments=read(await db.from('transcript_segments').select('*').eq('meeting_id',baseline.meeting_id));
  const output=validateReferences(outputSchema.parse(version.content),originalSegments,intakes);
  expect([...output.brief.scope,...output.brief.deliverables,...output.brief.requirements].some(i=>i.intakeRefs?.length)).toBe(true);
  expect(output.tasks.every(t=>t.owner===null && t.deadline===null)).toBe(true);
  const links=read(await db.from('review_links').select('id').eq('version_id',version.id));
  expect(links).toHaveLength(0);
  console.info('live.project.features.verified',{agenda:true,scopeSuggestions:changes.length,review:true,intakeBrief:true,approvalUnchanged:true});
},240000);
