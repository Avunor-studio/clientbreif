import Link from "next/link";
import { Brand } from "./brand";
export function AuthFrame({
  children,
  signingUp = false,
}: {
  children: React.ReactNode;
  signingUp?: boolean;
}) {
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link href="/" aria-label="ClientBrief home">
          <Brand />
        </Link>
        <h1>
          Good conversations.
          <br />
          <em>Clear next steps.</em>
        </h1>
        <p>
          {signingUp
            ? "Give your agency a home for client conversations, project briefs, and the work that follows."
            : "Your client conversations, project briefs, and next steps. Together in one workspace."}
        </p>
        <span className="auth-story-foot">
          THE AGENCY’S AFTER-MEETING WORKSPACE
        </span>
      </section>
      <section
        className="auth-form"
        aria-label={
          signingUp ? "Create your account" : "Sign in to your workspace"
        }
      >
        {children}
        <Link className="text-link" href="/">
          ← Back to ClientBrief
        </Link>
      </section>
    </main>
  );
}
