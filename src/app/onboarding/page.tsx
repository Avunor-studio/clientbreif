import { OrganizationList } from "@clerk/nextjs";
import { Brand } from "@/components/brand";
import { Setup } from "@/components/setup";
export default function Onboarding() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    return (
      <Setup
        missing={["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]}
      />
    );
  return (
    <main className="auth-page">
      <Brand />
      <h1>Your agency, together.</h1>
      <p className="muted">
        Create or choose a workspace to keep client projects in one place.
      </p>
      <OrganizationList
        hidePersonal
        afterCreateOrganizationUrl="/app"
        afterSelectOrganizationUrl="/app"
      />
    </main>
  );
}
