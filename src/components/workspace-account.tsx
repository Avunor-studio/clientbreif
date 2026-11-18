"use client";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export default function WorkspaceAccount() {
  return (
    <div className="row">
      <OrganizationSwitcher
        hidePersonal
        afterSelectOrganizationUrl="/app"
        afterCreateOrganizationUrl="/app"
      />
      <UserButton />
    </div>
  );
}
