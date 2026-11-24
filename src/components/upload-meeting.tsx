"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Upload as TusUpload } from "tus-js-client";
import { Upload, ArrowLeft, FileAudio, Pause } from "lucide-react";
import { Button } from "./ui/button";
import type { Bootstrap } from "./workspace";
import { api } from "@/lib/browser-api";
import { validateUpload, type Meeting } from "@/lib/model";
import { tusAuthorization } from "@/lib/upload-auth";
function duration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const media = document.createElement("video");
    const url = URL.createObjectURL(file);
    media.preload = "metadata";
    media.src = url;
    const finish = () => {
      URL.revokeObjectURL(url);
      media.removeAttribute("src");
    };
    media.onloadedmetadata = () => {
      const d = media.duration;
      finish();
      resolve(d);
    };
    media.onerror = () => {
      finish();
      reject(
        new Error(
          "This recording cannot be read by your browser. Convert it to a supported format.",
        ),
      );
    };
  });
}
export function UploadMeeting({ data }: { data: Bootstrap }) {
  const { getToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const tus = useRef<TusUpload | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = new FormData(form);
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      let m = meeting;
      if (!m) {
        setStage("Checking recording");
        const d = await duration(file);
        validateUpload(file.name, file.size, file.type, d);
        m = await api<Meeting>("meetings", "POST", {
          title: fields.get("title"),
          project_id: fields.get("project_id"),
          name: file.name,
          size: file.size,
          mime: file.type,
          duration: d,
          consent: fields.get("consent") === "on",
        });
        setMeeting(m);
      }
      if (!uploaded) {
        setStage("Uploading recording");
        await new Promise<void>((resolve, reject) => {
          const upload = new TusUpload(file, {
            endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(".supabase.co", ".storage.supabase.co")}/storage/v1/upload/resumable`,
            ...tusAuthorization(getToken),
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            chunkSize: 6 * 1024 * 1024,
            retryDelays: [0, 3000, 5000, 10000],
            metadata: {
              bucketName: "recordings",
              objectName: m!.recording_path!,
              contentType: file.type,
              cacheControl: "3600",
            },
            fingerprint: async () =>
              `clientbrief-${m!.id}-${file.size}-${file.lastModified}`,
            onError: reject,
            onProgress: (sent, total) =>
              setProgress(Math.round((sent / total) * 100)),
            onSuccess: () => resolve(),
          });
          tus.current = upload;
          upload
            .findPreviousUploads()
            .then((previous) => {
              if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
              upload.start();
            })
            .catch(reject);
        });
        setUploaded(true);
      }
      setStage("Starting transcription");
      await api(`meetings/${m.id}/process`, "POST", {});
      window.location.assign(`/app/meetings/${m.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      setStage(
        uploaded ? "Ready to start transcription" : "Upload paused or failed",
      );
    }
  }
  if (!data.projects.length)
    return (
      <section className="card empty">
        <FileAudio size={30} />
        <h1>First, give your meeting a home</h1>
        <p className="muted">
          Create a client and project before uploading a recording.
        </p>
        <Button asChild>
          <Link href="/app/projects">Create a project</Link>
        </Button>
      </section>
    );
  return (
    <div className="stack" style={{ maxWidth: 780, margin: "0 auto" }}>
      <Link href="/app" className="muted small row">
        <ArrowLeft size={15} /> Back to overview
      </Link>
      <div className="page-title">
        <h1>Upload a meeting</h1>
        <p className="muted">
          Choose a client project and bring its audio or video recording.
        </p>
      </div>
      <div className="notice">
        {data.allowance.remainingSeconds > 0
          ? `Available recording time: ${Math.floor(data.allowance.remainingSeconds / 60)} min ${data.allowance.remainingSeconds % 60} sec.`
          : "Your workspace has no recording time available."}{" "}
        <Link href="/app/settings">View workspace plan</Link>
      </div>
      <form className="card stack" onSubmit={(e) => void submit(e)}>
        <div className="form-grid">
          <label className="label">
            Meeting title
            <input
              className="input"
              name="title"
              placeholder="e.g. Website discovery call"
              required
              maxLength={200}
              disabled={!!meeting}
            />
          </label>
          <label className="label">
            Client project
            <select name="project_id" required disabled={!!meeting}>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {data.clients.find((c) => c.id === p.client_id)?.name} /{" "}
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="dropzone">
          <Upload size={30} />
          <h2>Choose your meeting recording</h2>
          <p className="muted small" style={{ marginTop: 7 }}>
            MP3, WAV, M4A, MP4 or WebM · Up to 250 MB / 60 minutes
          </p>
          <label className="label" style={{ alignItems: "center" }}>
            <span className="sr-only">Recording file</span>
            <input
              type="file"
              accept=".mp3,.wav,.m4a,.mp4,.webm"
              required={!meeting}
              disabled={busy || !!meeting}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError("");
              }}
            />
          </label>
          {file && (
            <p className="small" style={{ marginTop: 10 }}>
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          )}
        </div>
        <p className="notice">
          English recordings only for this pilot. Video processing uses spoken
          audio, not visual content.
        </p>
        <label className="check">
          <input
            type="checkbox"
            name="consent"
            required
            disabled={!!meeting}
            defaultChecked={!!meeting}
          />
          I have permission to upload and process this recording, including
          consent from meeting participants where required.
        </label>
        <p className="muted small">
          Recordings stay private to your agency and remain until you delete
          them.
        </p>
        {(busy || meeting) && (
          <div aria-live="polite">
            <div className="row between small">
              <span>{stage}</span>
              <span>{progress}%</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Recording upload"
            >
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        {error && (
          <div role="alert" className="notice error">
            {error}
          </div>
        )}
        <div className="row">
          <Button disabled={busy || !file || (!meeting && data.allowance.remainingSeconds === 0)}>
            <Upload size={16} />
            {busy
              ? "Working…"
              : meeting
                ? "Resume / retry"
                : "Upload and transcribe"}
          </Button>
          {busy && stage === "Uploading recording" && (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await tus.current?.abort();
                setBusy(false);
                setStage("Upload paused");
              }}
            >
              {" "}
              <Pause size={14} /> Pause
            </Button>
          )}
          {meeting && (
            <Button asChild variant="ghost">
              <Link href={`/app/meetings/${meeting.id}`}>Open meeting</Link>
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
