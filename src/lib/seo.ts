import type { Metadata } from "next";

export const publicPaths = ["/", "/how-it-works", "/for-agencies", "/pricing"] as const;
const workspaceImage = "/images/clientbrief-meeting-workspace.jpg";
export const privatePaths = [
  "/app",
  "/api",
  "/review",
  "/intake",
  "/onboarding",
  "/sign-in",
  "/sign-up",
];

export function getSiteConfig(
  env: Record<string, string | undefined> = process.env,
) {
  let origin: string | undefined;
  if (env.SITE_URL) {
    try {
      const url = new URL(env.SITE_URL);
      if (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash
      )
        origin = url.origin;
    } catch {
      /* An unconfigured preview remains usable and unindexable. */
    }
  }
  const production =
    env.NODE_ENV === "production" &&
    (!env.VERCEL_ENV || env.VERCEL_ENV === "production");
  const requested = env.SITE_INDEXABLE === "true";
  if (production && requested && !origin)
    throw new Error(
      "SITE_INDEXABLE=true requires SITE_URL to be an HTTPS production origin without a path, query, or fragment.",
    );
  return { origin, indexable: production && requested && Boolean(origin) };
}

export const privateMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export function publicMetadata(
  title: string,
  description: string,
  path: string,
  keywords: readonly string[] = [],
): Metadata {
  const { origin, indexable } = getSiteConfig();
  return {
    title: { absolute: title },
    description,
    ...(keywords.length ? { keywords: [...keywords] } : {}),
    ...(origin
      ? { alternates: { canonical: new URL(path, origin).href } }
      : {}),
    robots: { index: indexable, follow: indexable },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "ClientBrief",
      locale: "en_US",
      ...(origin ? { url: new URL(path, origin).href } : {}),
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "ClientBrief — Turn client meetings into project briefs",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export function publicPageSchema(
  path: string,
  title: string,
  description: string,
) {
  const { origin } = getSiteConfig();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "ClientBrief",
        inLanguage: "en",
        ...(origin ? { "@id": `${origin}/#website`, url: origin } : {}),
      },
      {
        "@type": "WebPage",
        name: title,
        description,
        inLanguage: "en",
        ...(origin
          ? {
              url: new URL(path, origin).href,
              isPartOf: { "@id": `${origin}/#website` },
            }
          : {}),
      },
      ...(path === "/"
        ? [
            {
              "@type": "WebApplication",
              name: "ClientBrief",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description,
              screenshot: origin
                ? new URL(workspaceImage, origin).href
                : workspaceImage,
              featureList: [
                "English meeting transcription with speakers and timestamps",
                "Editable project briefs, decisions, action items, and follow-up drafts",
                "Version-specific client approvals and change requests",
              ],
              ...(origin ? { "@id": `${origin}/#app`, url: origin } : {}),
            },
          ]
        : []),
    ],
  };
}
