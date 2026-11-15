import { Brand } from "./brand";
export function Setup({ missing }: { missing: string[] }) {
  return (
    <main className="setup card stack">
      <Brand />
      <h1>Connect your workspace</h1>
      <p>
        The application is installed. Configure the services below in{" "}
        <code>.env.local</code> to begin using real client recordings.
      </p>
      <div className="notice">
        No sample results will be substituted for live processing.
      </div>
      <ul>
        {missing.map((k) => (
          <li key={k}>
            <code>{k}</code>
          </li>
        ))}
      </ul>
      <p className="muted">
        Follow the README for Clerk Organizations, the Supabase migration,
        third-party auth, and provider setup. Restart the development server
        after changing environment variables.
      </p>
      <a className="btn btn-outline" href="/">
        Back to ClientBrief
      </a>
    </main>
  );
}
