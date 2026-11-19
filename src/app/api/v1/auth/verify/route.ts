
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/request-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const application = await authenticateRequest(request);

    if (!application) {
      return NextResponse.json(
        {
          success: false,
          status: "unauthorized",
          message: "Missing or invalid API key.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: "authenticated",
        application,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API authentication error:", error);

    return NextResponse.json(
      {
        success: false,
        status: "error",
        message: "Unable to verify API key.",
      },
      { status: 503 }
    );
  }
}