"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/browser-api";
import type { BillingStatus } from "@/lib/revenuecat";
import { Button } from "./ui/button";

export function WorkspaceBilling({ isAdmin }: { isAdmin: boolean }) {
  const [status, setStatus] = useState<BillingStatus | "loading">("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    api<{ status: BillingStatus }>("billing/status").then(
      result => { if (current) setStatus(result.status); },
      () => { if (current) setStatus("unavailable"); },
    );
    return () => { current = false; };
  }, [attempt]);

  async function openBilling() {
    setPending(true);
    setError("");
    try {
      const { url } = await api<{ url: string }>("billing/checkout", "POST");
      window.location.assign(url);
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }
  return <section className="stack">
    <h2>Workspace subscription</h2>
    <p role="status">{{
      loading: "Checking subscription…",
      active: "Your workspace can transcribe new recordings.",
      inactive: "Subscribe to transcribe new recordings for this workspace.",
      unavailable: "Billing is temporarily unavailable.",
    }[status]}</p>
    {isAdmin && (status === "active" || status === "inactive") &&
      <Button onClick={openBilling} disabled={pending}>{pending ? "Opening billing…" : status === "active" ? "Manage subscription" : "View plans"}</Button>}
    {!isAdmin && status === "inactive" && <p>A workspace admin can subscribe in Settings.</p>}
    {status === "unavailable" && <Button variant="outline" onClick={() => { setStatus("loading"); setAttempt(n => n + 1); }}>Retry billing check</Button>}
    {error && <p role="alert" className="notice error">{error}</p>}
    <p className="small muted">Billing support · <a href="mailto:avunorstudio@gmail.com">avunorstudio@gmail.com</a></p>
  </section>;
}
