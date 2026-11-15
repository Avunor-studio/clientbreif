import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { missingConfig } from "@/lib/config";
import { Setup } from "@/components/setup";
import { Workspace } from "@/components/workspace";
export default async function AppPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const missing = missingConfig(false);
  if (missing.length) return <Setup missing={missing} />;
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding");
  return <Workspace path={(await params).path ?? []} />;
}
