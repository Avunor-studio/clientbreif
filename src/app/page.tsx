import { getImageProps } from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronDown,
  FileCheck2,
  FilePenLine,
  Upload,
} from "lucide-react";
import { MarketingLayout, WorkspaceCta } from "@/components/marketing";
import { OutputDemo } from "@/components/output-demo";
import { publicMetadata } from "@/lib/seo";

const title =
  "AI Meeting Transcription & Project Briefs for Agencies | ClientBrief";
const description =
  "Turn client meeting recordings into searchable transcripts, editable project briefs, action items, and follow-up emails. Share a saved brief for client approval.";

export const metadata = publicMetadata(title, description, "/", [
  "AI meeting transcription",
  "AI project brief generator",
  "client meeting notes",
  "agency project management",
  "client approval software",
]);

const steps = [
  {
    icon: Upload,
    title: "Upload a recording",
    text: "Add an audio or video file to a client project after the meeting.",
    detail: "MP3, WAV, M4A, MP4, WebM",
  },
  {
    icon: AudioLines,
    title: "Review the transcript",
    text: "Search the conversation, play it from a timestamp, and correct speakers or wording.",
    detail: "English transcription",
  },
  {
    icon: FilePenLine,
    title: "Draft the handoff",
    text: "Generate a project brief, decisions, action items, and a follow-up email. Edit and save a version.",
    detail: "Source-linked outputs",
  },
  {
    icon: FileCheck2,
    title: "Get client approval",
    text: "Send a saved brief for approval or a change request. Each response applies to that version.",
    detail: "Revocable review link",
  },
];

const questions = [
  [
    "How does AI meeting transcription work?",
    "Upload a recording and ClientBrief creates an English transcript with speaker labels and timestamps. Search it, revisit the audio, and save your corrections before generating a brief.",
  ],
  [
    "Which meeting recording formats can I upload?",
    "ClientBrief accepts MP3, WAV, M4A, MP4, and WebM files up to 250 MB and 60 minutes. Video transcription uses the spoken audio.",
  ],
  [
    "Can clients approve a project brief without an account?",
    "Yes. An agency administrator can share a saved version using a review link. Clients can approve it or request changes. Review links expire after seven days and can be revoked.",
  ],
  [
    "What can a client see through the review link?",
    "The link opens the shared brief version. Recordings, transcripts, internal task lists, and other projects stay in the agency workspace.",
  ],
  [
    "Which formats can I export?",
    "Export the transcript as plain text, the brief as Markdown, and tasks as CSV. You can also copy the follow-up email draft into your email app.",
  ],
  [
    "How long are meeting recordings kept?",
    "Recordings stay in private storage until you delete them. Deleting the recording preserves the generated work. You can also delete the whole meeting. External providers process transcription and AI generation.",
  ],
] as const;

const { props: workspacePreview } = getImageProps({
  src: "/images/clientbrief-meeting-workspace.jpg",
  alt: "ClientBrief workspace for a sample website discovery meeting",
  width: 1200,
  height: 690,
  sizes: "(max-width: 900px) calc(100vw - 60px), (max-width: 1296px) calc(100vw - 96px), 1200px",
  loading: "eager",
});

export default function Home() {
  return (
    <MarketingLayout path="/" title={title} description={description}>
      <section className="home-hero site-width">
        <span className="hero-kicker">
          For agencies and client-facing teams
        </span>
        <h1>
          Turn client meetings into <em>project briefs.</em>
        </h1>
        <p>
          Upload a meeting recording. Get an editable brief, decisions, action
          items, and a follow-up draft. Check the transcript and share the
          version your client should review.
        </p>
        <div className="home-actions">
          <Link className="btn btn-primary" href="/app">
            Create your workspace <ArrowUpRight size={16} />
          </Link>
          <a className="btn btn-outline" href="#outputs">
            See an example brief <ArrowDown size={15} />
          </a>
        </div>
        <figure className="workspace-preview">
          <figcaption>
            <span>
              <span className="preview-dot" /> ClientBrief workspace
            </span>
            <span>Sample website discovery meeting</span>
          </figcaption>
          <picture>
            <source
              media="(max-width: 640px)"
              srcSet="/images/clientbrief-meeting-workspace-mobile.jpg"
              width={354}
              height={390}
            />
            <img {...workspacePreview} />
          </picture>
        </figure>
      </section>

      <section className="home-workflow" id="workflow">
        <div className="site-width home-section">
          <div className="home-section-heading">
            <span className="eyebrow">The workflow</span>
            <h2>
              From meeting recording
              <br className="desktop-break" /> to client approval.
            </h2>
            <p>
              Review what was said, decide what goes into the brief, and keep
              the approved version with the project.
            </p>
          </div>
          <ol className="workflow-cards">
            {steps.map(({ icon: Icon, title, text, detail }) => (
              <li key={title}>
                <span className="workflow-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="workflow-detail">{detail}</span>
              </li>
            ))}
          </ol>
          <Link className="text-link" href="/how-it-works">
            Explore the full workflow <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>

      <section className="site-width home-section" id="outputs">
        <div className="section-heading home-section-heading">
          <div>
            <span className="eyebrow">Example outputs</span>
            <h2>
              Four deliverables
              <br className="desktop-break" /> from one client call.
            </h2>
          </div>
          <p>
            Explore a website discovery project. Each draft can be checked
            against the conversation and edited by your team.
          </p>
        </div>
        <OutputDemo />
      </section>

      <div className="home-facts">
        <dl className="site-width">
          <div>
            <dt>
              Recording formats<span>Audio and video uploads</span>
            </dt>
            <dd>5</dd>
          </div>
          <div>
            <dt>
              Meeting length<span>Up to 250 MB per file</span>
            </dt>
            <dd>60 min</dd>
          </div>
          <div>
            <dt>
              Client review window<span>Links can be revoked sooner</span>
            </dt>
            <dd>7 days</dd>
          </div>
          <div>
            <dt>
              Approval history<span>Saved approvals stay with the brief</span>
            </dt>
            <dd>By version</dd>
          </div>
        </dl>
      </div>

      <section className="site-width home-section home-faq" id="faq">
        <div className="home-section-heading">
          <span className="eyebrow">Frequently asked questions</span>
          <h2>Before your first upload.</h2>
          <p>Recording formats, client review, exports, and data retention.</p>
        </div>
        <div className="faq-list">
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <ChevronDown size={17} aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
        <Link className="text-link" href="/how-it-works#recordings">
          <Check size={15} /> Read about recordings and data
        </Link>
      </section>
      <WorkspaceCta />
    </MarketingLayout>
  );
}
