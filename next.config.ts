import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";
import { getSiteConfig, privatePaths } from "./src/lib/seo";
const config: NextConfig = {
  poweredByHeader: false,
  experimental: { cpus: 2, turbopackFileSystemCacheForDev: false },
  serverExternalPackages: ["@supabase/supabase-js"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      ...(getSiteConfig().indexable
        ? privatePaths.map((path) => ({
            source: `${path}/:path*`,
            headers: [
              { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
            ],
          }))
        : [
            {
              source: "/:path*",
              headers: [
                { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
              ],
            },
          ]),
    ];
  },
};
export default withWorkflow(config);
