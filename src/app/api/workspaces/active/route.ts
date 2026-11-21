
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { switchWorkspace } from "@/services/workspace.service";

export const runtime = "nodejs";

const switchWorkspaceSchema = z.object({
  organizationId: z.string().min(1),
});

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

    const parsed = switchWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid workspace ID." },
        { status: 400 }
      );
    }

    const switched = await switchWorkspace(
      request.headers,
      parsed.data.organizationId
    );

    if (!switched) {
      return NextResponse.json(
        {
          success: false,
          message: "Workspace not found or access denied.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Active workspace updated.",
    });
  } catch (error) {
    console.error("[Workspace API] Switching failed:", error);

    return NextResponse.json(
      { success: false, message: "Failed to switch workspace." },
      { status: 500 }
    );
  }
}
