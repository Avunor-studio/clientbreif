import Link from "next/link";
import { ArrowUpRight, Check, CornerDownRight } from "lucide-react";
import { MarketingLayout, WorkspaceCta } from "@/components/marketing";
import { publicMetadata } from "@/lib/seo";
const title =
  "ClientBrief for agencies — Clearer discovery calls & project handoffs";
const description =
  "Give account managers, project managers, and creative teams a shared record of client meetings. Review scope, decisions, action items, and version-specific client approvals.";
export const metadata = publicMetadata(title, description, "/for-agencies", [
  "client meeting notes for agencies",
  "website discovery brief",
  "agency project handoff",
]);
const scenarios = [
  {
    number: "01",
    label: "WEBSITE DISCOVERY",
    title: "A better start than a page of scattered notes.",
    text: "The client talks about services, audiences, pages, and the form nobody likes. Bring those details into a project brief your designer and developer can review before work begins.",
    quote: "“Keep the five pages. Make the enquiry form simpler.”",
    outcomes: [
      "Agreed scope and deliverables",
      "Requirements linked to the conversation",
      "Open questions that need another answer",
    ],
  },
  {
    number: "02",
    label: "BRAND & CREATIVE PROJECTS",
    title: "Keep the reasoning with the direction.",
    text: "A useful handoff includes what the client decided and what still needs a decision. Review the extracted direction against the transcript, then shape the brief into your own language.",
    quote: "“The tone should feel direct, but still welcoming.”",
    outcomes: [
      "A reviewed creative starting point",
      "A record of the decisions made",
      "A saved brief to share for client review",
    ],
  },
  {
    number: "03",
    label: "PROJECT KICKOFFS & FOLLOW-UPS",
    title: "Leave with the same set of next steps.",
    text: "After the call, check the tasks, add the owners your team confirms, and prepare the follow-up. Share the brief version that reflects the agreement and keep later changes in a new version.",
    quote: "“Jamie will prepare the form proposal. We’ll confirm photography.”",
    outcomes: [
      "Action items with editable owners and deadlines",
      "A follow-up email draft to copy",
      "Client approval tied to a specific brief",
    ],
  },
];
export default function ForAgencies() {
  return (
    <MarketingLayout
      path="/for-agencies"
      title={title}
      description={description}
    >
      <section className="subpage-hero site-width">
        <span className="eyebrow">FOR AGENCIES & CLIENT-FACING TEAMS</span>
        <h1>
          Client meeting notes
          <br />
          <em>for agency teams.</em>
        </h1>
        <p>
          Give account managers, project managers, and delivery teams
          <br />a common starting point for what happens next.
        </p>
        <Link href="/app" className="btn btn-primary">
          Create your agency workspace <ArrowUpRight size={17} />
        </Link>
      </section>
      <div className="site-width agency-scenarios">
        {scenarios.map((scenario) => (
          <section className="agency-scenario" key={scenario.number}>
            <div>
              <span className="eyebrow">
                {scenario.number} / {scenario.label}
              </span>
              <h2>{scenario.title}</h2>
              <p>{scenario.text}</p>
            </div>
            <div className="scenario-note">
              <span className="document-label">
                A MOMENT IN THE CONVERSATION
              </span>
              <blockquote>{scenario.quote}</blockquote>
              <span className="scenario-turn">
                <CornerDownRight size={17} /> TURNED INTO A USEFUL HANDOFF
              </span>
              <ul className="plain-checks">
                {scenario.outcomes.map((outcome) => (
                  <li key={outcome}>
                    <Check size={15} />
                    {outcome}
                  </li>
                ))}
              </ul>
              <span className="example-caption">
                Illustrative workflow, not a customer case study.
              </span>
            </div>
          </section>
        ))}
      </div>
      <section className="team-section">
        <div className="site-width marketing-section">
          <span className="eyebrow">
            ONE WORKSPACE / DIFFERENT RESPONSIBILITIES
          </span>
          <h2>
            A place for the people
            <br />
            <em>who carry the project forward.</em>
          </h2>
          <div className="team-roles">
            <article>
              <span>ACCOUNT MANAGERS</span>
              <h3>Keep the client conversation intact.</h3>
              <p>
                Check the transcript, refine the brief, and prepare a follow-up
                that reflects what was actually discussed.
              </p>
            </article>
            <article>
              <span>PROJECT MANAGERS</span>
              <h3>Make the next steps concrete.</h3>
              <p>
                Review scope and action items. Confirm responsibility and dates
                with your team instead of treating AI guesses as commitments.
              </p>
            </article>
            <article>
              <span>DESIGNERS & DEVELOPERS</span>
              <h3>Start with the context.</h3>
              <p>
                Use the brief and source-linked requirements to understand the
                ask, and spot open questions before the handoff becomes work.
              </p>
            </article>
          </div>
        </div>
      </section>
      <section className="site-width agency-bottom">
        <h2>
          A brief your team can use.
          <br />
          <em>A version your client can review.</em>
        </h2>
        <Link href="/how-it-works" className="text-link">
          See the complete workflow <ArrowUpRight size={17} />
        </Link>
      </section>
      <WorkspaceCta />
    </MarketingLayout>
  );
}
