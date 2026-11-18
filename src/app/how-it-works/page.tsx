import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Download,
  FileText,
  ShieldCheck,
} from "lucide-react";
import {
  BriefPreview,
  MarketingLayout,
  WorkspaceCta,
} from "@/components/marketing";
import { publicMetadata } from "@/lib/seo";

const title =
  "How ClientBrief works — From meeting recording to client approval";
const description =
  "Explore ClientBrief’s recording-to-brief workflow: upload, correct transcripts, generate editable outputs, save versions, and share a brief for client review.";
export const metadata = publicMetadata(title, description, "/how-it-works");
const steps = [
  {
    title: "Give the conversation a home.",
    text: "Create your agency workspace, add a client and project, then upload the recording. Your team’s meetings and outputs stay organized under the right project.",
    detail: "MP3 · WAV · M4A · MP4 · WebM / Up to 250 MB and 60 minutes",
  },
  {
    title: "Read what was actually said.",
    text: "English transcription includes speaker labels and timestamps. Listen alongside the transcript, search the conversation, and correct names or wording. Save your corrections before generating outputs.",
    detail:
      "Click a timestamp to revisit the recording. Video transcription uses its spoken audio.",
  },
  {
    title: "Make a useful first draft.",
    text: "Generate a project brief, decisions, action items, and follow-up email from the saved transcript. Extracted requirements, decisions, and tasks link back to source segments. Unstated task owners and deadlines stay empty.",
    detail:
      "AI drafts still need your review. Source references help you check the details.",
  },
  {
    title: "Edit it into your team’s words.",
    text: "Review each output in its own tab. Refine the scope, correct a task, mark completed work, and explicitly save. Unsaved changes stay visible. Regenerating creates a new draft while earlier saved versions remain available.",
    detail:
      "A saved version is a specific record of the handoff, not a moving document.",
  },
  {
    title: "Ask the client to review the brief.",
    text: "An agency administrator creates a seven-day review link for a saved brief version. The client enters their name and email, then approves or requests changes with comments. Recordings, transcripts, and internal tasks are excluded.",
    detail:
      "Responses apply to the shared version only. Reviewer details are self-reported, not verified signatures.",
  },
  {
    title: "Take the work where it needs to go.",
    text: "Download the transcript as text, the brief as Markdown, and tasks as CSV. Copy the follow-up email into your email app, check it, and send it yourself. Keep the project and saved briefs available for the next handoff.",
    detail:
      "Your team manages the final edits, task follow-through, and email delivery.",
  },
];
export default function HowItWorks() {
  return (
    <MarketingLayout
      path="/how-it-works"
      title={title}
      description={description}
    >
      <section className="subpage-hero site-width">
        <span className="eyebrow">HOW IT WORKS</span>
        <h1>
          A recording comes in.
          <br />
          <em>A clear handoff comes out.</em>
        </h1>
        <p>
          Six deliberate steps, with room for your judgment.
          <br />
          Here’s what happens between the meeting and the work.
        </p>
        <a href="#the-process" className="text-link">
          Follow the process <ArrowDown size={16} />
        </a>
      </section>
      <section className="process-layout site-width" id="the-process">
        <div className="process-intro">
          <span className="eyebrow">THE WHOLE PROCESS</span>
          <h2>
            Built around
            <br />
            <em>a human review.</em>
          </h2>
          <BriefPreview compact />
        </div>
        <ol className="process-list">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="step-number">0{index + 1}</span>
              <div>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
                <span className="process-detail">{step.detail}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="data-section" id="recordings">
        <div className="site-width marketing-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">RECORDINGS & DATA</span>
              <h2>
                Know what you’re uploading.
                <br />
                <em>Know what you’re sharing.</em>
              </h2>
            </div>
            <p>
              A few practical details to check before bringing a client
              conversation into your workspace.
            </p>
          </div>
          <div className="data-columns">
            <article>
              <ShieldCheck size={22} />
              <h3>Agency access</h3>
              <p>
                Workspace membership controls access to client projects.
                Administrators manage members, share links, and deletion.
                Members can create meetings and edit project outputs.
              </p>
            </article>
            <article>
              <FileText size={22} />
              <h3>Recording processing</h3>
              <p>
                Recordings are stored privately. External transcription and AI
                providers process the recording or transcript to produce your
                outputs. Review provider data terms before uploading
                confidential information, including any free-tier data-use
                terms.
              </p>
            </article>
            <article>
              <Download size={22} />
              <h3>Retention & deletion</h3>
              <p>
                Recordings remain until explicitly deleted. Deleting only a
                recording keeps the transcript and generated work. Full meeting
                deletion revokes its links and removes associated work; cleanup
                status and retries appear in settings.
              </p>
            </article>
          </div>
          <div className="data-consent">
            <Check size={17} />
            <p>
              Upload recordings only when you have permission to process them,
              including participant consent where required. Review links are
              revocable; anyone holding a valid link can submit a response.
            </p>
          </div>
        </div>
      </section>
      <section className="site-width capability-detail">
        <h2>A focused first release.</h2>
        <p>
          ClientBrief works with uploaded English recordings. Live meeting bots,
          automatic email sending, billing, external task integrations, and
          multilingual processing are outside this release.
        </p>
        <Link href="/for-agencies" className="text-link">
          See where it fits in your agency <ArrowUpRight size={16} />
        </Link>
      </section>
      <WorkspaceCta />
    </MarketingLayout>
  );
}
