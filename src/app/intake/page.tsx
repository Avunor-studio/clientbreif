"use client";
import { useCallback, useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/browser-api";
import { intakeFields, intakeLabels, type IntakeAnswers } from "@/lib/intake-model";

type Invite = { projectName: string; expiresAt: string; submitted: boolean };
const hints: Record<keyof IntakeAnswers, string> = {
  goals: "What should this project achieve? How will you know it worked?",
  audience: "Who is this for, and what do they need?",
  deliverables: "What would you like the agency to create or deliver?",
  budget: "An approved budget or a range, including the currency. Leave blank if undecided.",
  timeline: "Key dates, launch targets, or dependencies. Leave blank if undecided.",
  references: "Paste links to your brand guide, existing assets, or examples. Only share links you have permission to share; files are not uploaded here.",
  decisionMaker: "Who will review the work and make the final decision?",
};
export default function IntakePage() {
  const [token, setToken] = useState("");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const load = useCallback(async (value: string) => {
    setError("");
    if (!/^[a-f0-9]{64}$/.test(value)) { setError("This link is incomplete. Ask the agency for a new intake link."); return; }
    setBusy(true);
    try { setInvite(await api<Invite>("intake/read", "POST", { token: value })); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { const value = new URLSearchParams(window.location.hash.slice(1)).get("token") || ""; setToken(value); void load(value); }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!invite) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      await api("intake/submit", "POST", { token, name: form.get("name"), email: form.get("email"), consent: form.get("consent") === "on", answers: Object.fromEntries(intakeFields.map((key) => [key, form.get(key) || ""])) });
      setInvite({ ...invite, submitted: true }); setDirty(false);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <main className="review-page intake-page">
    <header className="review-header"><Brand /><span>PROJECT INTAKE</span></header>
    {error && <div className="notice error" role="alert"><p>{error}</p>{!invite && token && <Button variant="outline" disabled={busy} onClick={() => void load(token)}>Try again</Button>}</div>}
    {!invite && !error && <p role="status">Opening your intake form…</p>}
    {invite && <>
      <div className="review-title"><span className="eyebrow">BEFORE THE FIRST CONVERSATION</span><h1>{invite.projectName}</h1><p className="muted">A little context helps your agency ask better questions.</p></div>
      {invite.submitted ? <section className="card stack" role="status"><h2>Your answers are with the agency.</h2><p>Thank you. They can use your answers to prepare for your discovery call. These are requests for discussion, not an approved project scope.</p><p className="muted small">To correct an answer, contact the agency for a new form. This link accepts one submission.</p></section>
      : <form className="card stack intake-form" onSubmit={submit} onChange={() => setDirty(true)}>
        <div className="section-heading"><span className="eyebrow">01 / YOUR DETAILS</span><h2>Who’s joining the conversation?</h2></div>
        <div className="grid2"><label className="label">Your name<input className="input" name="name" autoComplete="name" required maxLength={150} /></label><label className="label">Email<input className="input" name="email" type="email" autoComplete="email" required maxLength={254} /></label></div>
        <div className="section-heading"><span className="eyebrow">02 / THE PROJECT</span><h2>Tell us what you have in mind.</h2><p className="small muted">Goals and deliverables are required. Everything else can stay undecided.</p></div>
        {intakeFields.map((key) => <label className="label" key={key} htmlFor={`intake-${key}`}>{intakeLabels[key]}{!["goals", "deliverables"].includes(key) && <span className="muted small">Optional</span>}<span className="small muted" id={`hint-${key}`}>{hints[key]}</span><textarea id={`intake-${key}`} className="textarea" aria-describedby={`hint-${key}`} name={key} maxLength={4000} required={["goals", "deliverables"].includes(key)} rows={key === "goals" || key === "deliverables" ? 4 : 3} /></label>)}
        <label className="row intake-consent"><input type="checkbox" name="consent" required /><span className="small">I agree to share these answers with the agency. They may use configured AI services to prepare a call agenda and draft a brief. I have permission to share this information.</span></label>
        <p className="small muted">Your name and email are self-reported. This is not a signature or approval. Answers remain in the agency’s project workspace. Link expires {new Date(invite.expiresAt).toLocaleDateString()}.</p>
        <div className="row between"><span className="small muted">{dirty ? "Answers not yet submitted" : "One submission per link"}</span><Button disabled={busy}>{busy ? "Submitting…" : "Send answers to agency"}</Button></div>
      </form>}
    </>}
  </main>;
}
