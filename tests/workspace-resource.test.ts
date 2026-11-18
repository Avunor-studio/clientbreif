import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/lib/browser-api";
import { WorkspaceResource } from "../src/lib/workspace-resource";

const agencyA = { userId: "user_a", sessionId: "session_a", orgId: "org_a" };
const agencyB = { ...agencyA, orgId: "org_b" };
type Data = { orgId: string; value: string };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("persistent workspace data", () => {
  it("keeps the loaded workspace visible while navigation/focus refresh is pending", async () => {
    const next = deferred<Data>();
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ orgId: "org_a", value: "saved" })
      .mockReturnValueOnce(next.promise);
    const resource = new WorkspaceResource<Data>(loader);
    resource.setScope(agencyA);
    await resource.refresh();
    const refresh = resource.refresh();
    expect(resource.getSnapshot().data?.value).toBe("saved");
    next.resolve({ orgId: "org_a", value: "updated" });
    await refresh;
    expect(resource.getSnapshot().data?.value).toBe("updated");
  });

  it("deduplicates concurrent refreshes in the same authenticated agency", async () => {
    const pending = deferred<Data>();
    const loader = vi.fn(() => pending.promise);
    const resource = new WorkspaceResource(loader);
    resource.setScope(agencyA);
    const first = resource.refresh();
    const second = resource.refresh();
    expect(first).toBe(second);
    pending.resolve({ orgId: "org_a", value: "one response" });
    await Promise.all([first, second]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("fetches after a mutation instead of reusing pre-write data from an in-flight request", async () => {
    const old = deferred<Data>();
    const resource = new WorkspaceResource<Data>(
      vi
        .fn()
        .mockResolvedValueOnce({ orgId: "org_a", value: "saved" })
        .mockReturnValueOnce(old.promise)
        .mockResolvedValueOnce({ orgId: "org_a", value: "new project" }),
    );
    resource.setScope(agencyA);
    await resource.refresh();
    const navigationRefresh = resource.refresh();
    await Promise.resolve();
    await resource.refresh({ force: true });
    old.resolve({ orgId: "org_a", value: "pre-write" });
    await navigationRefresh;
    expect(resource.getSnapshot().data?.value).toBe("new project");
  });

  it("clears data on an agency change and ignores the previous agency's late response", async () => {
    const old = deferred<Data>();
    const resource = new WorkspaceResource<Data>(
      vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockResolvedValueOnce({ orgId: "org_b", value: "new agency" }),
    );
    resource.setScope(agencyA);
    const oldRefresh = resource.refresh();
    await Promise.resolve();
    resource.setScope(agencyB);
    expect(resource.getSnapshot().data).toBeNull();
    await resource.refresh();
    old.resolve({ orgId: "org_a", value: "private old data" });
    await oldRefresh;
    expect(resource.getSnapshot().data).toEqual({
      orgId: "org_b",
      value: "new agency",
    });
  });

  it("does not let an old request failure overwrite the new agency", async () => {
    const old = deferred<Data>();
    const resource = new WorkspaceResource<Data>(
      vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockResolvedValueOnce({ orgId: "org_b", value: "current" }),
    );
    resource.setScope(agencyA);
    const oldRefresh = resource.refresh();
    await Promise.resolve();
    resource.setScope(agencyB);
    await resource.refresh();
    old.reject(new Error("Old failure"));
    await oldRefresh;
    expect(resource.getSnapshot()).toMatchObject({
      data: { orgId: "org_b", value: "current" },
      error: "",
    });
  });

  it.each([
    { ...agencyA, userId: "different_user" },
    { ...agencyA, sessionId: "different_session" },
    null,
  ])(
    "clears the snapshot when account/session changes or signs out: %s",
    async (scope) => {
      const resource = new WorkspaceResource<Data>(async () => ({
        orgId: "org_a",
        value: "private",
      }));
      resource.setScope(agencyA);
      await resource.refresh();
      resource.setScope(scope);
      expect(resource.getSnapshot().data).toBeNull();
    },
  );

  it("rejects a response belonging to a different agency", async () => {
    const resource = new WorkspaceResource<Data>(async () => ({
      orgId: "org_b",
      value: "wrong agency",
    }));
    resource.setScope(agencyA);
    await resource.refresh();
    expect(resource.getSnapshot().data).toBeNull();
    expect(resource.getSnapshot().error).toContain("agency changed");
  });

  it("preserves data after a temporary failure and updates it on retry", async () => {
    const resource = new WorkspaceResource<Data>(
      vi
        .fn()
        .mockResolvedValueOnce({ orgId: "org_a", value: "saved" })
        .mockRejectedValueOnce(new Error("Offline"))
        .mockResolvedValueOnce({ orgId: "org_a", value: "fresh" }),
    );
    resource.setScope(agencyA);
    await resource.refresh();
    await resource.refresh();
    expect(resource.getSnapshot()).toMatchObject({
      data: { value: "saved" },
      error: "Offline",
    });
    await resource.refresh();
    expect(resource.getSnapshot()).toMatchObject({
      data: { value: "fresh" },
      error: "",
    });
  });

  it.each([401, 403])(
    "clears stale private data after access is denied (%s)",
    async (status) => {
      const resource = new WorkspaceResource<Data>(
        vi
          .fn()
          .mockResolvedValueOnce({ orgId: "org_a", value: "private" })
          .mockRejectedValueOnce(new ApiError("Access denied", status)),
      );
      resource.setScope(agencyA);
      await resource.refresh();
      await resource.refresh();
      expect(resource.getSnapshot()).toMatchObject({
        data: null,
        error: "Access denied",
      });
    },
  );
});
