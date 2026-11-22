import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteConfig, publicMetadata, publicPageSchema, publicPaths } from "../src/lib/seo";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";

afterEach(() => vi.unstubAllEnvs());

describe("public-site indexing boundary", () => {
  it("keeps an unconfigured deployment out of search", () => {
    expect(getSiteConfig({ NODE_ENV: "production" }).indexable).toBe(false);
  });
  it("requires an explicit opt-in on a valid production origin", () => {
    expect(
      getSiteConfig({
        NODE_ENV: "production",
        SITE_URL: "https://clientbrief.example/",
        SITE_INDEXABLE: "true",
      }),
    ).toEqual({ origin: "https://clientbrief.example", indexable: true });
  });
  it("never opts a preview or local development server into indexing", () => {
    const site = {
      SITE_URL: "https://clientbrief.example",
      SITE_INDEXABLE: "true",
    };
    expect(
      getSiteConfig({ ...site, NODE_ENV: "production", VERCEL_ENV: "preview" })
        .indexable,
    ).toBe(false);
    expect(getSiteConfig({ ...site, NODE_ENV: "development" }).indexable).toBe(
      false,
    );
  });
  it.each([
    "http://example.com",
    "https://example.com/app",
    "https://example.com?token=private",
    "https://user:secret@example.com",
    "https://localhost",
    "invalid",
  ])("rejects an unsuitable production canonical: %s", (SITE_URL) => {
    expect(() =>
      getSiteConfig({
        NODE_ENV: "production",
        SITE_INDEXABLE: "true",
        SITE_URL,
      }),
    ).toThrow("HTTPS production origin");
  });
  it("only publishes the three marketing URLs in a production sitemap", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("SITE_URL", "https://clientbrief.example/");
    vi.stubEnv("SITE_INDEXABLE", "true");
    expect(sitemap().map((entry) => entry.url)).toEqual(
      publicPaths.map((path) => `https://clientbrief.example${path}`),
    );
    expect(robots().sitemap).toBe("https://clientbrief.example/sitemap.xml");
    expect(robots().rules).toMatchObject({
      disallow: expect.arrayContaining(["/app", "/review", "/api"]),
    });
  });
  it("does not advertise a sitemap or canonical while unconfigured", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("SITE_INDEXABLE", "false");
    expect(sitemap()).toEqual([]);
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(
      publicMetadata("Example", "Description", "/").alternates,
    ).toBeUndefined();
  });
  it("describes the public product with its canonical URL, keywords and real screenshot", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("SITE_URL", "https://clientbrief.example");
    vi.stubEnv("SITE_INDEXABLE", "true");
    const title = "ClientBrief";
    const description = "Meeting recordings to editable project briefs.";
    expect(publicMetadata(title, description, "/", ["meeting transcription"])).toMatchObject({
      alternates: { canonical: "https://clientbrief.example/" },
      keywords: ["meeting transcription"],
      robots: { index: true, follow: true },
    });
    expect(publicPageSchema("/", title, description)["@graph"]).toEqual(expect.arrayContaining([
      expect.objectContaining({
        "@type": "WebApplication",
        screenshot: "https://clientbrief.example/images/clientbrief-meeting-workspace.jpg",
      }),
    ]));
  });
});
