import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { billingDestination, requireRecordingAccess, workspaceBilling } from "../src/lib/revenuecat";

const org = "org_demo";
const subscription = { product_id: "prod_workspace", environment: "production", gives_access: true };
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("REVENUECAT_API_KEY", "test-only");
  vi.stubEnv("REVENUECAT_PROJECT_ID", "proj_demo");
  vi.stubEnv("REVENUECAT_PRODUCT_ID", subscription.product_id);
  vi.stubEnv("REVENUECAT_ENVIRONMENT", "production");
  vi.stubEnv("REVENUECAT_PURCHASE_LINK", "https://pay.rev.cat/example");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); fetchMock.mockReset(); });

describe("RevenueCat workspace access", () => {
  it("uses the authenticated organization and provider access decision", async () => {
    fetchMock.mockResolvedValue(Response.json({ items: [subscription] }));
    await requireRecordingAccess(org);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/v2/projects/proj_demo/customers/org_demo/subscriptions");
    expect(url.searchParams.get("environment")).toBe("production");
    expect(init.cache).toBe("no-store");
  });
  it.each([{ environment: "sandbox" }, { product_id: "prod_other" }, { gives_access: false }])(
    "rejects a subscription that does not grant production access (%j)", async (override) => {
      fetchMock.mockResolvedValue(Response.json({ items: [{ ...subscription, ...override }] }));
      await expect(requireRecordingAccess(org)).rejects.toMatchObject({ status: 402 });
    });
  it("checks later pages", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ items: [], next_page: "/v2/projects/proj_demo/customers/org_demo/subscriptions?starting_after=abc" }));
    fetchMock.mockResolvedValueOnce(Response.json({ items: [subscription] }));
    expect((await workspaceBilling(org)).status).toBe("active");
  });
  it("fails closed on provider errors", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));
    await expect(requireRecordingAccess(org)).rejects.toMatchObject({ status: 503 });
  });
  it("opens identified checkout for a new customer", async () => {
    fetchMock.mockResolvedValue(Response.json({ type: "resource_missing" }, { status: 404 }));
    expect(await billingDestination(org)).toBe("https://pay.rev.cat/example/org_demo");
  });
  it("returns the portal for an active customer", async () => {
    const management_url = "https://billing.example.test/portal";
    fetchMock.mockResolvedValue(Response.json({ items: [{ ...subscription, management_url }] }));
    expect(await billingDestination(org)).toBe(management_url);
  });
  it("rejects sandbox mode on the production deployment", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("REVENUECAT_ENVIRONMENT", "sandbox");
    expect((await workspaceBilling(org)).status).toBe("unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
