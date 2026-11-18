import { ArrowRight, Check, FileText, Link2 } from "lucide-react";

export function BriefPreview({ compact = false }: { compact?: boolean }) {
  return (
    <article
      className={`sample-document ${compact ? "compact-document" : ""}`}
      aria-label="Example project brief"
    >
      <div className="document-meta">
        <span>
          <FileText size={13} /> PROJECT BRIEF / 001
        </span>
        <span className="document-status">
          <Check size={12} /> Reviewed draft
        </span>
      </div>
      <h3>
        A clearer website.
        <br />A simpler enquiry.
      </h3>
      <p className="document-client">
        Fieldwork Studio × Northstar · Example project
      </p>
      <div className="document-rule" />
      <span className="document-label">THE OBJECTIVE</span>
      <p>
        Help visitors understand the services and get in touch without a long
        enquiry form.
      </p>
      <span className="document-label">AGREED SCOPE</span>
      <ul>
        <li>Refresh five core website pages.</li>
        <li>Replace the current enquiry form with four fields.</li>
      </ul>
      <span className="source-note">
        <Link2 size={12} /> Source: discovery call, 04:32
      </span>
      {!compact && (
        <>
          <span className="document-label">STILL TO CONFIRM</span>
          <p>Who will supply the final photography?</p>
        </>
      )}
      <div className="document-foot">
        <span>Saved version 01</span>
        <span>
          Ready for client review <ArrowRight size={13} />
        </span>
      </div>
    </article>
  );
}
