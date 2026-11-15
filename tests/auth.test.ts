import { describe, it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  members: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: async () => ({
    organizations: { getOrganizationMembershipList: mocks.members },
  }),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
import { checked, context } from "../src/lib/server";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public");
  mocks.auth.mockResolvedValue({
    userId: "user_a",
    orgId: "org_a",
    getToken: vi.fn(),
  });
  mocks.members.mockResolvedValue({
    data: [{ role: "org:member", publicUserData: { userId: "user_a" } }],
  });
  mocks.createClient.mockReturnValue({});
});
describe("agency access", () => {
  it("explains a missing Clerk trust configuration without bypassing RLS", () => {
    expect(() =>
      checked({
        data: null,
        error: { message: "No suitable key or wrong key type" },
      }),
    ).toThrow("Third-party auth");
    try {
      checked({
        data: null,
        error: { message: "No suitable key or wrong key type" },
      });
    } catch (error) {
      expect(error).toMatchObject({ status: 503 });
    }
  });
  it("preserves other database failures", () => {
    expect(() =>
      checked({ data: null, error: { message: "Connection unavailable" } }),
    ).toThrow("Connection unavailable");
  });
  it("rejects logged-out users", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(context()).rejects.toMatchObject({ status: 401 });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("requires an active agency", async () => {
    mocks.auth.mockResolvedValue({ userId: "u", orgId: null });
    await expect(context()).rejects.toMatchObject({ status: 403 });
  });
  it("checks current membership rather than a stale session role", async () => {
    mocks.members.mockResolvedValue({ data: [] });
    await expect(context()).rejects.toMatchObject({ status: 403 });
  });
  it("allows members to access the agency but denies admin actions", async () => {
    await expect(context()).resolves.toMatchObject({
      orgId: "org_a",
      isAdmin: false,
    });
    await expect(context(true)).rejects.toMatchObject({ status: 403 });
  });
  it("allows an actual organization admin", async () => {
    mocks.members.mockResolvedValue({
      data: [{ role: "org:admin", publicUserData: { userId: "user_a" } }],
    });
    await expect(context(true)).resolves.toMatchObject({ isAdmin: true });
  });
});
