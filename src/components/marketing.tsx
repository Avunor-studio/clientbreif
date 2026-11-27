import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "./brand";
import { MarketingNav } from "./marketing-nav";
import { publicPageSchema } from "@/lib/seo";

export { BriefPreview } from "./brief-preview";

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
    <div className={path === "/" ? "marketing homepage" : "marketing"}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <MarketingNav />
      <main id="main-content">{children}</main>
      <footer className="marketing-footer">
        <div className="footer-top site-width">
          <div>
            <Link href="/" aria-label="ClientBrief home">
              <Brand />
            </Link>
            <p>
              Meeting transcription, project briefs, and client approvals for
              agencies.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/#outputs">The product</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/for-agencies">For agencies</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/how-it-works#recordings">Recording &amp; data</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/sign-in">Sign in</Link>
          </nav>
        </div>
        <div className="footer-bottom site-width">
          © {new Date().getFullYear()} ClientBrief
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
      <div className="closing-card">
        <h2>
          Give your next client call <em>a clear next step.</em>
        </h2>
        <p>
          Open a workspace, create a project, and bring a meeting recording you
          have permission to use.
        </p>
        <Link href="/app" className="btn btn-primary">
          Create your workspace <ArrowUpRight size={17} />
        </Link>
      </div>
    </section>
  );
}
