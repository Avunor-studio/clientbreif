import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BriefPreview } from "./brief-preview";
export { BriefPreview } from "./brief-preview";
import { Brand } from "./brand";
import { MarketingNav } from "./marketing-nav";
import { publicPageSchema } from "@/lib/seo";

export function MarketingLayout({
  children,
  path,
  title,
  description,
}: {
  children: React.ReactNode;
  path: string;
  title: string;
  description: string;
}) {
  return (
    <div className="marketing">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <MarketingNav />
      <main id="main-content">{children}</main>
      <footer className="marketing-footer site-width">
        <div className="footer-top">
          <div>
            <Link href="/" aria-label="ClientBrief home">
              <Brand />
            </Link>
            <p>
              Good conversations deserve
              <br />a clear next step.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/#outputs">The product</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/for-agencies">For agencies</Link>
            <Link href="/how-it-works#recordings">Recording & data</Link>
            <Link href="/#faq">Questions & answers</Link>
            <Link href="/sign-in">Sign in</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} ClientBrief</span>
          <span>Made for the work that happens after the call.</span>
        </div>
      </footer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            publicPageSchema(path, title, description),
          ).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}

export function WorkspaceCta() {
  return (
    <section className="closing-cta site-width">
      <div>
        <span className="eyebrow">THE NEXT STEP IS A CLEAR ONE</span>
        <h2>
          Your next call.
          <br />
          <em>Your next brief.</em>
        </h2>
      </div>
      <div>
        <p>
          Bring a recording. Review the details.
          <br />
          Give your team and client something to work from.
        </p>
        <Link href="/app" className="btn btn-primary">
          Create your workspace <ArrowUpRight size={17} />
        </Link>
        <span className="cta-note">For agencies and client-facing teams.</span>
      </div>
    </section>
  );
}

export function HeroProduct() {
  return (
    <div className="hero-product">
      <div className="recording-strip">
        <span className="recording-icon">
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
        <div>
          <strong>Website discovery</strong>
          <span>Recording → transcript → brief</span>
        </div>
        <span className="sample-tag">EXAMPLE</span>
      </div>
      <div className="hero-transcript">
        <span className="transcript-speaker">
          NORTHSTAR / CLIENT <span>04:32</span>
        </span>
        <p>
          “Let’s keep the five core pages, and make the enquiry form just four
          fields.”
        </p>
      </div>
      <div className="hero-connector">
        <span />
        The conversation, made concrete
        <span />
      </div>
      <BriefPreview compact />
      <p className="example-caption">
        Illustrative content. Your team reviews every draft.
      </p>
    </div>
  );
}

export const workflowSteps = [
  {
    number: "01",
    title: "Bring the recording",
    text: "Create a client project and upload the audio or video from your meeting.",
  },
  {
    number: "02",
    title: "Check the conversation",
    text: "Review the English transcript. Correct words and speaker names before generating.",
  },
  {
    number: "03",
    title: "Shape the handoff",
    text: "Generate and edit the brief, decisions, tasks, and follow-up. Save a version when it is ready.",
  },
  {
    number: "04",
    title: "Get client alignment",
    text: "Share that saved brief. Your client approves or requests changes on that exact version.",
  },
] as const;
