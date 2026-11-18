import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ admin: { from: vi.fn(), rpc: vi.fn() }, scoped: { from: vi.fn() }, start: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/admin-db", () => ({ adminDb: () => mocks.admin }));
vi.mock("workflow/api", () => ({ start: mocks.start }));
vi.mock("../src/workflows/project", () => ({ generateProject: vi.fn() }));
import { publicIntake, projectFeature } from "../src/lib/project-api";
import type { context } from "../src/lib/server";
const id = "11111111-1111-4111-8111-111111111111";
const token = "a".repeat(64);
function queued(...values: unknown[]) {
  return () => {
    const q: Record<string, unknown> = {};
    for (const name of ["select", "eq", "is", "in", "order", "insert", "update"]) q[name] = () => q;
    q.single = q.maybeSingle = () => Promise.resolve({ data: values.shift(), error: null });
    q.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: values.shift(), error: null }).then(resolve);
    return q;
  };
}
const req = (body: unknown, method = "POST") => new NextRequest("http://localhost:3000/api/intake/read", { method, body: JSON.stringify(body) });
const ctx = () => ({ db: mocks.scoped, orgId: "org_a", userId: "user_a", isAdmin: false }) as unknown as Awaited<ReturnType<typeof context>>;
beforeEach(() => { vi.clearAllMocks(); mocks.scoped.from.mockImplementation(queued({ id })); });
describe("public intake boundary", () => {
  it("returns form metadata only, never previous answers or email", async () => {
    mocks.admin.from.mockImplementation(queued({ id, project_id: id, expires_at: "2099-01-01", revoked_at: null }, { name: "Example" }, { id }));
    const result = await publicIntake(req({ token }), "read");
    expect(result).toEqual({ projectName: "Example", expiresAt: "2099-01-01", submitted: true });
  });
  it.each([{ expires_at: "2000-01-01", revoked_at: null }, { expires_at: "2099-01-01", revoked_at: "2026-01-01" }, null])("rejects expired/revoked/missing links", async (value) => {
    mocks.admin.from.mockImplementation(queued(value && { id, project_id: id, ...value }));
    await expect(publicIntake(req({ token }), "read")).rejects.toMatchObject({ status: 410 });
    expect(mocks.admin.rpc).not.toHaveBeenCalled();
  });
  it("validates a token before querying storage", async () => {
    await expect(publicIntake(req({ token: "invalid" }), "read")).rejects.toThrow();
    expect(mocks.admin.from).not.toHaveBeenCalled();
  });
});
describe("project authorization", () => {
  it("rejects another organization's project before privileged work", async () => {
    mocks.scoped.from.mockImplementation(queued(null));
    await expect(projectFeature(req({}), ["projects", id, "intake-links"], ctx())).rejects.toMatchObject({ status: 404 });
    expect(mocks.admin.from).not.toHaveBeenCalled();
  });
  it("members cannot create public form links", async () => {
    await expect(projectFeature(req({}), ["projects", id, "intake-links"], ctx())).rejects.toMatchObject({ status: 403 });
    expect(mocks.admin.from).not.toHaveBeenCalled();
  });
  it("members cannot revoke public form links", async () => {
    await expect(projectFeature(req({}, "DELETE"), ["projects", id, "intake-links", id], ctx())).rejects.toMatchObject({ status: 403 });
  });
  it("admin-created links store only a hash and use the application's origin", async () => {
    vi.stubEnv("APP_URL", "http://localhost:3000");
    const insert = vi.fn(); const builder = { insert, select: () => builder, single: async () => ({ data: { id, expires_at: "2099-01-01" }, error: null }) }; insert.mockReturnValue(builder); mocks.admin.from.mockReturnValue(builder);
    const result = await projectFeature(req({}), ["projects", id, "intake-links"], { ...ctx(), isAdmin: true }) as { url: string };
    const stored = insert.mock.calls[0][0];
    expect(stored.organization_id).toBe("org_a"); expect(stored.token_hash).toMatch(/^[a-f0-9]{64}$/); expect(stored).not.toHaveProperty("token");
    expect(result.url).toMatch(/^http:\/\/localhost:3000\/intake#token=[a-f0-9]{64}$/); expect(result.url).not.toContain(stored.token_hash);
  });
});
