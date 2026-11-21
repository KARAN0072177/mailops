
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

type Workspace = {
  id: string;
  name: string;
  slug: string;
};

type WorkspaceManagerProps = {
  workspaces: Workspace[];
  activeWorkspaceId: string;
};

function generateWorkspaceSlug(name: string): string {
  const baseSlug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  return `${baseSlug || "workspace"}-${suffix}`;
}

export function WorkspaceManager({
  workspaces,
  activeWorkspaceId,
}: WorkspaceManagerProps) {
  const router = useRouter();

  const [selectedWorkspaceId, setSelectedWorkspaceId] =
    useState(activeWorkspaceId);

  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSelectedWorkspaceId(activeWorkspaceId);
  }, [activeWorkspaceId]);

  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === activeWorkspaceId
  );

  async function handleSwitchWorkspace(organizationId: string) {
    if (organizationId === activeWorkspaceId) return;

    setLoading(true);
    setMessage("");

    try {
      const result = await authClient.organization.setActive({
        organizationId,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      setSelectedWorkspaceId(organizationId);

      // Refresh server components using the new active workspace.
      router.refresh();
    } catch (error) {
      setSelectedWorkspaceId(activeWorkspaceId);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to switch workspace."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = workspaceName.trim();

    if (name.length < 2 || name.length > 60) {
      setMessage("Workspace name must be between 2 and 60 characters.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await authClient.organization.create({
        name,
        slug: generateWorkspaceSlug(name),
        metadata: {
          mailopsWorkspaceType: "standard",
        },
        keepCurrentActiveOrganization: false,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      setWorkspaceName("");
      setMessage("Workspace created successfully.");

      // A new workspace becomes active automatically.
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to create workspace."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6 rounded-xl border bg-white p-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Workspace Management
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Create and switch between your Mailops workspaces.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="workspace-select"
          className="block text-sm font-medium text-gray-700"
        >
          Active workspace
        </label>

        <select
          id="workspace-select"
          value={selectedWorkspaceId}
          disabled={loading}
          onChange={(event) => {
            void handleSwitchWorkspace(event.target.value);
          }}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 disabled:opacity-60"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>

        {activeWorkspace && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-900">
              {activeWorkspace.name}
            </p>

            <p className="mt-1 text-gray-500">
              Slug: {activeWorkspace.slug}
            </p>
          </div>
        )}
      </div>

      <div className="border-t pt-5">
        <h3 className="font-semibold text-gray-900">
          Create another workspace
        </h3>

        <form onSubmit={handleCreateWorkspace} className="mt-3 space-y-3">
          <input
            type="text"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="e.g. Acme Technologies"
            maxLength={60}
            disabled={loading}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={loading || workspaceName.trim().length < 2}
            className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Please wait..." : "Create Workspace"}
          </button>
        </form>
      </div>

      {message && (
        <p className="text-sm text-gray-600" role="status">
          {message}
        </p>
      )}

      <p className="text-xs text-gray-400">
        You currently have {workspaces.length} workspace(s).
      </p>
    </section>
  );
}