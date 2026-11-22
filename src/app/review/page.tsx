"use client";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/browser-api";
type Review = {
  title: string;
  brief: {
    overview: string;
    scope: { text: string }[];
    deliverables: { text: string }[];
    requirements: { text: string }[];
    openQuestions: string[];
  };
  versionDate: string;
  expiresAt: string;
  response: { decision: string; comments: string; name: string } | null;
};
export default function ReviewPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState("approved");
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
      <header className="review-header">
        <Brand />
        <span>CLIENT REVIEW</span>
      </header>
      {error && !data && (
        <section className="card stack review-error" role="alert">
          <span className="eyebrow">CLIENT REVIEW</span>
          <h1>This brief isn’t available.</h1>
          <p>{error}</p>
          <p className="muted small">
            The agency can send a fresh link if this one has expired or been
            revoked.
          </p>
          {token && !data && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  setData(await api<Review>("review/read", "POST", { token }));
                } catch (error) {
                  setError((error as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Try opening again
            </Button>
          )}
        </section>
      )}
      {error && data && (
        <p className="notice error" role="alert">
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
          <div className="review-title">
            <span className="eyebrow">A SHARED PROJECT BRIEF</span>
            <h1>{data.title}</h1>
            <p className="muted small">
              Brief saved {new Date(data.versionDate).toLocaleString()} · Link
              expires {new Date(data.expiresAt).toLocaleDateString()}
            </p>
          </div>
          <article className="card stack review-document">
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
          <section className="card stack review-response">
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
                        autoComplete="name"
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
                        autoComplete="email"
                        required
                        maxLength={254}
                      />
                    </label>
                  </div>
                  <label className="label">
                    Your response
                    <select
                      name="decision"
                      required
                      value={decision}
                      onChange={(event) => setDecision(event.target.value)}
                    >
                      <option value="approved">Approve this brief</option>
                      <option value="changes_requested">Request changes</option>
                    </select>
                  </label>
                  <label className="label">
                    Comments
                    <textarea
                      className="textarea"
                      name="comments"
                      required={decision === "changes_requested"}
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
      <footer className="review-footer">
        Only this saved brief is shared with you. Your response belongs to this
        version.
      </footer>
    </main>
  );
}
