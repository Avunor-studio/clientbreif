import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { MarketingLayout } from "@/components/marketing";
import { publicMetadata } from "@/lib/seo";

const title = "ClientBrief Pricing — Agency workspace subscription";
const description = "One monthly workspace plan for meeting transcripts, editable project briefs, action items, and client approvals.";
export const metadata = publicMetadata(title, description, "/pricing");

const features = [
  "Transcribe client meeting recordings",
  "Generate editable briefs, decisions, and action items",
  "Share versioned briefs for client approval",
  "Export transcripts, briefs, and tasks",
];

export default function PricingPage() {
  const checkoutEnabled = Boolean(
    process.env.REVENUECAT_PROJECT_ID &&
    process.env.REVENUECAT_PRODUCT_ID &&
    process.env.REVENUECAT_API_KEY &&
    /^https:\/\/pay\.rev\.cat\/[A-Za-z0-9_-]+\/?$/.test(process.env.REVENUECAT_PURCHASE_LINK ?? "") &&
    (process.env.REVENUECAT_ENVIRONMENT ?? "production") === "production",
  );

  return (
    <MarketingLayout path="/pricing" title={title} description={description}>
      <section className="subpage-hero site-width pricing-page">
        <h1>One plan for your <em>agency.</em></h1>
        <p>Give your team one workspace to turn client conversations into project handoffs.</p>
        <article className="scenario-note pricing-card" aria-labelledby="workspace-plan">
          <h2 id="workspace-plan">Agency workspace</h2>
          <p className="pricing-rate"><strong>US$29</strong> per workspace per month</p>
          <ul className="plain-checks">
            {features.map((feature) => (
              <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>
            ))}
          </ul>
          {checkoutEnabled ? (
            <Link className="btn btn-primary" href="/app/settings">
              Open workspace billing <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <>
              <p>Checkout is coming soon.</p>
              <a className="btn btn-primary" href="mailto:avunorstudio@gmail.com?subject=ClientBrief%20workspace%20plan">
                Contact Avunor Studio <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </>
          )}
        </article>
      </section>
    </MarketingLayout>
  );
}
