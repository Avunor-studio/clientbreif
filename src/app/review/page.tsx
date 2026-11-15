"use client";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/browser-api";
import type { Output } from "@/lib/model";
type Review = {
  title: string;
  brief: Output["brief"];
  versionDate: string;
  expiresAt: string;
  response: { decision: string; comments: string; name: string } | null;
};
export default function ReviewPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t =
      new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    setToken(t);
    if (!t) {
      setError(
        "This review link is incomplete. Ask the agency for a new link.",
      );
      return;
    }
    api<Review>("review/read", "POST", { token: t })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  async function respond(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const response = await api<NonNullable<Review["response"]>>(
        "review/respond",
        "POST",
        { ...fields, token },
      );
      setData({ ...data, response });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="review-page">
      <Brand />
      {error && (
        <p className="notice error" role="alert" style={{ marginTop: 24 }}>
          {error}
        </p>
      )}
      {!data && !error && (
        <p className="muted loading" style={{ marginTop: 30 }}>
          Opening your brief…
        </p>
      )}
      {data && (
        <>
          <div style={{ marginTop: 35 }}>
            <span className="eyebrow">Client review</span>
            <h1 style={{ margin: "8px 0" }}>{data.title}</h1>
            <p className="muted small">
              Brief saved {new Date(data.versionDate).toLocaleString()} · Link
              expires {new Date(data.expiresAt).toLocaleDateString()}
            </p>
          </div>
          <article className="card stack">
            <h2>Project brief</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{data.brief.overview}</p>
            {(["scope", "deliverables", "requirements"] as const).map((k) => (
              <section key={k}>
                <h3>{k[0].toUpperCase() + k.slice(1)}</h3>
                {data.brief[k].length ? (
                  <ul>
                    {data.brief[k].map((x, i) => (
                      <li key={i}>{x.text}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small">Not specified.</p>
                )}
              </section>
            ))}
            <section>
              <h3>Open questions</h3>
              {data.brief.openQuestions.length ? (
                <ul>
                  {data.brief.openQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">None listed.</p>
              )}
            </section>
          </article>
          <section className="card stack">
            {data.response ? (
              <>
                <h2>
                  {data.response.decision === "approved"
                    ? "Brief approved"
                    : "Changes requested"}
                </h2>
                <p>Response recorded from {data.response.name}.</p>
                <p style={{ whiteSpace: "pre-wrap" }}>
                  {data.response.comments}
                </p>
                <p className="small muted">
                  This response applies to this brief version only. Contact the
                  agency if you need to change your response.
                </p>
              </>
            ) : (
              <>
                <h2>Does this reflect your conversation?</h2>
                <p className="muted small">
                  You are reviewing this saved brief only. Anyone holding this
                  link can respond; the name and email below are self-reported,
                  not verified identity or an electronic signature.
                </p>
                <form className="stack" onSubmit={(e) => void respond(e)}>
                  <div className="form-grid">
                    <label className="label">
                      Your name
                      <input
                        className="input"
                        name="name"
                        required
                        maxLength={150}
                      />
                    </label>
                    <label className="label">
                      Email
                      <input
                        className="input"
                        type="email"
                        name="email"
                        required
                        maxLength={254}
                      />
                    </label>
                  </div>
                  <label className="label">
                    Your response
                    <select name="decision" required>
                      <option value="approved">Approve this brief</option>
                      <option value="changes_requested">Request changes</option>
                    </select>
                  </label>
                  <label className="label">
                    Comments
                    <textarea
                      className="textarea"
                      name="comments"
                      maxLength={5000}
                      placeholder="Describe any changes needed. Required when requesting changes."
                    />
                  </label>
                  <Button disabled={busy}>
                    {busy ? "Saving response…" : "Submit response"}
                  </Button>
                </form>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
