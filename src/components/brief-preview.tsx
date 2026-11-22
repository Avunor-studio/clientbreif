import { ArrowRight, Check, FileText, Link2 } from "lucide-react";

export function BriefPreview({ compact = false }: { compact?: boolean }) {
  return (
    <article
      className={`sample-document ${compact ? "compact-document" : ""}`}
      aria-label="Example project brief"
    >
      <div className="document-meta">
        <span>
          <FileText size={13} /> SAMPLE PROJECT BRIEF
        </span>
        <span className="document-status">
          <Check size={12} /> Saved draft
        </span>
      </div>
      <h3>North Star Website</h3>
      <p className="document-client">Website discovery · Sample meeting</p>
      <div className="document-rule" />
      <span className="document-label">PROJECT OVERVIEW</span>
      <p>Discovery call for a five-page website with a contact form.</p>
      <span className="document-label">AGREED SCOPE</span>
      <ul>
        <li>Build five website pages.</li>
        <li>Include a contact form.</li>
      </ul>
      <span className="source-note">
        <Link2 size={12} /> Discovery call transcript
      </span>
      {!compact && (
        <>
          <span className="document-label">STILL TO CONFIRM</span>
          <p>Who will supply the photos, and when is delivery?</p>
        </>
      )}
      <div className="document-foot">
        <span>Version 1</span>
        <span>
          Ready for client review <ArrowRight size={13} />
        </span>
      </div>
    </article>
  );
}
