
import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";

type WorkspaceHeaders = Headers;

type EnsureDefaultWorkspaceParams = {
  headers: WorkspaceHeaders;
  userId: string;
  activeOrganizationId?: string | null;
};

// Convert a workspace name into a URL-friendly slug.
function createWorkspaceSlug(name: string): string {
  const baseSlug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

  const uniqueSuffix = randomBytes(6).toString("hex");

  return `${baseSlug || "workspace"}-${uniqueSuffix}`;
}

// Find or create the user's personal workspace.
export async function ensureDefaultWorkspace({
  headers,
  userId,
  activeOrganizationId,
}: EnsureDefaultWorkspaceParams) {
  const suffix = createHash("sha256")
    .update(userId)
    .digest("hex")
    .slice(0, 24);

  const slug = `personal-${suffix}`;

  const findPersonalWorkspace = async () => {
    const organizations = await auth.api.listOrganizations({
      headers,
    });

    return (
      organizations.find((organization) => {
        const metadata = organization.metadata as
          | Record<string, unknown>
          | null
          | undefined;

        return (
          organization.slug === slug ||
          metadata?.mailopsPersonalWorkspaceOwnerId === userId
        );
      }) ?? null
    );
  };

  let workspace = await findPersonalWorkspace();

  if (!workspace) {
    try {
      workspace = await auth.api.createOrganization({
        body: {
          name: "My Workspace",
          slug,
          metadata: {
            mailopsWorkspaceType: "personal",
            mailopsPersonalWorkspaceOwnerId: userId,
          },
          keepCurrentActiveOrganization: false,
        },
        headers,
      });
    } catch (error) {
      // Another request may have created it simultaneously.
      workspace = await findPersonalWorkspace();

      if (!workspace) {
        throw error;
      }
    }
  }

  const organizations = await auth.api.listOrganizations({
    headers,
  });

  const hasValidActiveWorkspace = organizations.some(
    (organization) => organization.id === activeOrganizationId
  );

  if (!hasValidActiveWorkspace) {
    await auth.api.setActiveOrganization({
      body: {
        organizationId: workspace.id,
      },
      headers,
    });
  }

  return workspace;
}

// List every workspace the authenticated user belongs to.
export async function listWorkspaces(headers: WorkspaceHeaders) {
  return auth.api.listOrganizations({
    headers,
  });
}

// Create another workspace for the authenticated user.
export async function createWorkspace(
  headers: WorkspaceHeaders,
  name: string
) {
  const slug = createWorkspaceSlug(name);

  return auth.api.createOrganization({
    body: {
      name,
      slug,
      metadata: {
        mailopsWorkspaceType: "standard",
      },
      keepCurrentActiveOrganization: false,
    },
    headers,
  });
}

// Switch the user's active workspace.
export async function switchWorkspace(
  headers: WorkspaceHeaders,
  organizationId: string
): Promise<boolean> {
  const organizations = await listWorkspaces(headers);

  const isMember = organizations.some(
    (organization) => organization.id === organizationId
  );

  if (!isMember) {
    return false;
  }

  await auth.api.setActiveOrganization({
    body: {
      organizationId,
    },
    headers,
  });

  return true;
}
