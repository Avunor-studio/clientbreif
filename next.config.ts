import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";
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
    ];
  },
};
export default withWorkflow(config);
