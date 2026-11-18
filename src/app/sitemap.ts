import type { MetadataRoute } from "next";
import { getSiteConfig, publicPaths } from "@/lib/seo";
export default function sitemap(): MetadataRoute.Sitemap {
  const { origin, indexable } = getSiteConfig();
  return indexable && origin
    ? publicPaths.map((path) => ({ url: new URL(path, origin).href }))
    : [];
}
