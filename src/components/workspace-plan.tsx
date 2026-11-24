import type { ReactNode } from "react";
import { ArrowUpRight, Check } from "lucide-react";

const features = [
  "Transcribe client meeting recordings",
  "Generate editable briefs, decisions, and action items",
  "Share versioned briefs for client approval",
  "Export transcripts, briefs, and tasks",
];

export function CheckoutComingSoon() {
  return (
    <>
      <p className="muted">Online checkout is coming soon.</p>
      <a className="btn btn-primary" href="mailto:avunorstudio@gmail.com?subject=ClientBrief%20workspace%20plan">
        Contact Avunor Studio <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    </>
  );
}

export function WorkspacePlan({ children, className }: { children: ReactNode; className: string }) {
  return (
    <section className={className} aria-labelledby="workspace-plan">
      <h2 id="workspace-plan">Agency workspace subscription</h2>
      <p className="workspace-plan-rate"><strong>US$29</strong> per workspace per month</p>
      <ul className="workspace-plan-features">
        {features.map((feature) => (
          <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>
        ))}
      </ul>
      <div className="workspace-plan-actions">{children}</div>
    </section>
  );
}
