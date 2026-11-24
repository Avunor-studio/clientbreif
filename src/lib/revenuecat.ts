import { HttpError } from "./server";

export type BillingStatus = "active" | "inactive" | "unavailable";
type Subscription = {
  product_id: string;
  environment: string;
  gives_access: boolean;
  management_url?: string | null;
};
type Billing = { status: BillingStatus; manageUrl?: string };

function config() {
  const project = process.env.REVENUECAT_PROJECT_ID;
  const product = process.env.REVENUECAT_PRODUCT_ID;
  const key = process.env.REVENUECAT_API_KEY;
  const link = process.env.REVENUECAT_PURCHASE_LINK;
  const environment = process.env.REVENUECAT_ENVIRONMENT || "production";
  if (!project || !product || !key || !link || !/^https:\/\/pay\.rev\.cat\/[A-Za-z0-9_-]+\/?$/.test(link)) return null;
  if (environment !== "production" && environment !== "sandbox") return null;
  if (environment === "sandbox" && process.env.VERCEL_ENV === "production") return null;
  return { project, product, key, link, environment };
}

export async function workspaceBilling(org: string): Promise<Billing> {
  const settings = config();
  if (!settings) return { status: "unavailable" };
  const url = new URL(`https://api.revenuecat.com/v2/projects/${encodeURIComponent(settings.project)}/customers/${encodeURIComponent(org)}/subscriptions`);
  url.searchParams.set("environment", settings.environment);
  url.searchParams.set("limit", "100");
  try {
    const signal = AbortSignal.timeout(6500);
    for (;;) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${settings.key}` }, cache: "no-store", redirect: "error", signal,
      });
      if (response.status === 404) {
        const error = await response.json();
        return { status: error.type === "resource_missing" ? "inactive" : "unavailable" };
      }
      if (!response.ok) return { status: "unavailable" };
      const page = await response.json() as { items: Subscription[]; next_page?: string | null };
      const active = page.items.find(item => item.environment === settings.environment &&
        item.product_id === settings.product && item.gives_access === true);
      if (active) return { status: "active",
        manageUrl: active.management_url?.startsWith("https://") ? active.management_url : undefined };
      if (!page.next_page) return { status: "inactive" };
      const next = new URL(page.next_page, url);
      const cursor = next.searchParams.get("starting_after");
      if (next.origin !== url.origin || next.pathname !== url.pathname ||
          !cursor || cursor === url.searchParams.get("starting_after")) return { status: "unavailable" };
      url.searchParams.set("starting_after", cursor);
    }
  } catch {
    return { status: "unavailable" };
  }
}

export async function requireRecordingAccess(org: string) {
  const { status } = await workspaceBilling(org);
  if (status === "unavailable") throw new HttpError(503, "Workspace billing is unavailable. Contact avunorstudio@gmail.com.");
  if (status === "inactive") throw new HttpError(402, "An active workspace subscription is required. Open Settings to subscribe.");
}

export async function billingDestination(org: string) {
  const settings = config();
  const billing = await workspaceBilling(org);
  if (!settings || billing.status === "unavailable") throw new HttpError(503, "RevenueCat billing is unavailable. Contact avunorstudio@gmail.com.");
  if (billing.status === "active") {
    if (!billing.manageUrl) throw new HttpError(409, "Use the management link in your billing email or contact avunorstudio@gmail.com.");
    return billing.manageUrl;
  }
  return settings.link.replace(/\/$/, "") + "/" + encodeURIComponent(org);
}
