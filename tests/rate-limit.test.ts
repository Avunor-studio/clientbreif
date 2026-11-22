import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), auth: vi.fn(), members: vi.fn() }));
vi.mock("../src/lib/admin-db", () => ({ adminDb: () => ({ rpc: mocks.rpc }) }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth, clerkClient: mocks.members }));
vi.mock("../src/workflows/meeting", () => ({ transcribeMeeting: vi.fn(), generateMeeting: vi.fn(), deleteMeeting: vi.fn() }));
vi.mock("../src/workflows/project", () => ({ generateProject: vi.fn() }));
vi.mock("workflow/api", () => ({ start: vi.fn() }));
import { POST } from "../src/app/api/[...path]/route";
import { startsProcessing } from "../src/lib/rate-limit";

beforeEach(() => {
  vi.resetAllMocks();
  for (const key of ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"]) vi.stubEnv(key, "test-config");
  mocks.auth.mockResolvedValue({ userId: "user_verified", orgId: "org_test" });
});
afterEach(() => vi.unstubAllEnvs());

function post(path: string[], headers?: Record<string,string>) {
  return POST(new NextRequest("https://example.test/api/" + path.join("/"), { method: "POST", headers }), {
    params: Promise.resolve({ path }),
  });
}
describe("request quotas", () => {
  it.each([["meetings","process"],["meetings","generate"],["projects","prepare"],["projects","scope-check"]])(
    "meters %s %s before provider work", (resource, action) => {
      expect(startsProcessing("POST",[resource,"id",action])).toBe(true);
      expect(startsProcessing("GET",[resource,"id",action])).toBe(false);
    });
  it("charges the verified user across agencies and returns the retry time before backend work", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: 0 }).mockResolvedValueOnce({ data: 90 }).mockResolvedValueOnce({ data: 25 });
    let response = await post(["meetings","id","generate"], { "x-user-id":"other" });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("90");
    mocks.auth.mockResolvedValue({ userId: "user_verified", orgId: "org_another" });
    response = await post(["clients"]);
    expect(response.status).toBe(429);
    const digest = createHash("sha256").update("user_verified").digest("hex");
    expect(mocks.rpc.mock.calls.map(([,args]) => args)).toEqual(["api","processing","api"].map(p_bucket => ({ p_bucket, p_subject: digest })));
    expect(mocks.members).not.toHaveBeenCalled();
  });
  it("meters anonymous review and intake before reading the body", async () => {
    vi.stubEnv("VERCEL","1");
    mocks.auth.mockResolvedValue({ userId: null });
    mocks.rpc.mockResolvedValue({ data: 10 });
    for (const [resource, action] of [["review","read"],["intake","submit"]]) {
      const result = await post([resource,action], { "x-vercel-forwarded-for":"192.0.2.1", "x-forwarded-for":resource });
      expect(result.status).toBe(429);
    }
    const args = mocks.rpc.mock.calls[0][1];
    expect(args.p_bucket).toBe("visitor");
    expect(args.p_subject).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.rpc.mock.calls[1][1]).toEqual(args);
  });
  it("fails closed when the counter is unavailable", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message:"internal detail" } });
    const res = await post(["clients"]);
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("internal detail");
    expect(mocks.members).not.toHaveBeenCalled();
  });
});
