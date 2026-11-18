import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { missingConfig } from "@/lib/config";
import { Setup } from "@/components/setup";
import { Workspace } from "@/components/workspace";
export const metadata: Metadata = privateMetadata;
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const missing = missingConfig(false);
  if (missing.length) return <Setup missing={missing} />;
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding");
  return <Workspace>{children}</Workspace>;
}
