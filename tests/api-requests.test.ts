import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  destination: vi.fn(),
  scopedMeeting: vi.fn(),
  update: vi.fn(),
  rpc: vi.fn(),
  start: vi.fn(),
}));
vi.mock("../src/lib/server", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/lib/server")>(),
  context: mocks.context,
  scopedMeeting: mocks.scopedMeeting,
}));
vi.mock("../src/lib/revenuecat", () => ({ billingDestination: mocks.destination, requireRecordingAccess: vi.fn() }));
vi.mock("../src/lib/admin-db", () => ({
  adminDb: () => ({ from: () => ({ update: mocks.update }), rpc: mocks.rpc }),
}));
vi.mock("../src/lib/config", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/lib/config")>(),
  missingConfig: () => [],
}));
vi.mock("../src/workflows/meeting", () => ({
  transcribeMeeting: vi.fn(),
  generateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
}));
vi.mock("../src/workflows/project", () => ({ generateProject: vi.fn() }));
vi.mock("workflow/api", () => ({ start: mocks.start }));

import { DELETE, POST } from "../src/app/api/[...path]/route";
import { MAX_JSON_BODY_BYTES, readJsonObject } from "../src/lib/server";

const id = "b1000000-0000-4000-8000-000000000001";
const orgId = "org_example";
const url = "https://example.test/api/";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.context.mockResolvedValue({ db: {}, orgId, isAdmin: true });
  mocks.scopedMeeting.mockResolvedValue({ id });
  mocks.rpc.mockResolvedValue({ data: null, error: null });
});

describe("RevenueCat checkout", () => {
  const path = ["billing", "checkout"];
  const checkout = () => POST(new NextRequest(url + path.join("/"), { method: "POST" }), {
    params: Promise.resolve({ path }),
  });

  it("opens checkout for the authenticated workspace", async () => {
    expect((await checkout()).status).toBe(200);
    expect(mocks.destination).toHaveBeenCalledWith(orgId);
  });

  it("denies requests from a member before writing anything", async () => {
    mocks.context.mockResolvedValue({ db: {}, orgId, isAdmin: false });
    expect((await checkout()).status).toBe(403);
    expect(mocks.destination).not.toHaveBeenCalled();
  });
});

describe("JSON requests", () => {
  it.each(["{", "null", "[]"])("returns 400 for an invalid JSON object body %s", async (body) => {
    const response = await POST(new NextRequest(url + "clients", { method: "POST", body }), {
      params: Promise.resolve({ path: ["clients"] }),
    });
    expect(response.status).toBe(400);
  });

  it("enforces the configured byte limit on a stream without Content-Length", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_JSON_BODY_BYTES));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    });
    const request = new Request(url + "clients", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    expect(request.headers.has("content-length")).toBe(false);
    await expect(readJsonObject(request)).rejects.toMatchObject({ status: 413 });
  });
});

describe("meeting cleanup routes", () => {
  it.each([
    { tail: [], full: true },
    { tail: ["recording"], full: false },
  ])("starts only the requested deletion", async ({ tail, full }) => {
    const path = ["meetings", id, ...tail];
    const response = await DELETE(new NextRequest(url + path.join("/"), { method: "DELETE" }), {
      params: Promise.resolve({ path }),
    });
    expect(response.status).toBe(202);
    expect(mocks.rpc).toHaveBeenCalledWith("begin_cleanup", { p_org: orgId, p_meeting: id, p_full: full });
    expect(mocks.start).toHaveBeenCalledOnce();
  });

  it("returns 404 for an unknown deletion route", async () => {
    const path = ["meetings", id, "unknown"];
    const response = await DELETE(new NextRequest(url + path.join("/"), { method: "DELETE" }), {
      params: Promise.resolve({ path }),
    });
    expect(response.status).toBe(404);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it.each([{ match: null, status: 409 }, { match: { id }, status: 202 }])(
    "retries only unfinished cleanup without changing the deletion kind",
    async ({ match, status }) => {
      const query = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: match, error: null }),
      };
      mocks.update.mockReturnValue(query);
      const path = ["meetings", id, "cleanup"];
      const response = await POST(new NextRequest(url + path.join("/"), { method: "POST" }), {
        params: Promise.resolve({ path }),
      });
      expect(response.status).toBe(status);
      expect(query.eq.mock.calls).toEqual([["id", id], ["organization_id", orgId]]);
      expect(query.in).toHaveBeenCalledWith("cleanup_status", ["pending", "failed"]);
      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(mocks.start).toHaveBeenCalledTimes(match ? 1 : 0);
    },
  );
});
