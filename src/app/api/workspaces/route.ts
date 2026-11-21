
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  createWorkspace,
  listWorkspaces,
} from "@/services/workspace.service";

export const runtime = "nodejs";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(60),
});

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizations = await listWorkspaces(request.headers);

    const workspaces = organizations.map(
      ({ id, name, slug, createdAt }) => ({
        id,
        name,
        slug,
        createdAt,
      })
    );

    return NextResponse.json({
      success: true,
      workspaces,
    });
  } catch (error) {
    console.error("[Workspace API] List failed:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch workspaces." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const parsed = createWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid workspace name.",
          errors: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const workspace = await createWorkspace(
      request.headers,
      parsed.data.name
    );

    return NextResponse.json(
      {
        success: true,
        message: "Workspace created successfully.",
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Workspace API] Creation failed:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create workspace." },
      { status: 500 }
    );
  }
}
