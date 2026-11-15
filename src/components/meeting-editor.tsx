"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileCheck2,
  Play,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Status, type ReviewLink } from "./workspace";
import { api } from "@/lib/browser-api";
import { time } from "@/lib/utils";
import type { Meeting, Output, Segment, Version } from "@/lib/model";
type Detail = {
  meeting: Meeting;
  segments: Segment[];
  versions: Version[];
  links: ReviewLink[];
  recordingUrl: string | null;
  isAdmin: boolean;
};
type Tab = "brief" | "decisions" | "tasks" | "followUp";
type Evidence = { text: string; segmentIds: string[] };
export function MeetingEditor({ id }: { id: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [content, setContent] = useState<Output | null>(null);
  const [versionId, setVersionId] = useState("");
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<Tab>("brief");
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [transcriptDirty, setTranscriptDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [deleteKind, setDeleteKind] = useState<"recording" | "meeting" | null>(
    null,
  );
  const media = useRef<HTMLVideoElement>(null);
  const signedSource = useRef<{ url: string; at: number } | null>(null);
  const playbackPosition = useRef(0);
  const load = useCallback(
    async (reset = false) => {
      try {
        const result = await api<Detail>(`meetings/${id}`);
        if (result.recordingUrl) {
          if (
            signedSource.current &&
            Date.now() - signedSource.current.at < 240000
          )
            result.recordingUrl = signedSource.current.url;
          else
            signedSource.current = { url: result.recordingUrl, at: Date.now() };
        } else signedSource.current = null;
        setData(result);
        if (reset) {
          setSegments(result.segments);
          setRevision(result.meeting.transcript_revision);
        } else {
          setSegments((s) => (s.length ? s : result.segments));
          setRevision((r) => r || result.meeting.transcript_revision);
        }
        const preferred = new URLSearchParams(window.location.search).get(
          "version",
        );
        const v =
          result.versions.find((v) => v.id === preferred) || result.versions[0];
        if (reset) {
          setContent(v?.content ?? null);
          setVersionId(v?.id ?? "");
        } else if (v) {
          setContent((c) => c ?? v.content);
          setVersionId((x) => x || v.id);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [id],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    if (!dirty && !transcriptDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    const click = (e: MouseEvent) => {
      const anchor = (e.target as Element)?.closest("a");
      if (
        anchor?.getAttribute("href")?.startsWith("/") &&
        !anchor.hasAttribute("download") &&
        !window.confirm("Discard unsaved changes?")
      )
        e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, transcriptDirty]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(fn: (next: Output) => void) {
    if (!content) return;
    const next = structuredClone(content);
    fn(next);
    setContent(next);
    setDirty(true);
  }
  function seek(segmentId: string) {
    const s = segments.find((s) => s.id === segmentId);
    if (s && media.current) {
      media.current.currentTime = s.start_ms / 1000;
      void media.current.play().catch(() => {});
    }
  }
  function citations(ids: string[]) {
    return (
      <div className="citations">
        {ids.map((sid) => {
          const s = segments.find((s) => s.id === sid);
          return (
            <button
              className="timestamp"
              type="button"
              key={sid}
              disabled={!data?.recordingUrl}
              onClick={() => seek(sid)}
              aria-label={`Play source at ${time(s?.start_ms || 0)}`}
            >
              <Play size={10} style={{ display: "inline" }} />{" "}
              {time(s?.start_ms || 0)}
            </button>
          );
        })}
      </div>
    );
  }
  function evidence(
    items: Evidence[],
    update: (index: number, text: string) => void,
  ) {
    return items.length ? (
      items.map((item, i) => (
        <div className="evidence" key={i}>
          <textarea
            aria-label={`Item ${i + 1}`}
            className="textarea"
            style={{ minHeight: 65 }}
            value={item.text}
            onChange={(e) => update(i, e.target.value)}
          />
          {citations(item.segmentIds)}
        </div>
      ))
    ) : (
      <p className="muted small">
        Nothing explicitly stated in this recording.
      </p>
    );
  }
  if (!data)
    return (
      <div className="stack">
        <p className="muted loading">Loading meeting…</p>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
      </div>
    );
  const m = data.meeting;
  const processing = ["transcribing", "generating"].includes(m.status);
  const selected = data.versions.find((v) => v.id === versionId);
  const selectedLinks = data.links.filter((l) => l.version_id === versionId);
  const stale =
    selected && selected.transcript_revision !== m.transcript_revision;
  return (
    <div className="stack">
      <Link href="/app/meetings" className="row muted small">
        <ArrowLeft size={14} /> All meetings
      </Link>
      <div className="row between">
        <div>
          <h1>{m.title}</h1>
          <div className="row" style={{ marginTop: 10 }}>
            <Status value={m.status} />
            <span className="small muted">
              Added {new Date(m.created_at).toLocaleDateString()} ·{" "}
              {m.duration_seconds
                ? `${Math.ceil(m.duration_seconds / 60)} min`
                : "Upload incomplete"}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      {m.error && (
        <p className="notice error" role="alert">
          {m.error.includes("AI Gateway requires a valid credit card")
            ? "AI generation needs billing setup. Add a payment card in Vercel AI Gateway, then select Generate outputs again. Your saved transcript is ready; transcription will not be repeated."
            : m.error}
        </p>
      )}
      {processing && (
        <p className="notice" role="status">
          {m.status === "transcribing"
            ? "Transcribing your recording. You can leave this page and return later."
            : "Drafting outputs from the saved transcript. Existing versions remain available."}
        </p>
      )}
      {m.status === "uploading" && (
        <p className="notice">
          This recording has not started processing. Resume the upload on its
          original upload screen, or delete this meeting and upload again.
        </p>
      )}
      <div className="meeting-grid">
        <section className="card stack">
          <div className="row between">
            <h2>Recording & transcript</h2>
            {segments.length > 0 && (
              <a
                className="btn btn-ghost btn-sm"
                download
                href={`/api/meetings/${id}/export?format=transcript`}
              >
                <Download size={14} /> TXT
              </a>
            )}
          </div>
          {data.recordingUrl ? (
            <video
              className="player"
              onTimeUpdate={(e) => {
                playbackPosition.current = e.currentTarget.currentTime;
              }}
              onLoadedMetadata={(e) => {
                e.currentTarget.currentTime = playbackPosition.current;
              }}
              ref={media}
              controls
              preload="metadata"
              src={data.recordingUrl}
            />
          ) : (
            <p className="notice">
              {m.recording_deleted
                ? "Recording deleted. Saved work remains available."
                : "Recording unavailable until upload completes."}
            </p>
          )}
          {segments.length > 0 ? (
            <>
              <label className="label">
                Find in transcript
                <input
                  className="input"
                  placeholder="Search words or speakers…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <p className="small muted">
                Correct text or speaker names, then save before generating
                outputs.
              </p>
              <div className="transcript-list">
                {segments
                  .filter((s) =>
                    `${s.text} ${s.speaker}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((s) => (
                    <div className="segment" key={s.id}>
                      <div className="row between">
                        <input
                          aria-label="Speaker name"
                          className="speaker"
                          maxLength={150}
                          value={s.speaker}
                          disabled={processing}
                          onChange={(e) => {
                            setSegments((prev) =>
                              prev.map((x) =>
                                x.id === s.id
                                  ? { ...x, speaker: e.target.value }
                                  : x,
                              ),
                            );
                            setTranscriptDirty(true);
                          }}
                        />
                        <button
                          className="timestamp"
                          disabled={!data.recordingUrl}
                          onClick={() => seek(s.id)}
                        >
                          {time(s.start_ms)}
                        </button>
                      </div>
                      <textarea
                        aria-label={`Transcript at ${time(s.start_ms)}`}
                        className="textarea"
                        value={s.text}
                        disabled={processing}
                        onChange={(e) => {
                          setSegments((prev) =>
                            prev.map((x) =>
                              x.id === s.id
                                ? { ...x, text: e.target.value }
                                : x,
                            ),
                          );
                          setTranscriptDirty(true);
                        }}
                      />
                    </div>
                  ))}
              </div>
              <div className="saving-bar">
                <span className="small muted">
                  {transcriptDirty
                    ? "Unsaved transcript changes"
                    : "Transcript saved"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || processing || !transcriptDirty}
                  onClick={() =>
                    void action(async () => {
                      await api(`meetings/${id}/transcript`, "PATCH", {
                        revision,
                        segments: segments.map(({ id, speaker, text }) => ({
                          id,
                          speaker,
                          text,
                        })),
                      });
                      setTranscriptDirty(false);
                      await load(true);
                      setNotice(
                        "Transcript saved. Generate a new draft to use the corrections.",
                      );
                    })
                  }
                >
                  <Save size={14} /> Save transcript
                </Button>
              </div>
            </>
          ) : (
            <div className="empty">
              <p className="muted">
                Your transcript will appear here when processing finishes.
              </p>
            </div>
          )}
          {m.status === "failed" &&
            !segments.length &&
            !m.recording_deleted && (
              <Button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await api(`meetings/${id}/process`, "POST", {});
                    await load();
                  })
                }
              >
                Retry transcription
              </Button>
            )}
        </section>
        <section className="card">
          <div className="row between">
            <h2>Meeting outputs</h2>
            <Button
              size="sm"
              disabled={
                busy ||
                processing ||
                transcriptDirty ||
                dirty ||
                !segments.length
              }
              onClick={() =>
                void action(async () => {
                  await api(`meetings/${id}/generate`, "POST", {});
                  await load();
                })
              }
            >
              <RefreshCw size={13} />
              {content ? "Generate new draft" : "Generate outputs"}
            </Button>
          </div>
          {!content ? (
            <div className="empty">
              <FileCheck2 size={32} />
              <h2>A useful handoff, ready to draft</h2>
              <p className="muted">
                Review and save the transcript first. Then generate your brief,
                decisions, tasks, and follow-up.
              </p>
            </div>
          ) : (
            <>
              <label className="label" style={{ margin: "18px 0" }}>
                Saved version
                <select
                  value={versionId}
                  onChange={(e) => {
                    if (
                      dirty &&
                      !window.confirm("Discard unsaved output changes?")
                    )
                      return;
                    const v = data.versions.find(
                      (v) => v.id === e.target.value,
                    );
                    if (v) {
                      setVersionId(v.id);
                      setContent(v.content);
                      setDirty(false);
                      setShareUrl("");
                    }
                  }}
                >
                  {data.versions.map((v, i) => (
                    <option key={v.id} value={v.id}>
                      {i === 0 ? "Latest · " : ""}
                      {new Date(v.created_at).toLocaleString()} ·{" "}
                      {v.id.slice(0, 6)}
                    </option>
                  ))}
                </select>
              </label>
              {stale && (
                <p className="notice" style={{ marginBottom: 12 }}>
                  This version uses an earlier transcript. Generate a new draft
                  to incorporate corrections.
                </p>
              )}
              <div className="tabs" role="tablist" aria-label="Meeting outputs">
                {(["brief", "decisions", "tasks", "followUp"] as Tab[]).map(
                  (t) => (
                    <button
                      className={`btn btn-ghost btn-sm ${tab === t ? "active" : ""}`}
                      key={t}
                      role="tab"
                      id={`tab-${t}`}
                      aria-controls="output-panel"
                      aria-selected={tab === t}
                      onClick={() => setTab(t)}
                    >
                      {t === "followUp"
                        ? "Follow-up"
                        : t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ),
                )}
              </div>
              <div
                role="tabpanel"
                id="output-panel"
                aria-labelledby={`tab-${tab}`}
              >
                {tab === "brief" ? (
                  <>
                    <label className="label">
                      Overview
                      <textarea
                        className="textarea"
                        value={content.brief.overview}
                        onChange={(e) =>
                          edit((n) => {
                            n.brief.overview = e.target.value;
                          })
                        }
                      />
                    </label>
                    {(["scope", "deliverables", "requirements"] as const).map(
                      (k) => (
                        <section key={k}>
                          <h3 className="editor-label">
                            {k[0].toUpperCase() + k.slice(1)}
                          </h3>
                          {evidence(content.brief[k], (i, text) =>
                            edit((n) => {
                              n.brief[k][i].text = text;
                            }),
                          )}
                        </section>
                      ),
                    )}
                    <h3 className="editor-label">Open questions</h3>
                    {content.brief.openQuestions.length ? (
                      content.brief.openQuestions.map((q, i) => (
                        <textarea
                          key={i}
                          aria-label={`Open question ${i + 1}`}
                          className="textarea"
                          style={{ minHeight: 60, marginBottom: 8 }}
                          value={q}
                          onChange={(e) =>
                            edit((n) => {
                              n.brief.openQuestions[i] = e.target.value;
                            })
                          }
                        />
                      ))
                    ) : (
                      <p className="muted small">
                        No open questions extracted.
                      </p>
                    )}
                  </>
                ) : tab === "decisions" ? (
                  evidence(content.decisions, (i, text) =>
                    edit((n) => {
                      n.decisions[i].text = text;
                    }),
                  )
                ) : tab === "tasks" ? (
                  <>
                    {content.tasks.length ? (
                      content.tasks.map((t, i) => (
                        <div className="evidence" key={t.id}>
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={t.completed}
                              onChange={(e) =>
                                edit((n) => {
                                  n.tasks[i].completed = e.target.checked;
                                })
                              }
                            />
                            Completed
                          </label>
                          <label className="label" style={{ marginTop: 8 }}>
                            Task
                            <textarea
                              className="textarea"
                              style={{ minHeight: 65 }}
                              value={t.text}
                              onChange={(e) =>
                                edit((n) => {
                                  n.tasks[i].text = e.target.value;
                                })
                              }
                            />
                          </label>
                          <div className="task-fields">
                            <label className="label">
                              Owner
                              <input
                                className="input"
                                placeholder="Not specified"
                                value={t.owner ?? ""}
                                onChange={(e) =>
                                  edit((n) => {
                                    n.tasks[i].owner = e.target.value || null;
                                  })
                                }
                              />
                            </label>
                            <label className="label">
                              Deadline
                              <input
                                className="input"
                                type="date"
                                value={t.deadline ?? ""}
                                onChange={(e) =>
                                  edit((n) => {
                                    n.tasks[i].deadline =
                                      e.target.value || null;
                                  })
                                }
                              />
                            </label>
                          </div>
                          {citations(t.segmentIds)}
                        </div>
                      ))
                    ) : (
                      <p className="muted small">
                        No explicit action items found.
                      </p>
                    )}
                  </>
                ) : (
                  <label className="label">
                    Follow-up email draft
                    <textarea
                      className="textarea"
                      style={{ minHeight: 330 }}
                      value={content.followUp}
                      onChange={(e) =>
                        edit((n) => {
                          n.followUp = e.target.value;
                        })
                      }
                    />
                  </label>
                )}
              </div>
              <div className="saving-bar">
                <span className="small muted">
                  {dirty
                    ? "Unsaved changes · save as a new version"
                    : "All changes saved"}
                </span>
                <Button
                  size="sm"
                  disabled={
                    busy || !dirty || transcriptDirty || processing || !!stale
                  }
                  onClick={() =>
                    void action(async () => {
                      await api(`meetings/${id}/outputs`, "POST", {
                        revision: m.transcript_revision,
                        content,
                      });
                      setDirty(false);
                      await load(true);
                      setNotice(
                        "Saved as a new version. Earlier versions and approvals are unchanged.",
                      );
                    })
                  }
                >
                  <Save size={14} /> Save version
                </Button>
              </div>
              <div className="row" style={{ marginTop: 14 }}>
                <a
                  download
                  className="btn btn-outline btn-sm"
                  href={`/api/meetings/${id}/export?format=brief&version=${versionId}`}
                >
                  <Download size={13} /> Brief
                </a>
                <a
                  download
                  className="btn btn-outline btn-sm"
                  href={`/api/meetings/${id}/export?format=tasks&version=${versionId}`}
                >
                  <Download size={13} /> Tasks CSV
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void action(async () => {
                      await navigator.clipboard.writeText(content.followUp);
                      setNotice(
                        "Follow-up draft copied. Review it before sending.",
                      );
                    })
                  }
                >
                  <Copy size={13} /> Follow-up
                </Button>
              </div>
              <p className="small muted" style={{ marginTop: 7 }}>
                Downloads use the selected saved version.
              </p>
              <section
                style={{
                  marginTop: 28,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 20,
                }}
              >
                <div className="row between">
                  <h2>Client review</h2>
                  {data.isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || dirty || transcriptDirty}
                      onClick={() =>
                        void action(async () => {
                          const result = await api<{ url: string }>(
                            `meetings/${id}/share`,
                            "POST",
                            { versionId },
                          );
                          setShareUrl(result.url);
                          await load();
                        })
                      }
                    >
                      Create review link
                    </Button>
                  )}
                </div>
                <p className="small muted" style={{ marginTop: 8 }}>
                  Only this saved brief is shared. Links expire after 7 days.
                  Anyone holding the link can respond; reviewer identity is
                  self-reported.
                </p>
                {shareUrl && (
                  <div className="stack" style={{ marginTop: 14, gap: 8 }}>
                    <label className="label">
                      New review link
                      <input
                        className="input"
                        readOnly
                        value={shareUrl}
                        onFocus={(e) => e.target.select()}
                      />
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void action(async () => {
                          await navigator.clipboard.writeText(shareUrl);
                          setNotice("Review link copied.");
                        })
                      }
                    >
                      <Copy size={13} /> Copy link
                    </Button>
                  </div>
                )}
                {selectedLinks.map((l) => (
                  <div className="list-item" key={l.id}>
                    <div className="row between">
                      <Status
                        value={
                          l.revoked_at
                            ? "revoked"
                            : l.review_responses[0]?.decision ||
                              (Date.parse(l.expires_at) < Date.now()
                                ? "expired"
                                : "pending")
                        }
                      />
                      {data.isAdmin && !l.revoked_at && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            void action(async () => {
                              await api(`meetings/${id}/revoke`, "POST", {
                                linkId: l.id,
                              });
                              await load();
                            })
                          }
                        >
                          Revoke link
                        </Button>
                      )}
                    </div>
                    <p className="small muted">
                      Expires {new Date(l.expires_at).toLocaleString()}
                    </p>
                    {l.review_responses.map((r, i) => (
                      <p className="small" key={i}>
                        {r.name} · {r.comments || "Approved without comments"}
                      </p>
                    ))}
                  </div>
                ))}
              </section>
            </>
          )}
        </section>
      </div>
      {data.isAdmin && (
        <section className="card stack">
          <div>
            <h2>Recording and meeting controls</h2>
            <p className="muted small">
              Recordings remain until deleted. Deletion immediately disables
              access; background cleanup removes service artifacts.
            </p>
          </div>
          {m.cleanup_status !== "none" && (
            <p className="small">Cleanup: {m.cleanup_status}</p>
          )}
          <div className="row">
            {!m.recording_deleted && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setDeleteKind("recording")}
              >
                <Trash2 size={14} /> Delete recording only
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => setDeleteKind("meeting")}
            >
              <Trash2 size={14} /> Delete entire meeting
            </Button>
          </div>
          {deleteKind && (
            <div className="notice error stack">
              <p>
                {deleteKind === "meeting"
                  ? "Permanently remove the transcript, all output versions, client review links, and recording?"
                  : "Remove the recording and disable playback? The transcript and generated work will remain."}
              </p>
              <div className="row">
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      await api(
                        `meetings/${id}${deleteKind === "recording" ? "/recording" : ""}`,
                        "DELETE",
                      );
                      if (deleteKind === "meeting")
                        window.location.assign("/app/meetings");
                      else {
                        setDeleteKind(null);
                        await load();
                      }
                    })
                  }
                >
                  Confirm deletion
                </Button>
                <Button variant="outline" onClick={() => setDeleteKind(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
