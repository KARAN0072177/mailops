
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  ensureDefaultWorkspace,
  listWorkspaces,
} from "@/services/workspace.service";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { WorkspaceManager } from "@/components/workspace/workspace-manager";

export default async function DashboardPage() {
  const requestHeaders = await headers();

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    redirect("/sign-in");
  }

  // Make sure every user has a personal workspace.
  const defaultWorkspace = await ensureDefaultWorkspace({
    headers: requestHeaders,
    userId: session.user.id,
    activeOrganizationId: session.session.activeOrganizationId,
  });

  // Fetch the workspaces after provisioning.
  const organizations = await listWorkspaces(requestHeaders);

  // Read the latest active organization from the session.
  const refreshedSession = await auth.api.getSession({
    headers: requestHeaders,
  });

  const activeCandidate =
    refreshedSession?.session.activeOrganizationId ??
    session.session.activeOrganizationId;

  const activeWorkspaceId = organizations.some(
    (organization) => organization.id === activeCandidate
  )
    ? activeCandidate!
    : defaultWorkspace.id;

  const workspaces = organizations.map(
    ({ id, name, slug }) => ({
      id,
      name,
      slug,
    })
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        <div className="rounded-xl border bg-white p-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to Mailops, {session.user.name}
          </h1>

          <p className="mt-2 text-gray-500">
            You are successfully authenticated.
          </p>

          <div className="mt-8 rounded-lg bg-gray-50 p-5">
            <h2 className="font-semibold">Authenticated User</h2>

            <p className="mt-3 text-sm">
              <strong>User ID:</strong> {session.user.id}
            </p>

            <p className="mt-2 text-sm">
              <strong>Email:</strong> {session.user.email}
            </p>
          </div>
        </div>

        <WorkspaceManager
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
        />

        <SignOutButton />
      </div>
    </main>
  );
}