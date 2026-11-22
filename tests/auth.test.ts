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
import { checked, context, scopedMeeting } from "../src/lib/server";
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
  it("denies an unrecognized workspace role before creating a database client", async () => {
    mocks.members.mockResolvedValue({
      data: [{ role: "org:guest", publicUserData: { userId: "user_a" } }],
    });
    await expect(context()).rejects.toMatchObject({ status: 403 });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("denies a member access to the admin cleanup lookup", async () => {
    const ctx = await context();
    mocks.createClient.mockClear();
    await expect(scopedMeeting(ctx, "meeting_a", true)).rejects.toMatchObject({ status: 403 });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("scopes admin cleanup retries to the verified organization and meeting", async () => {
    mocks.members.mockResolvedValue({
      data: [{ role: "org:admin", publicUserData: { userId: "user_a" } }],
    });
    const ctx = await context();
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-server");
    const query = {
      from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mocks.createClient.mockReturnValue(query);
    await expect(scopedMeeting(ctx, "meeting_a", true)).rejects.toMatchObject({ status: 404 });
    expect(query.eq.mock.calls).toEqual([["id", "meeting_a"], ["organization_id", "org_a"]]);
  });
});
