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
  LayoutTemplate,
  Upload,
} from "lucide-react";
import { MarketingLayout, WorkspaceCta } from "@/components/marketing";
import { OutputDemo } from "@/components/output-demo";
import { TranscriptWalkthrough } from "@/components/transcript-walkthrough";
import { publicMetadata } from "@/lib/seo";
import "./homepage.css";

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
  sizes: "(max-width: 900px) calc(100vw - 86px), (max-width: 1192px) calc(100vw - 122px), 1070px",
  loading: "eager",
  fetchPriority: "high",
});

export default function Home() {
  return (
    <MarketingLayout path="/" title={title} description={description}>
      <section className="home-hero site-width">
        <p className="home-audience">For client-facing agencies</p>
        <h1>
          <span>Turn client calls into</span>{" "}
          <span>briefs your clients can approve.</span>
        </h1>
        <p className="home-intro">
          Upload a meeting recording. Review the transcript, edit the AI draft,
          and share a saved brief for approval.
        </p>
        <div className="home-actions">
          <Link className="btn btn-primary" href="/app">
            Create a workspace <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <a className="btn btn-outline" href="#outputs">
            See an example <ArrowDown size={15} aria-hidden="true" />
          </a>
        </div>
        <figure className="workspace-preview">
          <figcaption>
            <span>
              <LayoutTemplate size={14} aria-hidden="true" /> ClientBrief workspace
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

      <section className="site-width home-section home-outputs" id="outputs">
        <div className="section-heading home-section-heading">
          <div>
            <p className="eyebrow">Website discovery example</p>
            <h2>See how a conversation becomes a brief.</h2>
          </div>
          <p>
            Start with one moment from the call, then explore the drafts your
            team can edit and save.
          </p>
        </div>
        <TranscriptWalkthrough />
        <OutputDemo />
      </section>

      <section className="home-workflow" id="workflow">
        <div className="site-width home-section">
          <div className="home-section-heading">
            <h2>From recording to client approval.</h2>
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
            Explore the full workflow <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="site-width home-section home-faq" id="faq">
        <div className="home-section-heading">
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
        <div className="home-faq-links">
          <Link className="text-link" href="/how-it-works#recordings">
            <Check size={15} aria-hidden="true" /> Read about recordings and data
          </Link>
          <Link className="text-link" href="/pricing">
            See plans <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <WorkspaceCta />
    </MarketingLayout>
  );
}
