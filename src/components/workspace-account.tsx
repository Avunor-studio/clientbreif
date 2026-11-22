"use client";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export default function WorkspaceAccount() {
  return (
    <div className="row">
      <OrganizationSwitcher
        hidePersonal
        appearance={{
          elements: {
            organizationSwitcherTrigger: "workspace-org-switcher",
            organizationPreviewMainIdentifier: "workspace-org-name",
          },
        }}
        afterSelectOrganizationUrl="/app"
        afterCreateOrganizationUrl="/app"
      />
      <UserButton />
    </div>
  );
}
