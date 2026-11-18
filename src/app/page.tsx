import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CornerDownRight,
  FileCheck2,
  Headphones,
  Link2,
  LockKeyhole,
} from "lucide-react";
import {
  HeroProduct,
  MarketingLayout,
  WorkspaceCta,
  workflowSteps,
} from "@/components/marketing";
import { OutputDemo } from "@/components/output-demo";
import { publicMetadata } from "@/lib/seo";

const title =
  "ClientBrief — Client meeting transcripts, project briefs & approvals";
const description =
  "Turn client meeting recordings into editable project briefs, decisions, action items, and follow-up drafts. Review the transcript and get client approval on a saved brief.";
export const metadata = publicMetadata(title, description, "/");

const questions = [
  [
    "What does ClientBrief actually do?",
    "ClientBrief is an agency workspace for the work after a client meeting. Upload a recording, check the transcript, and generate a project brief, decisions, tasks, and a follow-up email draft. Your team edits and saves the work before sharing a brief with the client.",
  ],
  [
    "Can I upload a video meeting?",
    "Yes. Upload MP3, WAV, M4A, MP4, or WebM files up to 250 MB and 60 minutes. Transcription is English-first. Video processing uses spoken audio; it does not analyze slides, screens, or other visual content.",
  ],
  [
    "Can I correct what the AI produces?",
    "Yes. Correct the transcript and speaker names before generating. Edit the generated outputs and explicitly save them. Generating again creates another draft rather than overwriting a saved version.",
  ],
  [
    "What can my client see?",
    "Only the saved brief version shared through their review link. Recordings, transcripts, internal tasks, and other projects are not included. Review links expire after seven days and can be revoked by an administrator.",
  ],
  [
    "Does it join my meetings or send emails?",
    "Upload a recording after your meeting; ClientBrief does not join calls. The follow-up email is a draft you can copy, review, and send yourself. You can also export the transcript as text, the brief as Markdown, and tasks as CSV.",
  ],
  [
    "How long are recordings kept?",
    "Recordings remain until you explicitly delete them. Recording-only deletion preserves your generated work. Full meeting deletion removes the associated transcript, outputs, and review links, with cleanup progress visible in settings. Transcription and generation use external service providers; review their data terms before uploading confidential material.",
  ],
] as const;

export default function Home() {
  return (
    <MarketingLayout path="/" title={title} description={description}>
      <section className="marketing-hero site-width">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-rule" /> THE AFTER-MEETING WORKSPACE
          </div>
          <h1>
            Turn client
            <br />
            meetings into
            <br />
            <em>project briefs.</em>
          </h1>
          <p className="hero-description">
            The call went well. Now make it useful.
          </p>
          <p className="hero-body">
            Bring your recording. Get an editable brief, decisions, tasks, and a
            follow-up draft. Review the details with your team, then get your
            client on the same page.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/app">
              Create your workspace <ArrowUpRight size={17} />
            </Link>
            <a className="text-link" href="#outputs">
              See an example brief <ArrowRight size={16} />
            </a>
          </div>
          <div className="hero-note">
            <Check size={14} />
            <span>Your words. Your edits. Your final say.</span>
          </div>
        </div>
        <HeroProduct />
      </section>

      <div className="capability-strip">
        <div className="site-width">
          <span>
            FROM THE CALL
            <br />
            <strong>TO THE WORK.</strong>
          </span>
          <span>
            <Headphones size={18} /> Audio & video uploads
          </span>
          <span>
            <Link2 size={18} /> Source-linked details
          </span>
          <span>
            <FileCheck2 size={18} /> Versioned client review
          </span>
        </div>
      </div>

      <section className="marketing-section site-width" id="outputs">
        <div className="section-heading">
          <div>
            <span className="eyebrow">01 / THE HANDOFF</span>
            <h2>
              A conversation is a start.
              <br />
              <em>This is what comes next.</em>
            </h2>
          </div>
          <p>
            The scope. The decisions. The things somebody needs to do. Put them
            into a format your team can actually work with.
          </p>
        </div>
        <OutputDemo />
        <div className="demo-footnote">
          <span>
            Illustrative agency project. Select an output to take a look.
          </span>
          <span>
            <CornerDownRight size={14} /> Everything stays editable.
          </span>
        </div>
      </section>

      <section className="workflow-section">
        <div className="site-width marketing-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">02 / A CONSIDERED WORKFLOW</span>
              <h2>
                AI does the first pass.
                <br />
                <em>You make the call.</em>
              </h2>
            </div>
            <Link className="text-link" href="/how-it-works">
              Walk through the process <ArrowUpRight size={17} />
            </Link>
          </div>
          <ol className="workflow-steps">
            {workflowSteps.map((step) => (
              <li key={step.number}>
                <span className="step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="marketing-section site-width review-story">
        <div className="review-story-copy">
          <span className="eyebrow">03 / LESS BACK-AND-FORTH</span>
          <h2>
            “Is this what
            <br />
            <em>we agreed?”</em>
          </h2>
          <p>
            Give your client something specific to review. Share a saved brief,
            receive an approval or a change request, and keep that response
            attached to that version.
          </p>
          <ul className="plain-checks">
            <li>
              <Check size={16} /> The client sees only the brief you share.
            </li>
            <li>
              <Check size={16} /> Links expire after seven days.
            </li>
            <li>
              <Check size={16} /> Later edits become a separate version.
            </li>
          </ul>
        </div>
        <div className="review-example">
          <span className="sample-tag">EXAMPLE CLIENT REVIEW</span>
          <div className="review-example-heading">
            <span className="document-label">NORTHSTAR / WEBSITE REFRESH</span>
            <h3>
              One brief.
              <br />A shared understanding.
            </h3>
          </div>
          <div className="review-scope">
            <span className="document-label">SCOPE / VERSION 01</span>
            <p>
              Five core pages. A four-field enquiry form.
              <br />
              Photography source to be confirmed.
            </p>
          </div>
          <div className="review-approval">
            <span className="approval-seal">
              <Check size={20} />
            </span>
            <div>
              <strong>Version 01 approved</strong>
              <span>Alex · Client response</span>
            </div>
            <span className="review-example-date">Saved with this version</span>
          </div>
          <p className="example-caption">
            Illustrative response, not a customer testimonial.
          </p>
        </div>
      </section>

      <section className="agency-section">
        <div className="site-width marketing-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">04 / MADE FOR CLIENT WORK</span>
              <h2>
                From the first discovery
                <br />
                <em>to the project kickoff.</em>
              </h2>
            </div>
            <Link className="text-link" href="/for-agencies">
              Inside an agency workflow <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="agency-usecases">
            <article>
              <span>DISCOVERY</span>
              <h3>Capture the real ask.</h3>
              <p>
                Bring goals, requirements, and unanswered questions into a brief
                the client can review.
              </p>
            </article>
            <article>
              <span>CREATIVE & WEB PROJECTS</span>
              <h3>Give the team a starting point.</h3>
              <p>
                Turn agreed deliverables and decisions into a useful handoff for
                designers and developers.
              </p>
            </article>
            <article>
              <span>ACCOUNT MANAGEMENT</span>
              <h3>Close the loop after the call.</h3>
              <p>
                Check next steps, keep owners and dates honest, and prepare a
                follow-up in the same workspace.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="privacy-note site-width">
        <LockKeyhole size={25} />
        <div>
          <h3>Share the brief. Keep the working context.</h3>
          <p>
            Recordings and transcripts stay within your agency workspace. Shared
            review pages expose only the selected brief. You control when
            recordings are deleted.
          </p>
        </div>
        <Link className="text-link" href="/how-it-works#recordings">
          Recording & data <ArrowUpRight size={16} />
        </Link>
      </section>

      <section className="marketing-section site-width faq-section" id="faq">
        <div>
          <span className="eyebrow">A FEW PRACTICAL QUESTIONS</span>
          <h2>
            Before your
            <br />
            <em>first upload.</em>
          </h2>
        </div>
        <div className="faq-list">
          {questions.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <WorkspaceCta />
    </MarketingLayout>
  );
}
