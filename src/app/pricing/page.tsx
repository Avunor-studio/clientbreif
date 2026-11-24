import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MarketingLayout } from "@/components/marketing";
import { CheckoutComingSoon, WorkspacePlan } from "@/components/workspace-plan";
import { publicMetadata } from "@/lib/seo";

const title = "ClientBrief Pricing — Agency workspace subscription";
const description = "One monthly workspace plan for meeting transcripts, editable project briefs, action items, and client approvals.";
export const metadata = publicMetadata(title, description, "/pricing");

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
        <WorkspacePlan className="scenario-note pricing-card">
          {checkoutEnabled ? (
            <Link className="btn btn-primary" href="/app/settings">
              Open workspace billing <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <CheckoutComingSoon />
          )}
        </WorkspacePlan>
      </section>
    </MarketingLayout>
  );
}
