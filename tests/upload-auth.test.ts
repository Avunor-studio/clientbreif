import { describe, it, expect, vi } from "vitest";
import { tusAuthorization } from "../src/lib/upload-auth";
describe("resumable upload authorization", () => {
  it("sends one bearer token through XHR append semantics", async () => {
    const options = tusAuthorization(async () => "test.jwt.token");
    const headers = new Headers();
    await options.onBeforeRequest({
      setHeader: (key, value) => headers.append(key, value),
    });
    expect(headers.get("Authorization")).toBe("Bearer test.jwt.token");
    expect(headers.get("Authorization")).not.toContain(",");
    expect(options).not.toHaveProperty("headers");
  });
  it("refreshes the token for each retry or chunk", async () => {
    const getToken = vi
      .fn()
      .mockResolvedValueOnce("first.jwt.token")
      .mockResolvedValueOnce("fresh.jwt.token");
    const options = tusAuthorization(getToken);
    const first = vi.fn(),
      second = vi.fn();
    await options.onBeforeRequest({ setHeader: first });
    await options.onBeforeRequest({ setHeader: second });
    expect(first).toHaveBeenCalledExactlyOnceWith(
      "Authorization",
      "Bearer first.jwt.token",
    );
    expect(second).toHaveBeenCalledExactlyOnceWith(
      "Authorization",
      "Bearer fresh.jwt.token",
    );
  });
  it("does not send an unauthenticated chunk after session expiry", async () => {
    const write = vi.fn();
    await expect(
      tusAuthorization(async () => null).onBeforeRequest({ setHeader: write }),
    ).rejects.toThrow("expired");
    expect(write).not.toHaveBeenCalled();
  });
});
