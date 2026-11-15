"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  OrganizationSwitcher,
  OrganizationProfile,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import {
  AudioLines,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  Plus,
  Settings2,
  Upload,
} from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { api } from "@/lib/browser-api";
import type { Meeting } from "@/lib/model";
import { UploadMeeting } from "./upload-meeting";
import { MeetingEditor } from "./meeting-editor";

export type Client = { id: string; name: string; contact_email: string };
export type Project = {
  id: string;
  name: string;
  description: string;
  client_id: string;
};
type Response = {
  decision: string;
  created_at: string;
  name?: string;
  comments?: string;
};
export type ReviewLink = {
  id: string;
  version_id: string;
  expires_at: string;
  revoked_at: string | null;
  review_responses: Response[];
};
export type Bootstrap = {
  clients: Client[];
  projects: Project[];
  meetings: Meeting[];
  links: ReviewLink[];
  versions: { id: string; meeting_id: string; created_at: string }[];
  runs: {
    id: string;
    meeting_id: string;
    kind: string;
    status: string;
    created_at: string;
  }[];
  cleanup: {
    id: string;
    title: string;
    cleanup_status: string;
    cleanup_error: string;
    deleted_at: string | null;
  }[];
  isAdmin: boolean;
  missing: string[];
  orgId: string;
};
export function Status({ value }: { value: string }) {
  return <span className={`badge ${value}`}>{value.replaceAll("_", " ")}</span>;
}
export function Workspace({ path }: { path: string[] }) {
  const { orgId } = useAuth();
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const result = await api<Bootstrap>("bootstrap");
      setData(result);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    setData(null);
    void refresh();
  }, [orgId, refresh]);
  useEffect(() => {
    if (
      !data?.runs.some((r) => r.status === "active") &&
      !data?.cleanup.some((m) => m.cleanup_status === "pending")
    )
      return;
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [data, refresh]);
  const section = path[0] || "dashboard";
  const nav = [
    ["dashboard", "Overview", LayoutDashboard],
    ["projects", "Clients & projects", BriefcaseBusiness],
    ["meetings", "All meetings", AudioLines],
    ["approvals", "Client approvals", FileCheck2],
    ["settings", "Settings", Settings2],
  ] as const;
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/app">
          <Brand />
        </Link>
        <div>
          <div className="workspace-label">WORKSPACE</div>
          <nav aria-label="Workspace navigation">
            {nav.map(([key, label, Icon]) => (
              <Link
                key={key}
                href={key === "dashboard" ? "/app" : `/app/${key}`}
                className={section === key ? "active" : ""}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="card" style={{ padding: 14, background: "#f8faff" }}>
            <div className="row">
              <CircleCheck size={16} color="#315de8" />
              <strong className="small">Make every call count</strong>
            </div>
            <p className="small muted" style={{ marginTop: 7 }}>
              A clear brief is the start of a better project.
            </p>
          </div>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <span className="muted small">
            Workspace{" "}
            <ChevronRight
              size={12}
              style={{ display: "inline", verticalAlign: "middle" }}
            />{" "}
            {nav.find((n) => n[0] === section)?.[1] || "Meeting"}
          </span>
          <div className="row">
            <OrganizationSwitcher
              hidePersonal
              afterSelectOrganizationUrl="/app"
              afterCreateOrganizationUrl="/app"
            />
            <UserButton />
          </div>
        </header>
        <main className="main">
          {error && (
            <div className="notice error row between" role="alert">
              {error}
              <Button variant="outline" onClick={() => void refresh()}>
                Retry
              </Button>
            </div>
          )}
          {!data && !error ? (
            <p className="muted loading" role="status">
              Loading your agency…
            </p>
          ) : data && data.orgId === orgId ? (
            <>
              {data.missing.length > 0 && (
                <div className="notice" style={{ marginBottom: 20 }}>
                  AI processing needs configuration: {data.missing.join(", ")}.
                  Client and project setup is available.
                </div>
              )}
              {section === "dashboard" ? (
                <Dashboard data={data} />
              ) : section === "projects" ? (
                <Projects data={data} refresh={refresh} />
              ) : section === "new" ? (
                <UploadMeeting data={data} />
              ) : section === "meetings" && path[1] ? (
                <MeetingEditor key={path[1]} id={path[1]} />
              ) : section === "meetings" ? (
                <>
                  <PageTitle
                    title="All meetings"
                    subtitle="Your conversations, organized and ready for the next step."
                  />
                  <Meetings data={data} />
                </>
              ) : section === "approvals" ? (
                <Approvals data={data} />
              ) : section === "settings" ? (
                <Settings data={data} refresh={refresh} />
              ) : (
                <p>Page not found.</p>
              )}
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page-title row between">
      <div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      <Button asChild>
        <Link href="/app/new">
          <Plus size={16} /> Upload meeting
        </Link>
      </Button>
    </div>
  );
}
function latestVersions(data: Bootstrap) {
  const result = new Map<string, string>();
  data.versions.forEach((v) => {
    if (!result.has(v.meeting_id)) result.set(v.meeting_id, v.id);
  });
  return result;
}
function Dashboard({ data }: { data: Bootstrap }) {
  const latest = latestVersions(data);
  const versions = new Set(latest.values());
  const pending = data.links.filter(
    (l) =>
      versions.has(l.version_id) &&
      !l.revoked_at &&
      Date.parse(l.expires_at) > Date.now() &&
      !l.review_responses.length,
  ).length;
  return (
    <>
      <PageTitle
        title="A little clarity, after every call."
        subtitle="Keep your client conversations moving toward clear outcomes."
      />
      <div className="stats">
        {[
          [String(data.meetings.length), "Meetings captured", AudioLines],
          [String(data.projects.length), "Client projects", BriefcaseBusiness],
          [String(pending), "Awaiting client review", Clock3],
        ].map(([n, label, Icon]) => {
          const I = Icon as typeof AudioLines;
          return (
            <div className="card stat" key={String(label)}>
              <div>
                <span className="muted small">{String(label)}</span>
                <strong>{String(n)}</strong>
              </div>
              <span className="icon-box">
                <I size={21} />
              </span>
            </div>
          );
        })}
      </div>
      <div className="section-title row between">
        <h2>Recent meetings</h2>
        <Link className="muted small row" href="/app/meetings">
          View all <ArrowUpRight size={14} />
        </Link>
      </div>
      <Meetings data={data} limit={6} />
      <div className="grid-two" style={{ marginTop: 22 }}>
        <div className="card">
          <span className="eyebrow">Your workflow</span>
          <h2 style={{ marginTop: 7 }}>From call to client alignment</h2>
          <p className="muted small" style={{ marginTop: 9 }}>
            Upload → correct transcript → draft outputs → review → client
            approval
          </p>
        </div>
        <div className="card">
          <span className="eyebrow">Private by default</span>
          <h2 style={{ marginTop: 7 }}>Share the brief. Keep the context.</h2>
          <p className="muted small" style={{ marginTop: 9 }}>
            Clients see only the brief version you share. Your recording and
            internal notes stay in your agency.
          </p>
        </div>
      </div>
    </>
  );
}
function Meetings({ data, limit }: { data: Bootstrap; limit?: number }) {
  const rows = limit ? data.meetings.slice(0, limit) : data.meetings;
  return (
    <div className="card table-card">
      {!rows.length ? (
        <div className="empty">
          <AudioLines size={32} />
          <h2>Your next meeting starts here</h2>
          <p className="muted">
            Create a client project, then upload a recording to turn the
            conversation into a clear handoff.
          </p>
          <Button asChild variant="outline">
            <Link href={data.projects.length ? "/app/new" : "/app/projects"}>
              {data.projects.length
                ? "Upload a meeting"
                : "Create your first project"}{" "}
              <ArrowUpRight size={14} />
            </Link>
          </Button>
        </div>
      ) : (
        <table className="meeting-table">
          <thead>
            <tr>
              <th>Meeting</th>
              <th>Project</th>
              <th>Status</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="meeting-row">
                <td>
                  <Link
                    className="meeting-title"
                    href={`/app/meetings/${m.id}`}
                  >
                    {m.title}
                  </Link>
                  <div className="small muted">
                    {m.duration_seconds
                      ? `${Math.ceil(m.duration_seconds / 60)} min recording`
                      : "Recording upload"}
                  </div>
                </td>
                <td className="muted small">
                  {data.projects.find((p) => p.id === m.project_id)?.name}
                </td>
                <td>
                  <Status value={m.status} />
                </td>
                <td className="muted small">
                  {new Date(m.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
function Projects({
  data,
  refresh,
}: {
  data: Bootstrap;
  refresh: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  async function save(
    event: React.FormEvent<HTMLFormElement>,
    resource: string,
    id?: string,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    try {
      await api(
        `${resource}${id ? `/${id}` : ""}`,
        id ? "PATCH" : "POST",
        fields,
      );
      form.reset();
      setEditClient(null);
      setEditProject(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <div className="page-title">
        <h1>Clients & projects</h1>
        <p className="muted">Give every conversation a home.</p>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      <div className="grid-two">
        <section className="card stack">
          <h2>{editClient ? "Edit client" : "Add a client"}</h2>
          <form
            className="stack"
            key={editClient?.id || "new-client"}
            onSubmit={(e) => void save(e, "clients", editClient?.id)}
          >
            <label className="label">
              Client name
              <input
                className="input"
                name="name"
                required
                maxLength={150}
                defaultValue={editClient?.name}
                placeholder="e.g. Northstar Studio"
              />
            </label>
            <label className="label">
              Contact email <span className="muted">Optional</span>
              <input
                className="input"
                name="contact_email"
                type="email"
                defaultValue={editClient?.contact_email}
              />
            </label>
            <div className="row">
              <Button disabled={busy}>
                <Plus size={15} />
                {editClient ? "Save client" : "Add client"}
              </Button>
              {editClient && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditClient(null)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </section>
        <section className="card stack">
          <h2>{editProject ? "Edit project" : "Create a project"}</h2>
          {data.clients.length ? (
            <form
              className="stack"
              key={editProject?.id || "new-project"}
              onSubmit={(e) => void save(e, "projects", editProject?.id)}
            >
              <label className="label">
                Client
                <select
                  name="client_id"
                  required
                  defaultValue={editProject?.client_id}
                >
                  {data.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label">
                Project name
                <input
                  className="input"
                  name="name"
                  required
                  maxLength={150}
                  defaultValue={editProject?.name}
                  placeholder="e.g. Website refresh"
                />
              </label>
              <label className="label">
                Description
                <textarea
                  className="textarea"
                  name="description"
                  maxLength={5000}
                  defaultValue={editProject?.description}
                />
              </label>
              <div className="row">
                <Button disabled={busy}>
                  {editProject ? "Save project" : "Create project"}
                </Button>
                {editProject && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditProject(null)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <p className="muted">Add a client first to create their project.</p>
          )}
        </section>
      </div>
      <section className="card">
        <h2>Your clients</h2>
        {!data.clients.length && (
          <p className="muted" style={{ marginTop: 12 }}>
            No clients yet.
          </p>
        )}
        {data.clients.map((c) => (
          <div className="list-item" key={c.id}>
            <div className="row between">
              <div className="row">
                <Building2 size={18} color="#6c83ad" />
                <strong>{c.name}</strong>
                <span className="small muted">{c.contact_email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditClient(c)}
              >
                Edit client
              </Button>
            </div>
            {data.projects
              .filter((p) => p.client_id === c.id)
              .map((p) => (
                <div
                  className="row between"
                  key={p.id}
                  style={{ margin: "10px 0 0 30px" }}
                >
                  <div>
                    <h3>{p.name}</h3>
                    <p className="small muted">
                      {p.description || "No description"} ·{" "}
                      {
                        data.meetings.filter((m) => m.project_id === p.id)
                          .length
                      }{" "}
                      meetings
                    </p>
                    <div
                      className="stack small"
                      style={{ gap: 6, marginTop: 8 }}
                    >
                      {data.meetings
                        .filter((m) => m.project_id === p.id)
                        .map((m) => (
                          <Link
                            key={m.id}
                            className="row meeting-title"
                            href={`/app/meetings/${m.id}`}
                          >
                            <AudioLines size={13} />
                            {m.title}
                            <Status value={m.status} />
                          </Link>
                        ))}
                    </div>
                    <div className="small">
                      {data.versions
                        .filter(
                          (v) =>
                            data.meetings.some(
                              (m) =>
                                m.id === v.meeting_id && m.project_id === p.id,
                            ) &&
                            data.links.some(
                              (l) =>
                                l.version_id === v.id &&
                                l.review_responses.some(
                                  (r) => r.decision === "approved",
                                ),
                            ),
                        )
                        .map((v) => (
                          <Link
                            style={{ marginRight: 12, color: "#315de8" }}
                            key={v.id}
                            href={`/app/meetings/${v.meeting_id}?version=${v.id}`}
                          >
                            Approved brief ↗
                          </Link>
                        ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditProject(p)}
                  >
                    Edit project
                  </Button>
                </div>
              ))}
          </div>
        ))}
      </section>
    </div>
  );
}
function Approvals({ data }: { data: Bootstrap }) {
  return (
    <div className="stack">
      <div className="page-title">
        <h1>Client approvals</h1>
        <p className="muted">
          Each approval belongs to the exact brief version shared.
        </p>
      </div>
      <div className="card">
        {!data.links.length ? (
          <div className="empty">
            <FileCheck2 size={30} />
            <h2>Ready when your brief is</h2>
            <p className="muted">
              Save a reviewed brief, then create an approval link from its
              meeting workspace.
            </p>
          </div>
        ) : (
          data.links.map((l) => {
            const v = data.versions.find((v) => v.id === l.version_id);
            const m = data.meetings.find((m) => m.id === v?.meeting_id);
            if (!m) return null;
            return (
              <div className="list-item row between" key={l.id}>
                <div>
                  <Link
                    className="meeting-title"
                    href={`/app/meetings/${m.id}?version=${l.version_id}`}
                  >
                    {m.title}
                  </Link>
                  <p className="muted small">
                    Version {l.version_id.slice(0, 8)} · Expires{" "}
                    {new Date(l.expires_at).toLocaleDateString()}
                  </p>
                </div>
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
function Settings({
  data,
  refresh,
}: {
  data: Bootstrap;
  refresh: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  return (
    <div className="stack">
      <div className="page-title">
        <h1>Workspace settings</h1>
        <p className="muted">Your agency, your people, your data.</p>
      </div>
      <div className="card">
        <h2>Pilot usage</h2>
        <p className="muted" style={{ marginTop: 10 }}>
          {data.meetings.length} meetings ·{" "}
          {Math.ceil(
            data.meetings.reduce((n, m) => n + (m.duration_seconds || 0), 0) /
              60,
          )}{" "}
          recording minutes ·{" "}
          {data.runs.filter((r) => r.status === "active").length} of 2
          processing slots active
        </p>
        <p className="small muted" style={{ marginTop: 8 }}>
          Recordings remain until explicitly deleted. Deleting a recording keeps
          generated work. Full meeting deletion removes its transcript, outputs,
          and review links.
        </p>
      </div>
      {data.cleanup.length > 0 && (
        <section className="card stack">
          <h2>Recording cleanup</h2>
          {error && <p className="notice error">{error}</p>}
          {data.cleanup.map((m) => (
            <div className="row between" key={m.id}>
              <div>
                {m.title}
                <Status value={m.cleanup_status} />
                <p className="small muted">{m.cleanup_error}</p>
              </div>
              {data.isAdmin && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await api(`meetings/${m.id}/cleanup`, "POST", {});
                      await refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Retry cleanup
                </Button>
              )}
            </div>
          ))}
        </section>
      )}
      <section className="card" style={{ overflow: "auto" }}>
        <h2 style={{ marginBottom: 18 }}>Agency members</h2>
        <OrganizationProfile routing="hash" />
      </section>
    </div>
  );
}
