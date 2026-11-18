import type { MetadataRoute } from "next";
import { getSiteConfig, privatePaths } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  const { origin, indexable } = getSiteConfig();
  return {
    rules: {
      userAgent: "*",
      ...(indexable
        ? { allow: "/", disallow: privatePaths }
        : { disallow: "/" }),
    },
    ...(indexable && origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
