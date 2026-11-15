import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileCheck2,
  ListChecks,
  Quote,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
export default function Home() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <div className="row">
          <Button asChild variant="ghost">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/app">
              Open workspace <ArrowRight size={15} />
            </Link>
          </Button>
        </div>
      </header>
      <main>
        <section className="hero">
          <div>
            <span className="badge">Built for client-facing teams</span>
            <h1>
              Good conversations.
              <br />
              <em>Clear next steps.</em>
            </h1>
            <p>
              Turn your client meeting recordings into project briefs,
              decisions, and follow-ups. Review the details, align with your
              client, and get to work.
            </p>
            <div className="row">
              <Button asChild>
                <Link href="/app">
                  Create your workspace <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
            <p className="small" style={{ marginTop: 17, fontSize: 12 }}>
              Audio or video uploads · Human review at every step
            </p>
          </div>
          <div className="card hero-brief">
            <div className="row between">
              <span className="eyebrow">Example project brief</span>
              <span className="badge ready">
                <Check size={12} /> Ready for review
              </span>
            </div>
            <h2 style={{ marginTop: 20 }}>Website discovery call</h2>
            <p className="muted small" style={{ marginTop: 4 }}>
              Northstar Studio / Website refresh
            </p>
            <div className="sample-line" style={{ marginTop: 14 }}>
              <div className="sample-title">The direction</div>
              <p>
                A focused website refresh that makes the service offering easier
                to explore.
              </p>
            </div>
            <div className="sample-line">
              <div className="sample-title">Agreed deliverables</div>
              <p>Five core pages and a simplified enquiry form.</p>
              <span className="badge" style={{ marginTop: 8 }}>
                <Quote size={11} /> Source at 04:32
              </span>
            </div>
            <div className="sample-line">
              <div className="sample-title">Still to confirm</div>
              <p>Who will supply the final photography?</p>
            </div>
            <div className="row between" style={{ marginTop: 16 }}>
              <span className="small muted">
                Draft → review → client approval
              </span>
              <FileCheck2 size={20} color="#315de8" />
            </div>
          </div>
        </section>
        <section className="features">
          <div>
            <Quote size={24} />
            <h3>Every detail has a source</h3>
            <p>
              Jump from an extracted requirement to the moment it was discussed.
            </p>
          </div>
          <div>
            <ListChecks size={24} />
            <h3>A useful handoff, already drafted</h3>
            <p>
              Review the brief, assign next steps, and copy your follow-up
              email.
            </p>
          </div>
          <div>
            <ShieldCheck size={24} />
            <h3>Share exactly what is ready</h3>
            <p>
              Private recordings, versioned briefs, and expiring client approval
              links.
            </p>
          </div>
        </section>
      </main>
      <footer className="footer">
        ClientBrief · An agency workspace for clearer client handoffs.
      </footer>
    </div>
  );
}
