
import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/request-auth";
import { emailRequestSchema } from "@/schemas/email.schema";
import {
  createEmailRecord,
  EmailQueueError,
} from "@/services/email.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Authenticate the requesting application.
    const application = await authenticateRequest(request);

    if (!application) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing or invalid API key.",
        },
        { status: 401 }
      );
    }

    // 2. Parse incoming JSON.
    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    // 3. Validate request using Zod.
    const validation = emailRequestSchema.safeParse(requestBody);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email request.",
          errors: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    // 4. Save the email and enqueue its job.
    const email = await createEmailRecord(
      validation.data,
      application
    );

    // 5. Confirm that Mailops accepted the email for processing.
    return NextResponse.json(
      {
        success: true,
        message: "Email accepted for processing.",
        email,
      },
      {
        status: 202,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    // Handle Redis / BullMQ enqueue failures separately.
    if (error instanceof EmailQueueError) {
      return NextResponse.json(
        {
          success: false,
          message: "Email was saved but could not be queued.",
          emailId: error.emailId,
        },
        { status: 503 }
      );
    }

    console.error("[Mailops] Email submission failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process email request.",
      },
      { status: 500 }
    );
  }
}