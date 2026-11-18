"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, ClipboardList, Copy, FileDiff, Plus, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { api } from "@/lib/browser-api";
import { intakeFields, intakeLabels, type IntakeResponse, type IntakePrep } from "@/lib/intake-model";
import { changeRequestMarkdown, type ScopeChange } from "@/lib/scope-model";
import type { Output } from "@/lib/model";
import { time } from "@/lib/utils";

type ProjectRun = { id: string; kind: "intake_prep" | "scope_check"; status: string; error: string | null; intake_response_id: string | null; meeting_id: string | null; baseline_version_id: string | null; transcript_revision: number | null; created_at: string; result: IntakePrep | { changes: unknown[] } | null };
type ProjectDetail = {
  project: { id: string; name: string; description: string };
  links: { id: string; expires_at: string; revoked_at: string | null; created_at: string }[];
  intakes: IntakeResponse[]; runs: ProjectRun[]; changes: ScopeChange[];
  meetings: { id: string; title: string; transcript_revision: number; created_at: string }[];
  baselines: { id: string; meeting_id: string; created_at: string; content: Output }[]; isAdmin: boolean;
};
function useUnsaved(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    const click = (e: MouseEvent) => {
      const link = (e.target as Element).closest("a");
      if (link?.getAttribute("href")?.startsWith("/") && link.target !== "_blank" && !window.confirm("Discard unsaved review notes?")) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn); document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", click, true); };
  }, [dirty]);
}
export function ProjectWorkspace({ id }: { id: string }) {
  const [data, setData] = useState<ProjectDetail | null>(null);
  const [tab, setTab] = useState<"intake" | "scope">("intake");
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState(""); const [intakeId, setIntakeId] = useState("");
  const [baselineId, setBaselineId] = useState(""); const [meetingId, setMeetingId] = useState(""); const [runId, setRunId] = useState("");
  const dirtyReviews = useRef(new Set<string>());
  const [hasDirtyReviews, setHasDirtyReviews] = useState(false);
  const trackDirty = useCallback((changeId: string, dirty: boolean) => {
    if (dirty) dirtyReviews.current.add(changeId); else dirtyReviews.current.delete(changeId);
    setHasDirtyReviews(dirtyReviews.current.size > 0);
  }, []);
  useUnsaved(hasDirtyReviews);
  function canChangeComparison() {
    return !dirtyReviews.current.size || window.confirm("Discard unsaved review notes before changing comparisons?");
  }
  const load = useCallback(async () => {
    const next = await api<ProjectDetail>(`projects/${id}`);
    // Background refresh must not replace another open, unsaved review form.
    setData((previous) => ({ ...next, changes: next.changes.map((change) => dirtyReviews.current.has(change.id) ? previous?.changes.find((c) => c.id === change.id) || change : change) }));
    setIntakeId((value) => value || next.intakes[0]?.id || "");
    setBaselineId((value) => value || next.baselines[0]?.id || "");
  }, [id]);
  useEffect(() => { void load().catch((e) => setError(e.message)); }, [load]);
  const active = data?.runs.some((r) => r.status === "active");
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => void load().catch((e) => setError(e.message)), 4000);
    return () => clearInterval(timer);
  }, [active, load]);
  useEffect(() => {
    const refresh = () => void load().catch((e) => setError(e.message));
    window.addEventListener("focus", refresh); return () => window.removeEventListener("focus", refresh);
  }, [load]);
  async function action(fn: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (!data) return <div className="stack"><h1>Project workspace</h1>{error ? <><p className="notice error" role="alert">{error}</p><Button onClick={() => void action(load)}>Try again</Button></> : <p role="status">Loading project…</p>}</div>;
  const intake = data.intakes.find((i) => i.id === intakeId);
  const prepRun = data.runs.find((r) => r.kind === "intake_prep" && r.intake_response_id === intakeId);
  const prep = prepRun?.status === "completed" ? prepRun.result as IntakePrep : null;
  const baseline = data.baselines.find((v) => v.id === baselineId);
  const scopeRuns = data.runs.filter((r) => r.kind === "scope_check");
  const currentRun = scopeRuns.find((r) => r.id === runId) || scopeRuns[0];
  const changes = data.changes.filter((c) => c.run_id === currentRun?.id);
  const sourceMeeting = data.meetings.find((m) => m.id === currentRun?.meeting_id);
  const stale = currentRun && sourceMeeting?.transcript_revision !== currentRun.transcript_revision;
  const confirmed = changes.filter((c) => c.status === "confirmed");
  async function startComparison() {
    if (!canChangeComparison()) return;
    const result = await api<{ runId: string }>(`projects/${id}/scope-check`, "POST", { baselineId, meetingId });
    setRunId(result.runId); await load();
  }
  return <div className="stack project-workspace">
    <Link className="row muted small" href="/app/projects"><ArrowLeft size={14} /> Clients & projects</Link>
    <div className="page-title"><span className="eyebrow">PROJECT WORKSPACE</span><h1>{data.project.name}</h1><p className="muted">{data.project.description || "From the first enquiry to the next scope decision."}</p></div>
    <div className="project-feature-nav"><Button variant="ghost" aria-pressed={tab === "intake"} onClick={() => setTab("intake")}><ClipboardList size={17} /> Client intake</Button><Button variant="ghost" aria-pressed={tab === "scope"} onClick={() => setTab("scope")}><FileDiff size={17} /> Scope changes</Button><Button variant="ghost" disabled={busy} onClick={() => void action(load)}><RefreshCw size={15} /> Refresh</Button></div>
    {error && <p className="notice error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    {/* Keep forms mounted across tab switches so unsaved agency notes are preserved. */}
    <div hidden={tab !== "intake"} className="stack">
      <section className="card stack"><div className="row between"><div><span className="eyebrow">01 / COLLECT CONTEXT</span><h2>A better first conversation.</h2></div>{data.isAdmin && <Button disabled={busy} onClick={() => void action(async () => { const result = await api<{ url: string }>(`projects/${id}/intake-links`, "POST", {}); setShareUrl(result.url); await load(); })}><Plus size={15} /> Create intake link</Button>}</div>
        <p className="muted">Ask about goals, audience, deliverables, budget, timeline, references, and the decision maker. Each link accepts one response and expires after seven days.</p>
        {!data.isAdmin && <p className="small muted">An agency admin can create or revoke client links.</p>}
        {shareUrl && <div className="link-share"><label className="label">New intake link<input className="input" readOnly value={shareUrl} onFocus={(e) => e.target.select()} /></label><div className="row"><Button variant="outline" onClick={() => void action(async () => { await navigator.clipboard.writeText(shareUrl); setNotice("Intake link copied. Send it to your client."); })}><Copy size={14} /> Copy link</Button><a className="btn btn-outline" href={shareUrl} target="_blank" rel="noreferrer">Open form <ArrowUpRight size={14} /></a></div><p className="small muted">Copy this link now. The full link is not stored and cannot be recovered later.</p></div>}
        {data.links.length > 0 && <details><summary>Manage intake links ({data.links.length})</summary><div className="stack">{data.links.map((link) => { const submitted = data.intakes.some((i) => i.link_id === link.id); const activeLink = !link.revoked_at && Date.parse(link.expires_at) > Date.now(); return <div className="list-item row between" key={link.id}><div><strong>{submitted ? "Submitted" : link.revoked_at ? "Revoked" : activeLink ? "Awaiting answers" : "Expired"}</strong><p className="muted small">Created {new Date(link.created_at).toLocaleString()} · Expires {new Date(link.expires_at).toLocaleDateString()}</p></div>{data.isAdmin && activeLink && <Button variant="ghost" disabled={busy} onClick={() => void action(async () => { await api(`projects/${id}/intake-links/${link.id}`, "DELETE"); setShareUrl(""); await load(); })}>Revoke link</Button>}</div>; })}</div></details>}
      </section>
      {!intake ? <section className="card empty"><ClipboardList size={30} /><h2>Client context starts here.</h2><p className="muted">Create a link, send it to your client, then refresh to see their answers.</p></section>
      : <div className="project-feature-grid"><section className="card stack"><span className="eyebrow">02 / CLIENT ANSWERS</span><label className="label">Submission<select value={intakeId} onChange={(e) => setIntakeId(e.target.value)}>{data.intakes.map((i) => <option key={i.id} value={i.id}>{i.name} · {new Date(i.created_at).toLocaleString()}</option>)}</select></label><p className="small muted">{intake.name} · {intake.email}<br />Self-reported details. Client requests are not approved commitments.</p><dl className="intake-answers">{intakeFields.map((field) => <div key={field}><dt>{intakeLabels[field]}</dt><dd>{intake.answers[field] || <span className="muted">Not provided</span>}</dd></div>)}</dl><p className="notice small">To include these answers in a brief, open a project meeting and choose this submission under “Intake context”. Source labels will distinguish intake answers from the recording.</p></section>
        <section className="card stack"><span className="eyebrow">03 / PREPARE THE CALL</span><h2>Go in with better questions.</h2><p className="muted small">Draft an agenda and questions from this submission. Review them before the call.</p><Button disabled={busy || prepRun?.status === "active" || !!prep} onClick={() => void action(async () => { await api(`projects/${id}/prepare`, "POST", { intakeId }); await load(); })}>{prepRun?.status === "active" ? "Preparing agenda…" : prep ? "Agenda ready" : prepRun?.status === "failed" ? "Retry agenda" : "Draft discovery agenda"}</Button>{prepRun?.error && <p className="notice error">{prepRun.error}</p>}
          {prep && <><ol className="prep-agenda">{prep.agenda.map((item, index) => <li key={index}><h3>{item.topic}</h3><p>{item.purpose}</p><span className="small muted">Intake: {item.fields.map((f) => intakeLabels[f]).join(" · ")}</span></li>)}</ol><h3>Questions to clarify</h3><ul className="prep-questions">{prep.questions.map((q, i) => <li key={i}>{q.question}<span className="small muted"> — {intakeLabels[q.field]}</span></li>)}</ul><Button variant="outline" onClick={() => void action(async () => { await navigator.clipboard.writeText([...prep.agenda.map((a, i) => `${i + 1}. ${a.topic}\n${a.purpose}`), "Questions", ...prep.questions.map((q) => `- ${q.question}`)].join("\n\n")); setNotice("Discovery agenda copied."); })}><Copy size={14} /> Copy agenda</Button></>}
        </section></div>}
    </div>
    <div hidden={tab !== "scope"} className="stack">
      <section className="card stack"><span className="eyebrow">01 / COMPARE WITH WHAT WAS APPROVED</span><h2>Spot a change before it becomes extra work.</h2><p className="muted">Compare a later meeting with an exact approved brief. Suggestions need your review. Fees and schedule impacts are left for your team to assess.</p>
        {!data.baselines.length ? <p className="notice">Share a saved brief and receive client approval first. That approved version becomes the comparison baseline.</p> : <><div className="grid2"><label className="label">Approved brief<select value={baselineId} onChange={(e) => { setBaselineId(e.target.value); setMeetingId(""); }}>{data.baselines.map((v) => <option value={v.id} key={v.id}>{data.meetings.find((m) => m.id === v.meeting_id)?.title} · {new Date(v.created_at).toLocaleString()} · {v.id.slice(0, 8)}</option>)}</select></label><label className="label">Meeting to compare<select value={meetingId} onChange={(e) => setMeetingId(e.target.value)}><option value="">Choose a meeting with a saved transcript</option>{data.meetings.filter((m) => m.transcript_revision > 0 && m.id !== baseline?.meeting_id).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label></div><div className="row"><Button disabled={busy || !meetingId || !baselineId} onClick={() => void action(startComparison)}><FileDiff size={15} /> Check for scope changes</Button><span className="small muted">Saved transcript only · repeated checks reuse the same result</span></div>{baseline && <details><summary>View selected approved scope</summary><p>{baseline.content.brief.overview}</p>{(["scope", "deliverables", "requirements"] as const).map((field) => <section key={field}><h3>{field}</h3><ul>{baseline.content.brief[field].map((item, i) => <li key={i}>{item.text}</li>)}</ul></section>)}<Link className="text-link" href={`/app/meetings/${baseline.meeting_id}?version=${baseline.id}`}>Open approved version ↗</Link></details>}</>}
      </section>
      {scopeRuns.length > 0 && <section className="stack"><div className="card stack"><label className="label">Comparison history<select value={currentRun?.id || ""} onChange={(e) => { if (canChangeComparison()) setRunId(e.target.value); }}>{scopeRuns.map((r) => <option key={r.id} value={r.id}>{data.meetings.find((m) => m.id === r.meeting_id)?.title || "Meeting"} · {new Date(r.created_at).toLocaleString()} · {r.status}</option>)}</select></label>{currentRun?.status === "active" && <p role="status">Comparing the saved transcript with the approved brief… You can leave this page while it runs.</p>}{currentRun?.error && <p className="notice error" role="alert">{currentRun.error}</p>}{["failed", "cancelled"].includes(currentRun?.status || "") && <Button variant="outline" disabled={busy} onClick={() => void action(async () => { const result = await api<{ runId: string }>(`projects/${id}/scope-check`, "POST", { baselineId: currentRun?.baseline_version_id, meetingId: currentRun?.meeting_id }); setRunId(result.runId); await load(); })}>Retry comparison using current transcript</Button>}{stale && <p className="notice">The transcript has changed since this comparison. Evidence below is a saved snapshot. Run a new comparison before acting on these suggestions.</p>}{currentRun?.status === "completed" && !changes.length && <p className="notice">No scope changes were identified. Review the meeting if you expected a change; AI can miss details.</p>}{confirmed.length > 0 && <div className="row between"><p className="small muted">{confirmed.length} confirmed by your agency · draft uses saved reviews · client approval still required</p><Button variant="outline" disabled={stale || busy} onClick={() => void action(async () => { await navigator.clipboard.writeText(changeRequestMarkdown(data.project.name, changes)); setNotice("Change-request draft copied. Review and send it manually."); })}><Copy size={14} /> Copy change-request draft</Button></div>}</div>
        {changes.map((change) => <ScopeReview key={`${change.id}:${change.revision}`} change={change} projectId={id} stale={Boolean(stale)} onSaved={load} onDirty={trackDirty} />)}
      </section>}
    </div>
  </div>;
}

function ScopeReview({ change, projectId, stale, onSaved, onDirty }: { change: ScopeChange; projectId: string; stale: boolean; onSaved: () => Promise<void>; onDirty: (id: string, dirty: boolean) => void }) {
  const [status, setStatus] = useState(change.status); const [note, setNote] = useState(change.review_note);
  const [budget, setBudget] = useState(change.budget_impact); const [timeline, setTimeline] = useState(change.timeline_impact);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const dirty = status !== change.status || note !== change.review_note || budget !== change.budget_impact || timeline !== change.timeline_impact;
  useEffect(() => { onDirty(change.id, dirty); return () => onDirty(change.id, false); }, [change.id, dirty, onDirty]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await api(`projects/${projectId}/changes/${change.id}`, "PATCH", { revision: change.revision, status, review_note: note, budget_impact: budget, timeline_impact: timeline }); onDirty(change.id, false); await onSaved(); }
    catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <article className="card stack scope-change"><div className="row between"><span className="eyebrow">{change.suggestion.category}</span><span className={`badge ${change.status}`}>{change.status.replaceAll("_", " ")}</span></div><h2>{change.suggestion.title}</h2><p>{change.suggestion.description}</p><p className="muted small">{change.suggestion.reason}</p>
    <div className="scope-evidence-grid"><section><h3>Approved brief</h3>{change.baseline_items.length ? change.baseline_items.map((item) => <blockquote key={item.id}>{item.text}</blockquote>) : <p className="muted small">No matching item identified in the approved scope. Check the baseline before confirming.</p>}<p className="small muted">Version {change.baseline_version_id.slice(0, 8)}</p></section><section><h3>Meeting evidence</h3>{change.source_segments.map((s) => <blockquote key={s.id}><Link className="timestamp" href={`/app/meetings/${change.meeting_id}?segment=${s.id}`}>{time(s.start_ms)} · {s.speaker} ↗</Link><p>{s.text}</p></blockquote>)}</section></div>
    <form className="stack" onSubmit={save}><label className="label">Agency review<select value={status} onChange={(e) => setStatus(e.target.value as ScopeChange["status"])}><option value="pending">Pending review</option><option value="confirmed">Confirm as a scope change</option><option value="needs_clarification">Needs clarification</option><option value="dismissed">Dismiss suggestion</option></select></label><div className="grid2"><label className="label">Budget impact <span className="small muted">Optional agency estimate</span><input className="input" value={budget} onChange={(e) => setBudget(e.target.value)} maxLength={1000} placeholder="Not assessed" /></label><label className="label">Timeline impact <span className="small muted">Optional agency estimate</span><input className="input" value={timeline} onChange={(e) => setTimeline(e.target.value)} maxLength={1000} placeholder="Not assessed" /></label></div><label className="label">Review notes<textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={5000} /></label>{error && <p className="notice error" role="alert">{error}</p>}<div className="row between"><span className="small muted">{dirty ? "Unsaved review changes" : "Review saved"} · Does not change the approved brief</span><Button disabled={busy || !dirty || stale}>{busy ? "Saving…" : "Save review"}</Button></div></form>
  </article>;
}
